import {
  computePsiSeries,
  getCrossedEntryLevel,
  getExitSignal,
  type PriceBar,
  type PsiStrategyParams,
  type PsiSignal,
} from "./psiStrategy";

export interface StrategyTrade {
  id: number;
  tradeNumber: number;
  type: "long";
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  shares: number;
  positionValue: number;
  netPnl: number;
  returnPct: number;
  exitReason: string;
  barsHeld: number;
  cumulativeEquity: number;
  favorableExcursion: number;
  adverseExcursion: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
  buyHoldEquity: number;
  drawdown: number;
  tradePnl?: number;
  tradeReturnPct?: number;
}

export interface StrategyKeyStats {
  initialCapital: number;
  finalEquity: number;
  netProfit: number;
  netProfitPct: number;
  buyHoldReturn: number;
  buyHoldReturnPct: number;
  alphaMargin: number;
  maxDrawdown: number;
  maxDrawdownAmount: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  grossProfit: number;
  grossLoss: number;
  avgTradePnl: number;
  avgTradeReturnPct: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgBarsHeld: number;
  annualCagr: number;
  sharpeRatio: number;
  startDate: string;
  endDate: string;
}

export interface FullBacktestReport {
  trades: StrategyTrade[];
  equityCurve: EquityPoint[];
  stats: StrategyKeyStats;
  signals: PsiSignal[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function runFullStrategyBacktest(
  bars: PriceBar[],
  params: PsiStrategyParams
): FullBacktestReport {
  const computed = computePsiSeries(bars);
  const startTime = params.startDate ? Date.parse(params.startDate) : 0;
  const endTime = params.endDate ? Date.parse(params.endDate) : Number.POSITIVE_INFINITY;
  const initialCapital = params.initialCapital || 100000;

  const validBars = computed.filter((b) => {
    const time = Date.parse(b.date);
    return time >= startTime && time <= endTime;
  });

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
        startDate: params.startDate || "",
        endDate: params.endDate || "",
      },
    };
  }

  const trades: StrategyTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  const signals: PsiSignal[] = [];

  let balance = initialCapital;
  let active = false;
  let entryPrice = 0;
  let entryDate = "";
  let targetPrice = Number.NaN;
  let highestPrice = 0;
  let lowestPrice = 0;
  let tradeCount = 0;
  let currentBarsHeld = 0;
  let peakEquity = initialCapital;
  let maxDrawdownPct = 0;
  let maxDrawdownAmount = 0;

  const firstClose = validBars[0].close;
  const is40 = params.model === "psi40";

  for (let i = 0; i < validBars.length; i++) {
    const bar = validBars[i];
    const prevBar = i > 0 ? validBars[i - 1] : bar;

    const prevMaster = is40 ? prevBar.masterIndex40 : prevBar.masterIndex;
    const currentMaster = is40 ? bar.masterIndex40 : bar.masterIndex;

    let tradeClosedThisBar: StrategyTrade | null = null;

    // Check entry if no active position
    if (!active) {
      const entryLevel = getCrossedEntryLevel(prevMaster, currentMaster, params.entryLevels);
      if (entryLevel !== null && bar.close > 0) {
        const shares = Math.floor(balance / bar.close);
        if (shares > 0) {
          active = true;
          entryPrice = bar.close;
          entryDate = bar.date;
          highestPrice = bar.high;
          lowestPrice = bar.low;
          currentBarsHeld = 0;
          tradeCount += 1;
          targetPrice = Number.NaN;

          if (params.useAym && isFiniteNumber(params.aymMultiplier) && isFiniteNumber(bar.medianDailyMove)) {
            targetPrice = bar.close * (1 + (bar.medianDailyMove * Number(params.aymMultiplier)) / 100);
          }

          signals.push({
            date: bar.date,
            signal: "BUY",
            confidence: 1,
            price: bar.close,
            masterIndex: currentMaster ?? 0,
            medianDailyMove: bar.medianDailyMove,
            entryReason: `L-${entryLevel.toFixed(1)}`,
            modelVersion: is40 ? "psi40-platform" : "psi-v9-platform",
          });
        }
      }
    }

    // Check exit if currently active
    if (active) {
      currentBarsHeld += 1;
      highestPrice = Math.max(highestPrice, bar.high);
      lowestPrice = Math.min(lowestPrice, bar.low);

      const exitSignal = getExitSignal(bar, params, entryPrice, targetPrice, highestPrice);
      if (exitSignal !== null || i === validBars.length - 1) {
        const shares = Math.floor(balance / entryPrice);
        const exitP = bar.close;
        const pnl = shares * (exitP - entryPrice);
        const returnPct = ((exitP - entryPrice) / entryPrice) * 100;
        const favorableExcursion = ((highestPrice - entryPrice) / entryPrice) * 100;
        const adverseExcursion = ((lowestPrice - entryPrice) / entryPrice) * 100;

        balance += pnl;

        tradeClosedThisBar = {
          id: tradeCount,
          tradeNumber: tradeCount,
          type: "long",
          entryDate,
          entryPrice,
          exitDate: bar.date,
          exitPrice: exitP,
          shares,
          positionValue: shares * entryPrice,
          netPnl: pnl,
          returnPct,
          exitReason: exitSignal ? exitSignal.reason : "Backtest End",
          barsHeld: currentBarsHeld,
          cumulativeEquity: balance,
          favorableExcursion,
          adverseExcursion,
        };

        trades.push(tradeClosedThisBar);

        signals.push({
          date: bar.date,
          signal: exitSignal?.signal ?? "SELL_TRAIL",
          confidence: exitSignal?.confidence ?? 1,
          price: exitP,
          masterIndex: currentMaster ?? 0,
          medianDailyMove: bar.medianDailyMove,
          exitReason: exitSignal?.reason ?? "End of period",
          modelVersion: is40 ? "psi40-platform" : "psi-v9-platform",
        });

        active = false;
        entryPrice = 0;
        highestPrice = 0;
        lowestPrice = 0;
        targetPrice = Number.NaN;
        currentBarsHeld = 0;
      }
    }

    // Compute Mark-to-Market Equity for this date
    let currentDayEquity = balance;
    if (active && entryPrice > 0) {
      const shares = Math.floor(balance / entryPrice);
      currentDayEquity = balance + shares * (bar.close - entryPrice);
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

  // Daily returns standard deviation for Sharpe
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

  const stats: StrategyKeyStats = {
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
  };

  return {
    trades,
    equityCurve,
    stats,
    signals,
  };
}
