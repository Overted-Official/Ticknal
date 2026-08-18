import { ThothEngine, type ThothModelPrediction } from './thothEngine';
import type { PriceBar, PsiSignal, PsiMetrics, PsiBacktestResult } from '../PSI/psiStrategy';

export interface ThothStrategyParams {
  buyThreshold?: number;       // default 25.0% (Exhaustion <= 25% on UP, or >= 75% on DOWN)
  sellThreshold?: number;      // default 90.0% (Bull Exhaustion >= 90% on UP, or <= 10% on DOWN)
  maxHoldBars?: number;        // default 30 bars
  minNetProfit?: number;       // default 0.0% (Never exit on a loss)
  startDate?: string;
  endDate?: string;
  initialCapital?: number;
}

export const DEFAULT_THOTH_PARAMS: Required<ThothStrategyParams> = {
  buyThreshold: 25.0,
  sellThreshold: 90.0,
  maxHoldBars: 30,
  minNetProfit: 0.0,
  startDate: '2025-01-01',
  endDate: '2099-12-31',
  initialCapital: 100000.0,
};

export async function runThothStrategy(
  bars: PriceBar[],
  userParams: ThothStrategyParams = {}
): Promise<PsiBacktestResult> {
  const params: Required<ThothStrategyParams> = {
    ...DEFAULT_THOTH_PARAMS,
    ...userParams,
  };

  const engine = ThothEngine.getInstance();
  const predictions = await engine.predict(bars);

  const predMap = new Map<string, ThothModelPrediction>();
  predictions.forEach(p => predMap.set(p.date, p));

  const validBars = [...bars]
    .filter(b => b.date >= params.startDate && (!params.endDate || b.date <= params.endDate))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (validBars.length === 0) {
    return {
      signals: [],
      latestMasterIndex: null,
      latestMasterIndexAdjusted: null,
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
    const exh = pred?.predictedExhaustion ?? 0.0;
    const direction = pred?.direction ?? 'up';
    const masterIdx = pred?.masterIndex ?? 50.0;

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
        masterIndexAdjusted: exh,
        medianDailyMove: null,
        entryReason: `Thoth Macro Entry (${direction.toUpperCase()} Exh: ${exh.toFixed(1)}%)`,
        modelVersion: 'thoth-egx-macro-v1',
      });
    } else if (pendingExit && inPos) {
      const exitPrice = bar.open > 0 ? bar.open : bar.close;
      
      // Exact Real-World Invoice Fee Model (0.25% + 6.00 EGP)
      const buyFee = balance * 0.00125 + 3.00;
      const netInvested = balance - buyFee;
      const shares = netInvested / entryPrice;
      const grossExit = shares * exitPrice;
      const sellFee = grossExit * 0.00125 + 3.00;
      const netExit = grossExit - sellFee;
      const netRoi = ((netExit - balance) / balance) * 100.0;

      // STRICT NO-LOSS RULE: Never exit on a loss
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
          masterIndexAdjusted: exh,
          medianDailyMove: null,
          exitReason: pendingExitReason || `Take-Profit (${exh.toFixed(1)}% | Net: +${netRoi.toFixed(2)}%)`,
          modelVersion: 'thoth-egx-macro-v1',
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

      const barsHeld = i - entryBar;

      // User Sell Conditions:
      // 1. Bull Exhaustion >= 90%
      // 2. Bear Exhaustion <= 10%
      // 3. Bars Held >= 30
      const isBullExhausted = (direction === 'up' && exh >= params.sellThreshold);
      const isBearExhausted = (direction === 'down' && exh <= 10.0);
      const isMaxHold = barsHeld >= params.maxHoldBars;

      if (isBullExhausted || isBearExhausted || isMaxHold) {
        pendingExit = true;
        pendingExitReason = isBullExhausted 
          ? `Bull Exhaustion Peak (${exh.toFixed(1)}%)`
          : isBearExhausted 
            ? `Bear Exhaustion Low (${exh.toFixed(1)}%)`
            : `Max Hold Horizon (${barsHeld} bars)`;
      }
    } else if (!pendingBuy) {
      // User Buy Conditions:
      // 1. Early Bull (direction == up && exh <= 25%)
      // 2. Oversold Bear Reversal (direction == down && exh >= 75%)
      if ((direction === 'up' && exh <= params.buyThreshold) || (direction === 'down' && exh >= 75.0)) {
        pendingBuy = true;
      }
    }

    // Equity Curve & Drawdown Tracking
    const currentEquity = inPos ? (balance / entryPrice) * bar.close : balance;
    peakEquity = Math.max(peakEquity, currentEquity);
    if (peakEquity > 0) {
      const dd = ((peakEquity - currentEquity) / peakEquity) * 100.0;
      maxDrawdown = Math.max(maxDrawdown, dd);
    }
  }

  const buyHoldRoi = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100.0 : 0.0;
  const sysRoi = ((balance - params.initialCapital) / params.initialCapital) * 100.0;
  const durationYears = Math.max((Date.parse(validBars[validBars.length - 1].date) - Date.parse(validBars[0].date)) / (1000 * 60 * 60 * 24 * 365.25), 0.08);
  const annualCagr = balance > 0 ? (((balance / params.initialCapital) ** (1 / durationYears)) - 1) * 100.0 : 0.0;

  const latestPred = predictions[predictions.length - 1];

  return {
    signals,
    latestMasterIndex: latestPred?.masterIndex ?? null,
    latestMasterIndexAdjusted: latestPred?.predictedExhaustion ?? null,
    metrics: {
      sysRoi,
      buyHoldRoi,
      roiMargin: sysRoi - buyHoldRoi,
      trades: tradeCount,
      winRate: tradeCount > 0 ? (winCount / tradeCount) * 100.0 : 0.0,
      maxDrawdown,
      maxAdverseExcursion,
      avgAdverseExcursion: tradeCount > 0 ? adverseSum / tradeCount : 0.0,
      avgFavorableExcursion: tradeCount > 0 ? favorableSum / tradeCount : 0.0,
      annualCagr,
      avgReturnPerTrade: tradeCount > 0 ? accumulatedReturnPct / tradeCount : 0.0,
      avgBarsPerTrade: tradeCount > 0 ? activeBars / tradeCount : 0.0,
      currentBalance: balance,
    }
  };
}
