import { ThothEngine, type ThothModelPrediction } from './thothEngine';
import type { PriceBar, PsiSignal, PsiMetrics, PsiBacktestResult } from '../PSI/psiStrategy';
import { getBespokeThothParams } from './thothParameterStore';

export interface ThothStrategyParams {
  ticker?: string;             // Optional ticker symbol for bespoke tuning
  buyThreshold?: number;       // default 35.0% (Pure ML Neural Inception)
  sellThreshold?: number;      // default 85.0% (Pure ML Neural Exhaustion Peak)
  minNetProfit?: number;       // default 0.0% (Strict Never Exit on a Loss discipline)
  requireGreen?: boolean;      // default false (or true per bespoke ticker profile)
  startDate?: string;
  endDate?: string;
  initialCapital?: number;
}

export const DEFAULT_THOTH_PARAMS: Required<Omit<ThothStrategyParams, 'ticker'>> = {
  buyThreshold: 35.0,
  sellThreshold: 85.0,
  minNetProfit: 0.0,
  requireGreen: false,
  startDate: '2025-01-01',
  endDate: '2099-12-31',
  initialCapital: 100000.0,
};

export async function runThothStrategy(
  bars: PriceBar[],
  userParams: ThothStrategyParams = {}
): Promise<PsiBacktestResult> {
  // If ticker is provided, resolve bespoke optimal parameters from store
  const bespoke = userParams.ticker ? getBespokeThothParams(userParams.ticker) : {};
  const cleanUserParams = Object.fromEntries(
    Object.entries(userParams).filter(([_, v]) => v !== undefined && v !== null && (typeof v !== 'number' || !isNaN(v)))
  );

  const params: Required<Omit<ThothStrategyParams, 'ticker'>> = {
    ...DEFAULT_THOTH_PARAMS,
    ...bespoke,
    ...cleanUserParams,
  };

  const engine = ThothEngine.getInstance();
  const sortedBars = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const startIdx = params.startDate ? sortedBars.findIndex(b => b.date >= params.startDate) : 0;
  const warmupStartIndex = Math.max(0, (startIdx >= 0 ? startIdx : 0) - 180);
  const inferenceBars = sortedBars.slice(warmupStartIndex);

  const predictions = await engine.predict(inferenceBars);

  const predMap = new Map<string, ThothModelPrediction>();
  predictions.forEach(p => predMap.set(p.date, p));

  const validBars = sortedBars
    .filter(b => b.date >= params.startDate && (!params.endDate || b.date <= params.endDate));

  if (validBars.length === 0) {
    return {
      signals: [],
      latestMasterIndex: null,
      metrics: {
        sysRoi: 0,
        buyHoldRoi: 0,
        roiMargin: 0,
        trades: 0,
        winRate: 0,
        maxDrawdown: 0,
        maxAdverseExcursion: 0,
        avgAdverseExcursion: 0,
        avgFavorableExcursion: 0,
        annualCagr: 0,
        avgReturnPerTrade: 0,
        avgBarsPerTrade: 0,
        currentBalance: params.initialCapital,
      }
    };
  }

  const signals: PsiSignal[] = [];
  let balance = params.initialCapital;
  let inPos = false;
  let entryBar = -1;
  let entryPrice = 0;
  let entryDate = '';
  let highestPrice = 0;
  let lowestPrice = 0;
  let pendingBuy = false;
  let pendingExit = false;
  let pendingExitReason = '';

  let tradeCount = 0;
  let winCount = 0;
  let accumulatedReturnPct = 0;
  let activeBars = 0;
  let maxDrawdown = 0;
  let peakEquity = params.initialCapital;
  let adverseSum = 0;
  let favorableSum = 0;
  let maxAdverseExcursion = 0;

  const firstClose = validBars[0]?.close ?? 0;
  let lastClose = firstClose;

  for (let i = 0; i < validBars.length; i++) {
    const bar = validBars[i];
    const pred = predMap.get(bar.date);

    // ── CRITICAL: Only act on bars where the ONNX model produced a valid non-null prediction.
    const hasPred = pred !== undefined && pred.predictedExhaustion !== null && pred.predictedExhaustion >= 0;
    const exh = pred?.predictedExhaustion ?? 0.0;
    const direction = pred?.direction ?? 'up';
    const masterIdx = pred?.masterIndex ?? 50.0;
    const isGreen = bar.close >= (bar.open > 0 ? bar.open : bar.close);

    lastClose = bar.close;

    // 1-Bar Lag Execution at OPEN
    if (pendingBuy && !inPos) {
      inPos = true;
      entryBar = i;
      entryDate = bar.date;
      entryPrice = bar.open > 0 ? bar.open : bar.close;
      highestPrice = bar.high;
      lowestPrice = bar.low;
      pendingBuy = false;

      signals.push({
        date: bar.date,
        signal: 'BUY',
        confidence: exh,
        price: entryPrice,
        masterIndex: masterIdx,
        medianDailyMove: null,
        entryReason: `Thoth Macro V2 Entry (${direction.toUpperCase()} Exh: ${exh.toFixed(1)}%)`,
        modelVersion: 'thoth-egx-macro-v2',
      });
    } else if (pendingExit && inPos) {
      const exitPrice = bar.open > 0 ? bar.open : bar.close;
      
      // Exact Real-World EGX Invoice Fee Model (0.25% + 6.00 EGP)
      const buyFee = balance * 0.00125 + 3.00;
      const netInvested = balance - buyFee;
      const shares = netInvested / entryPrice;
      const grossExit = shares * exitPrice;
      const sellFee = grossExit * 0.00125 + 3.00;
      const netExit = grossExit - sellFee;
      const netRoi = ((netExit - balance) / balance) * 100.0;

      // STRICT NO-LOSS DISCIPLINE: Never exit on a loss
      if (params.minNetProfit === null || netRoi >= params.minNetProfit) {
        tradeCount++;
        balance = netExit;
        accumulatedReturnPct += netRoi;
        if (netRoi > 0) winCount++;

        const adverse = ((lowestPrice - entryPrice) / entryPrice) * 100;
        adverseSum += adverse;
        maxAdverseExcursion = Math.min(maxAdverseExcursion, adverse);
        favorableSum += ((highestPrice - entryPrice) / entryPrice) * 100;

        signals.push({
          date: bar.date,
          signal: 'SELL_TP',
          confidence: exh,
          price: exitPrice,
          masterIndex: masterIdx,
          medianDailyMove: null,
          exitReason: pendingExitReason || `Pure ML Take-Profit (${exh.toFixed(1)}% | Net: +${netRoi.toFixed(2)}%)`,
          modelVersion: 'thoth-egx-macro-v2',
        });

        inPos = false;
        pendingExit = false;
        entryPrice = 0;
      } else {
        // Net ROI is negative: Reject exit and hold position until profitable!
        pendingExit = false;
      }
    }

    // Evaluate signals while in position
    if (inPos) {
      activeBars++;
      highestPrice = Math.max(highestPrice, bar.high);
      lowestPrice = Math.min(lowestPrice, bar.low);

      // Only set exit triggers when ONNX has a valid prediction for this bar
      if (hasPred) {
        // Pure ML Neural Exhaustion Exit Conditions:
        // 1. Bull Exhaustion >= sellThreshold (default 85%)
        // 2. Bear Exhaustion <= 10%
        const isBullExhausted = (direction === 'up' && exh >= params.sellThreshold);
        const isBearExhausted = (direction === 'down' && exh <= 10.0);

        if (isBullExhausted || isBearExhausted) {
          pendingExit = true;
          pendingExitReason = isBullExhausted
            ? `Bull Exhaustion Peak (${exh.toFixed(1)}%)`
            : `Bear Exhaustion Bottom (${exh.toFixed(1)}%)`;
        }
      }
    } else if (!pendingBuy && hasPred) {
      // Only trigger entries when ONNX has a valid prediction for this bar
      // Pure ML Neural Exhaustion Entry Conditions:
      // 1. Early Bull (direction == up && exh <= buyThreshold)
      // 2. Oversold Bear Reversal (direction == down && exh >= 75%)
      const earlyBull = (direction === 'up' && exh <= params.buyThreshold);
      const bearReversal = (direction === 'down' && exh >= 75.0);

      if ((earlyBull || bearReversal) && (!params.requireGreen || isGreen)) {
        pendingBuy = true;
      }
    }

    // Mark-to-market daily equity calculation
    let currentDayEquity = balance;
    if (inPos && entryPrice > 0) {
      const buyFee = balance * 0.00125 + 3.0;
      const netInvested = balance - buyFee;
      const shares = Math.floor(netInvested / entryPrice);
      const grossVal = shares * bar.close;
      const sellFee = grossVal * 0.00125 + 3.0;
      currentDayEquity = grossVal - sellFee;
    }

    peakEquity = Math.max(peakEquity, currentDayEquity);
    if (peakEquity > 0) {
      const dd = ((peakEquity - currentDayEquity) / peakEquity) * 100.0;
      maxDrawdown = Math.max(maxDrawdown, dd);
    }
  }

  const finalEquity = inPos && entryPrice > 0
    ? (() => {
        const buyFee = balance * 0.00125 + 3.0;
        const netInvested = balance - buyFee;
        const shares = Math.floor(netInvested / entryPrice);
        const grossVal = shares * lastClose;
        const sellFee = grossVal * 0.00125 + 3.0;
        return grossVal - sellFee;
      })()
    : balance;

  const buyHoldRoi = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100.0 : 0.0;
  const sysRoi = ((finalEquity - params.initialCapital) / params.initialCapital) * 100.0;
  const durationYears = Math.max((Date.parse(validBars[validBars.length - 1].date) - Date.parse(validBars[0].date)) / (1000 * 60 * 60 * 24 * 365.25), 0.08);
  const annualCagr = finalEquity > 0 ? (((finalEquity / params.initialCapital) ** (1 / durationYears)) - 1) * 100.0 : 0.0;

  const openTradeReturnPct = inPos && entryPrice > 0 ? ((lastClose - entryPrice) / entryPrice) * 100 : 0;
  const totalCompletedOrActiveTrades = tradeCount + (inPos ? 1 : 0);
  const totalWinningTrades = winCount + (inPos && openTradeReturnPct > 0 ? 1 : 0);
  const effectiveWinRate = totalCompletedOrActiveTrades > 0 ? (totalWinningTrades / totalCompletedOrActiveTrades) * 100.0 : 0.0;

  const latestPred = predictions[predictions.length - 1];

  return {
    signals,
    latestMasterIndex: latestPred?.masterIndex ?? null,
    metrics: {
      sysRoi,
      buyHoldRoi,
      roiMargin: sysRoi - buyHoldRoi,
      trades: totalCompletedOrActiveTrades,
      winRate: effectiveWinRate,
      maxDrawdown,
      maxAdverseExcursion,
      avgAdverseExcursion: totalCompletedOrActiveTrades > 0 ? adverseSum / totalCompletedOrActiveTrades : 0.0,
      avgFavorableExcursion: totalCompletedOrActiveTrades > 0 ? favorableSum / totalCompletedOrActiveTrades : 0.0,
      annualCagr,
      avgReturnPerTrade: totalCompletedOrActiveTrades > 0 ? (accumulatedReturnPct + (inPos ? openTradeReturnPct : 0)) / totalCompletedOrActiveTrades : 0.0,
      avgBarsPerTrade: totalCompletedOrActiveTrades > 0 ? activeBars / totalCompletedOrActiveTrades : 0.0,
      currentBalance: finalEquity,
    }
  };
}

