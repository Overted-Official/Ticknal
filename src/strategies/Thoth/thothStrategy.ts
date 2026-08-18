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

  const params: Required<Omit<ThothStrategyParams, 'ticker'>> = {
    ...DEFAULT_THOTH_PARAMS,
    ...bespoke,
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
    } else if (!pendingBuy) {
      // Pure ML Neural Exhaustion Entry Conditions:
      // 1. Early Bull (direction == up && exh <= buyThreshold)
      // 2. Oversold Bear Reversal (direction == down && exh >= 75%)
      const earlyBull = (direction === 'up' && exh <= params.buyThreshold);
      const bearReversal = (direction === 'down' && exh >= 75.0);

      if ((earlyBull || bearReversal) && (!params.requireGreen || isGreen)) {
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