export async function runFullThothBacktest(
  bars: PriceBar[],
  userParams: ThothStrategyParams = {}
): Promise<import('../registry').FullBacktestReport> {
  const bespoke = userParams.ticker ? getBespokeThothParams(userParams.ticker) : {};
  const cleanUserParams = Object.fromEntries(
    Object.entries(userParams).filter(([_, v]) => v !== undefined && v !== null && (typeof v !== 'number' || !isNaN(v)))
  );

  const params: Required<Omit<ThothStrategyParams, 'ticker'>> = {
    ...DEFAULT_THOTH_PARAMS,
    ...bespoke,
    ...cleanUserParams,
  };

  const initialCapital = params.initialCapital || 100000.0;
  const engine = ThothEngine.getInstance();
  const sortedBars = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const startIdx = params.startDate ? sortedBars.findIndex(b => b.date >= params.startDate) : 0;
  const warmupStartIndex = Math.max(0, (startIdx >= 0 ? startIdx : 0) - 180);
  const inferenceBars = sortedBars.slice(warmupStartIndex);

  const predictions = await engine.predict(inferenceBars);

  const predMap = new Map<string, ThothModelPrediction>();
  predictions.forEach((p) => predMap.set(p.date, p));

  const validBars = sortedBars
    .filter((b) => b.date >= params.startDate && (!params.endDate || b.date <= params.endDate));

  if (validBars.length === 0) {
    return {
      trades: [],
      equityCurve: [],
      signals: [],
      stats: {
        initialCapital,
        finalEquity: initialCapital,
        netProfit: 0,
        netProfitPct: 0,
        buyHoldReturn: 0,
        buyHoldReturnPct: 0,
        alphaMargin: 0,
        maxDrawdown: 0,
        maxDrawdownAmount: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        grossProfit: 0,
        grossLoss: 0,
        avgTradePnl: 0,
        avgTradeReturnPct: 0,
        avgWin: 0,
        avgLoss: 0,
        winLossRatio: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        avgBarsHeld: 0,
        annualCagr: 0,
        sharpeRatio: 0,
        startDate: params.startDate,
        endDate: params.endDate || '',
      },
    };
  }

  const trades: import('../registry').StrategyTrade[] = [];
  const equityCurve: import('../registry').EquityPoint[] = [];
  const signals: PsiSignal[] = [];

  let balance = initialCapital;
  let inPos = false;
  let entryPrice = 0;
  let entryDate = '';
  let highestPrice = 0;
  let lowestPrice = 0;
  let pendingBuy = false;
  let pendingExit = false;
  let pendingExitReason = '';
  let currentBarsHeld = 0;
  let tradeCount = 0;
  let peakEquity = initialCapital;
  let maxDrawdownPct = 0;
  let maxDrawdownAmount = 0;

  const firstClose = validBars[0]?.close ?? 0;

  for (let i = 0; i < validBars.length; i++) {
    const bar = validBars[i];
    const pred = predMap.get(bar.date);
    const hasPred = pred !== undefined && pred.predictedExhaustion !== null && pred.predictedExhaustion >= 0;
    const exh = pred?.predictedExhaustion ?? 0.0;
    const direction = pred?.direction ?? 'up';
    const masterIdx = pred?.masterIndex ?? 50.0;
    const isGreen = bar.close >= (bar.open > 0 ? bar.open : bar.close);

    let tradeClosedThisBar: import('../registry').StrategyTrade | null = null;

    // 1-Bar Lag Execution at OPEN
    if (pendingBuy && !inPos) {
      inPos = true;
      entryDate = bar.date;
      entryPrice = bar.open > 0 ? bar.open : bar.close;
      highestPrice = bar.high;
      lowestPrice = bar.low;
      currentBarsHeld = 0;
      tradeCount += 1;
      pendingBuy = false;

      signals.push({
        date: bar.date,
        signal: 'BUY',
        confidence: exh,
        price: entryPrice,
        masterIndex: masterIdx,
        medianDailyMove: null,
        entryReason: `Thoth Macro V2 Entry (${direction.toUpperCase()} Exh: ${exh.toFixed(1)}%)`,
        modelVersion: 'thoth-egx-macro-v2',
      });
    } else if (pendingExit && inPos) {
      const exitPrice = bar.open > 0 ? bar.open : bar.close;
      const buyFee = balance * 0.00125 + 3.0;
      const netInvested = balance - buyFee;
      const shares = Math.floor(netInvested / entryPrice);
      const grossExit = shares * exitPrice;
      const sellFee = grossExit * 0.00125 + 3.0;
      const netExit = grossExit - sellFee;
      const netRoi = ((netExit - balance) / balance) * 100.0;
      const pnl = netExit - balance;

      if (params.minNetProfit === null || netRoi >= params.minNetProfit || i === validBars.length - 1) {
        const favorableExcursion = ((highestPrice - entryPrice) / entryPrice) * 100;
        const adverseExcursion = ((lowestPrice - entryPrice) / entryPrice) * 100;

        balance = netExit;

        tradeClosedThisBar = {
          id: tradeCount,
          tradeNumber: tradeCount,
          type: 'long',
          entryDate,
          entryPrice,
          exitDate: bar.date,
          exitPrice,
          shares,
          positionValue: netInvested,
          netPnl: pnl,
          returnPct: netRoi,
          exitReason: pendingExitReason || `Pure ML Take-Profit (${exh.toFixed(1)}% | Net: +${netRoi.toFixed(2)}%)`,
          barsHeld: currentBarsHeld,
          cumulativeEquity: balance,
          favorableExcursion,
          adverseExcursion,
        };

        trades.push(tradeClosedThisBar);

        signals.push({
          date: bar.date,
          signal: 'SELL_TP',
          confidence: exh,
          price: exitPrice,
          masterIndex: masterIdx,
          medianDailyMove: null,
          exitReason: pendingExitReason || `Pure ML Take-Profit (${exh.toFixed(1)}%)`,
          modelVersion: 'thoth-egx-macro-v2',
        });

        inPos = false;
        pendingExit = false;
        entryPrice = 0;
        currentBarsHeld = 0;
      } else {
        pendingExit = false;
      }
    }

    if (inPos) {
      currentBarsHeld += 1;
      highestPrice = Math.max(highestPrice, bar.high);
      lowestPrice = Math.min(lowestPrice, bar.low);

      if (hasPred) {
        const isBullExhausted = direction === 'up' && exh >= params.sellThreshold;
        const isBearExhausted = direction === 'down' && exh <= 10.0;

        if (isBullExhausted || isBearExhausted) {
          pendingExit = true;
          pendingExitReason = isBullExhausted
            ? `Bull Exhaustion Peak (${exh.toFixed(1)}%)`
            : `Bear Exhaustion Bottom (${exh.toFixed(1)}%)`;
        }
      }
    } else if (!pendingBuy && hasPred) {
      const earlyBull = direction === 'up' && exh <= params.buyThreshold;
      const bearReversal = direction === 'down' && exh >= 75.0;

      if ((earlyBull || bearReversal) && (!params.requireGreen || isGreen)) {
        pendingBuy = true;
      }
    }

    // Mark-to-market daily equity calculation
    let currentDayEquity = balance;
    if (inPos && entryPrice > 0) {
      const buyFee = balance * 0.00125 + 3.0;
      const netInvested = balance - buyFee;
      const shares = Math.floor(netInvested / entryPrice);
      const grossVal = shares * bar.close;
      const sellFee = grossVal * 0.00125 + 3.0;
      currentDayEquity = grossVal - sellFee;
    }

    peakEquity = Math.max(peakEquity, currentDayEquity);
    const ddAmount = peakEquity - currentDayEquity;
    const ddPct = peakEquity > 0 ? (ddAmount / peakEquity) * 100 : 0;

    maxDrawdownPct = Math.max(maxDrawdownPct, ddPct);
    maxDrawdownAmount = Math.max(maxDrawdownAmount, ddAmount);

    const buyHoldMultiplier = firstClose > 0 ? bar.close / firstClose : 1;
    const buyHoldEquity = initialCapital * buyHoldMultiplier;

    equityCurve.push({
      date: bar.date,
      equity: currentDayEquity,
      buyHoldEquity,
      drawdown: ddPct,
      tradePnl: tradeClosedThisBar ? tradeClosedThisBar.netPnl : undefined,
      tradeReturnPct: tradeClosedThisBar ? tradeClosedThisBar.returnPct : undefined,
    });
  }

  // Calculate Key Stats
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  const netProfit = finalEquity - initialCapital;
  const netProfitPct = initialCapital > 0 ? (netProfit / initialCapital) * 100 : 0;

  const finalBuyHold = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].buyHoldEquity : initialCapital;
  const buyHoldReturn = finalBuyHold - initialCapital;
  const buyHoldReturnPct = initialCapital > 0 ? (buyHoldReturn / initialCapital) * 100 : 0;
  const alphaMargin = netProfitPct - buyHoldReturnPct;

  const winningTradesList = trades.filter((t) => t.netPnl > 0);
  const losingTradesList = trades.filter((t) => t.netPnl <= 0);

  const winningTrades = winningTradesList.length;
  const losingTrades = losingTradesList.length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const grossProfit = winningTradesList.reduce((acc, t) => acc + t.netPnl, 0);
  const grossLoss = Math.abs(losingTradesList.reduce((acc, t) => acc + t.netPnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.99 : 0;

  const avgTradePnl = totalTrades > 0 ? netProfit / totalTrades : 0;
  const avgTradeReturnPct = totalTrades > 0 ? trades.reduce((acc, t) => acc + t.returnPct, 0) / totalTrades : 0;

  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99.99 : 0;

  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  for (const t of trades) {
    if (t.netPnl > 0) {
      currentWins += 1;
      currentLosses = 0;
      maxConsecWins = Math.max(maxConsecWins, currentWins);
    } else {
      currentLosses += 1;
      currentWins = 0;
      maxConsecLosses = Math.max(maxConsecLosses, currentLosses);
    }
  }

  const avgBarsHeld = totalTrades > 0 ? trades.reduce((acc, t) => acc + t.barsHeld, 0) / totalTrades : 0;

  const firstDate = validBars[0].date;
  const lastDate = validBars[validBars.length - 1].date;
  const durationYears = Math.max((Date.parse(lastDate) - Date.parse(firstDate)) / (1000 * 60 * 60 * 24 * 365.25), 0.01);
  const annualCagr = finalEquity > 0 ? ((finalEquity / initialCapital) ** (1 / durationYears) - 1) * 100 : 0;

  let sharpeRatio = 0;
  if (equityCurve.length > 2) {
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].equity;
      const curr = equityCurve[i].equity;
      if (prev > 0) dailyReturns.push((curr - prev) / prev);
    }
    if (dailyReturns.length > 0) {
      const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / dailyReturns.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) {
        sharpeRatio = (meanReturn / stdDev) * Math.sqrt(252);
      }
    }
  }

  return {
    trades,
    equityCurve,
    stats: {
      initialCapital,
      finalEquity,
      netProfit,
      netProfitPct,
      buyHoldReturn,
      buyHoldReturnPct,
      alphaMargin,
      maxDrawdown: maxDrawdownPct,
      maxDrawdownAmount,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitFactor,
      grossProfit,
      grossLoss,
      avgTradePnl,
      avgTradeReturnPct,
      avgWin,
      avgLoss,
      winLossRatio,
      maxConsecutiveWins: maxConsecWins,
      maxConsecutiveLosses: maxConsecLosses,
      avgBarsHeld,
      annualCagr,
      sharpeRatio,
      startDate: firstDate,
      endDate: lastDate,
    },
    signals,
  };
}
