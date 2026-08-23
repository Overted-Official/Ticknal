import type {
  FullBacktestReport,
  StrategyKeyStats,
  StrategyTrade,
} from '@/strategies/registry';
import type {
  PriceBar,
  PsiBacktestResult,
  PsiMetrics,
  PsiSignal,
  PsiSignalType,
} from '@/strategies/PSI/psiStrategy';

import {
  thothV37PEngine,
  type ThothV37PPrediction,
} from './thothV37PEngine';

export interface ThothV37PParams {
  ticker?: string;
  initialCapital?: number;
  startDate?: string;
  endDate?: string;
}

export interface ThothV37PSignal extends PsiSignal {
  decisionDate: string;
  direction: 'up' | 'down';
  predictedExhaustion: number;
  deltaPercentile: number;
  reversalHazardNextBar: number;
  convictionScore: number | null;
  masterIndexAdjusted: number;
}

export interface ThothV37PBacktestResult extends PsiBacktestResult {
  signals: ThothV37PSignal[];
  latestSignal: PsiSignal & {
    direction?: 'up' | 'down';
    predictedExhaustion?: number | null;
    deltaPercentile?: number | null;
    reversalHazardNextBar?: number | null;
    convictionScore?: number | null;
    masterIndexAdjusted?: number | null;
  };
}

type PendingAction = {
  type: 'entry' | 'exit';
  decision: ThothV37PPrediction;
  decisionDate: string;
  reason: string;
};

type OpenTrade = {
  tradeNumber: number;
  entryDate: string;
  entryPrice: number;
  shares: number;
  costBasis: number;
  barsHeld: number;
  highestPrice: number;
  lowestPrice: number;
};

type SimulationResult = {
  signals: ThothV37PSignal[];
  trades: StrategyTrade[];
  equityCurve: FullBacktestReport['equityCurve'];
  stats: StrategyKeyStats;
  metrics: PsiMetrics;
  latestSignal: ThothV37PBacktestResult['latestSignal'];
  latestPrediction: ThothV37PPrediction | null;
};

export const THOTH_V37P_MODEL_VERSION = 'THOTH-EGX-V3.7P';

const RAW_DOWN_ENTRY_THRESHOLD = 75;
const CONVICTION_THRESHOLD = 70;
const MIN_HOLDING_BARS = 3;
const COOLDOWN_BARS = 10;
const COMMISSION_RATE = 0.0015;
const SLIPPAGE_RATE = 0.001;
const DEFAULT_INITIAL_CAPITAL = 100_000;
const DEFAULT_START_DATE = '2025-01-01';
const SIMULATION_CACHE_TTL_MS = 15 * 60 * 1000;

const simulationCache = new Map<
  string,
  { expiresAt: number; promise: Promise<SimulationResult> }
>();

function finitePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function emptyStats(initialCapital: number, startDate: string, endDate: string): StrategyKeyStats {
  return {
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
    startDate,
    endDate,
  };
}

function shouldExit(prediction: ThothV37PPrediction): string | null {
  if (prediction.direction !== 'up' || prediction.predictedExhaustion === null) return null;

  const exhaustion = prediction.predictedExhaustion;
  if (exhaustion >= 85 && prediction.reversalHazardNextBar >= 15) {
    return 'Dynamic velocity exit: UP exhaustion >=85 and reversal hazard >=15';
  }
  if (exhaustion >= 95) {
    return 'Dynamic velocity exit: UP exhaustion >=95';
  }
  if (exhaustion >= 90 && prediction.deltaPercentile < 75) {
    return 'Dynamic velocity exit: UP exhaustion >=90 and delta percentile <75';
  }
  return null;
}

function shouldEnter(prediction: ThothV37PPrediction): boolean {
  return (
    prediction.direction === 'down' &&
    prediction.predictedExhaustion !== null &&
    prediction.predictedExhaustion >= RAW_DOWN_ENTRY_THRESHOLD &&
    prediction.convictionScore !== null &&
    prediction.convictionScore >= CONVICTION_THRESHOLD
  );
}

function actionSignal(
  type: PsiSignalType,
  executionBar: PriceBar,
  executionPrice: number,
  pending: PendingAction,
): ThothV37PSignal {
  const prediction = pending.decision;
  const signal: ThothV37PSignal = {
    date: executionBar.date,
    signal: type,
    confidence:
      prediction.convictionScore !== null
        ? Math.min(1, prediction.convictionScore / 100)
        : Math.min(1, Number(prediction.predictedExhaustion) / 100),
    price: executionPrice,
    masterIndex: prediction.psiIndexValue,
    masterIndexAdjusted: Number(prediction.predictedExhaustion),
    medianDailyMove: null,
    modelVersion: THOTH_V37P_MODEL_VERSION,
    decisionDate: pending.decisionDate,
    direction: prediction.direction,
    predictedExhaustion: Number(prediction.predictedExhaustion),
    deltaPercentile: prediction.deltaPercentile,
    reversalHazardNextBar: prediction.reversalHazardNextBar,
    convictionScore: prediction.convictionScore,
  };

  if (type === 'BUY') signal.entryReason = pending.reason;
  else signal.exitReason = pending.reason;
  return signal;
}

function calculateSharpe(equityCurve: FullBacktestReport['equityCurve']): number {
  if (equityCurve.length < 3) return 0;
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i += 1) {
    const previous = equityCurve[i - 1].equity;
    if (previous > 0) returns.push((equityCurve[i].equity - previous) / previous);
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  const standardDeviation = Math.sqrt(variance);
  return standardDeviation > 0 ? (mean / standardDeviation) * Math.sqrt(252) : 0;
}

function consecutiveRuns(trades: StrategyTrade[]): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  for (const trade of trades) {
    if (trade.netPnl > 0) {
      currentWins += 1;
      currentLosses = 0;
      wins = Math.max(wins, currentWins);
    } else {
      currentLosses += 1;
      currentWins = 0;
      losses = Math.max(losses, currentLosses);
    }
  }
  return { wins, losses };
}

async function simulateUncached(
  bars: PriceBar[],
  params: ThothV37PParams = {},
): Promise<SimulationResult> {
  const initialCapital = finitePositive(params.initialCapital, DEFAULT_INITIAL_CAPITAL);
  const startDate = params.startDate || DEFAULT_START_DATE;
  const endDate = params.endDate;
  const startTime = Date.parse(startDate);
  const endTime = endDate ? Date.parse(endDate) : Number.POSITIVE_INFINITY;

  const sortedBars = [...bars]
    .filter((bar) => {
      const time = Date.parse(bar.date);
      return (
        Number.isFinite(time) &&
        time <= endTime &&
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.low) &&
        Number.isFinite(bar.close) &&
        bar.open > 0 &&
        bar.high > 0 &&
        bar.low > 0 &&
        bar.close > 0
      );
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const firstIndex = sortedBars.findIndex((bar) => Date.parse(bar.date) >= startTime);
  if (firstIndex < 0) {
    const stats = emptyStats(initialCapital, startDate, endDate || startDate);
    return {
      signals: [],
      trades: [],
      equityCurve: [],
      stats,
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
        currentBalance: initialCapital,
      },
      latestSignal: {
        date: endDate || startDate,
        signal: 'SELL_TRAIL',
        confidence: 0,
        price: 0,
        masterIndex: 0,
        medianDailyMove: null,
        modelVersion: THOTH_V37P_MODEL_VERSION,
      },
      latestPrediction: null,
    };
  }

  const predictions = await thothV37PEngine.predict(sortedBars, startDate);
  const predictionByDate = new Map(predictions.map((prediction) => [prediction.date, prediction]));
  const signals: ThothV37PSignal[] = [];
  const trades: StrategyTrade[] = [];
  const equityCurve: FullBacktestReport['equityCurve'] = [];

  let cash = initialCapital;
  let openTrade: OpenTrade | null = null;
  let pending: PendingAction | null = null;
  let lastExitIndex = Number.NEGATIVE_INFINITY;
  let peakEquity = initialCapital;
  let maxDrawdownAmount = 0;
  let maxDrawdownPct = 0;
  const firstClose = sortedBars[firstIndex].close;

  for (let index = firstIndex; index < sortedBars.length; index += 1) {
    const bar = sortedBars[index];
    let tradeClosedToday: StrategyTrade | null = null;

    if (pending?.type === 'entry' && !openTrade) {
      const fillPrice = bar.open * (1 + SLIPPAGE_RATE);
      const netCapital = cash / (1 + COMMISSION_RATE);
      const shares = Math.floor(netCapital / fillPrice);
      if (shares > 0) {
        const costBasis = shares * fillPrice * (1 + COMMISSION_RATE);
        cash -= costBasis;
        openTrade = {
          tradeNumber: trades.length + 1,
          entryDate: bar.date,
          entryPrice: fillPrice,
          shares,
          costBasis,
          barsHeld: 0,
          highestPrice: fillPrice,
          lowestPrice: fillPrice,
        };
        signals.push(actionSignal('BUY', bar, fillPrice, pending));
      }
      pending = null;
    } else if (pending?.type === 'exit' && openTrade) {
      const exited = openTrade;
      const fillPrice = bar.open * (1 - SLIPPAGE_RATE);
      const grossProceeds = exited.shares * fillPrice;
      const netProceeds = grossProceeds * (1 - COMMISSION_RATE);
      const netPnl = netProceeds - exited.costBasis;
      const returnPct = exited.costBasis > 0 ? (netPnl / exited.costBasis) * 100 : 0;
      cash += netProceeds;

      tradeClosedToday = {
        id: exited.tradeNumber,
        tradeNumber: exited.tradeNumber,
        type: 'long',
        entryDate: exited.entryDate,
        entryPrice: exited.entryPrice,
        exitDate: bar.date,
        exitPrice: fillPrice,
        shares: exited.shares,
        positionValue: exited.costBasis,
        netPnl,
        returnPct,
        exitReason: pending.reason,
        barsHeld: exited.barsHeld,
        cumulativeEquity: cash,
        favorableExcursion: ((exited.highestPrice / exited.entryPrice) - 1) * 100,
        adverseExcursion: ((exited.lowestPrice / exited.entryPrice) - 1) * 100,
      };
      trades.push(tradeClosedToday);
      signals.push(actionSignal('SELL_TP', bar, fillPrice, pending));
      openTrade = null;
      pending = null;
      lastExitIndex = index;
    }

    if (openTrade) {
      openTrade.barsHeld += 1;
      openTrade.highestPrice = Math.max(openTrade.highestPrice, bar.high);
      openTrade.lowestPrice = Math.min(openTrade.lowestPrice, bar.low);
    }

    const equity = cash + (openTrade ? openTrade.shares * bar.close : 0);
    const buyHoldEquity = initialCapital * (bar.close / firstClose);
    peakEquity = Math.max(peakEquity, equity);
    const drawdownAmount = Math.max(0, peakEquity - equity);
    const drawdownPct = peakEquity > 0 ? (drawdownAmount / peakEquity) * 100 : 0;
    maxDrawdownAmount = Math.max(maxDrawdownAmount, drawdownAmount);
    maxDrawdownPct = Math.max(maxDrawdownPct, drawdownPct);
    equityCurve.push({
      date: bar.date,
      equity,
      buyHoldEquity,
      drawdown: -drawdownPct,
      tradePnl: tradeClosedToday?.netPnl,
      tradeReturnPct: tradeClosedToday?.returnPct,
    });

    if (index >= sortedBars.length - 1 || pending) continue;
    const prediction = predictionByDate.get(bar.date);
    if (!prediction || prediction.predictedExhaustion === null) continue;

    if (openTrade && openTrade.barsHeld >= MIN_HOLDING_BARS) {
      const exitReason = shouldExit(prediction);
      if (exitReason) {
        pending = {
          type: 'exit',
          decision: prediction,
          decisionDate: bar.date,
          reason: exitReason,
        };
      }
    } else if (!openTrade && index - lastExitIndex >= COOLDOWN_BARS && shouldEnter(prediction)) {
      pending = {
        type: 'entry',
        decision: prediction,
        decisionDate: bar.date,
        reason:
          `DOWN exhaustion ${prediction.predictedExhaustion.toFixed(1)}; ` +
          `conviction ${Number(prediction.convictionScore).toFixed(1)} >=70`,
      };
    }
  }

  const lastBar = sortedBars[sortedBars.length - 1];
  const latestPrediction = predictionByDate.get(lastBar.date) || null;
  const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? initialCapital;
  const finalBuyHold = equityCurve[equityCurve.length - 1]?.buyHoldEquity ?? initialCapital;
  const netProfit = finalEquity - initialCapital;
  const netProfitPct = (netProfit / initialCapital) * 100;
  const buyHoldReturn = finalBuyHold - initialCapital;
  const buyHoldReturnPct = (buyHoldReturn / initialCapital) * 100;
  const winners = trades.filter((trade) => trade.netPnl > 0);
  const losers = trades.filter((trade) => trade.netPnl <= 0);
  const grossProfit = winners.reduce((sum, trade) => sum + trade.netPnl, 0);
  const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.netPnl, 0));
  const durationYears = Math.max(
    (Date.parse(lastBar.date) - Date.parse(sortedBars[firstIndex].date)) /
      (1000 * 60 * 60 * 24 * 365.25),
    0.01,
  );
  const annualCagr = finalEquity > 0
    ? ((finalEquity / initialCapital) ** (1 / durationYears) - 1) * 100
    : 0;
  const runs = consecutiveRuns(trades);
  const avgAdverseExcursion = trades.length
    ? trades.reduce((sum, trade) => sum + trade.adverseExcursion, 0) / trades.length
    : 0;
  const avgFavorableExcursion = trades.length
    ? trades.reduce((sum, trade) => sum + trade.favorableExcursion, 0) / trades.length
    : 0;
  const avgTradeReturnPct = trades.length
    ? trades.reduce((sum, trade) => sum + trade.returnPct, 0) / trades.length
    : 0;
  const avgBarsHeld = trades.length
    ? trades.reduce((sum, trade) => sum + trade.barsHeld, 0) / trades.length
    : 0;

  const stats: StrategyKeyStats = {
    initialCapital,
    finalEquity,
    netProfit,
    netProfitPct,
    buyHoldReturn,
    buyHoldReturnPct,
    alphaMargin: netProfitPct - buyHoldReturnPct,
    maxDrawdown: maxDrawdownPct,
    maxDrawdownAmount,
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRate: trades.length ? (winners.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.99 : 0,
    grossProfit,
    grossLoss,
    avgTradePnl: trades.length ? trades.reduce((sum, trade) => sum + trade.netPnl, 0) / trades.length : 0,
    avgTradeReturnPct,
    avgWin: winners.length ? grossProfit / winners.length : 0,
    avgLoss: losers.length ? grossLoss / losers.length : 0,
    winLossRatio:
      losers.length && grossLoss > 0
        ? (grossProfit / Math.max(1, winners.length)) / (grossLoss / losers.length)
        : grossProfit > 0
          ? 99.99
          : 0,
    maxConsecutiveWins: runs.wins,
    maxConsecutiveLosses: runs.losses,
    avgBarsHeld,
    annualCagr,
    sharpeRatio: calculateSharpe(equityCurve),
    startDate: sortedBars[firstIndex].date,
    endDate: lastBar.date,
  };

  const metrics: PsiMetrics = {
    sysRoi: netProfitPct,
    buyHoldRoi: buyHoldReturnPct,
    roiMargin: netProfitPct - buyHoldReturnPct,
    trades: trades.length,
    winRate: stats.winRate,
    maxDrawdown: maxDrawdownPct,
    maxAdverseExcursion: trades.length
      ? Math.min(...trades.map((trade) => trade.adverseExcursion))
      : 0,
    avgAdverseExcursion,
    avgFavorableExcursion,
    annualCagr,
    avgReturnPerTrade: avgTradeReturnPct,
    avgBarsPerTrade: avgBarsHeld,
    currentBalance: finalEquity,
  };

  const lastAction = signals[signals.length - 1];
  const latestActionIsCurrent = lastAction?.date === lastBar.date;
  const latestSignal: ThothV37PBacktestResult['latestSignal'] = latestActionIsCurrent
    ? lastAction
    : {
        date: lastBar.date,
        signal: 'HOLD' as PsiSignalType,
        confidence:
          latestPrediction?.convictionScore !== null && latestPrediction?.convictionScore !== undefined
            ? Math.min(1, latestPrediction.convictionScore / 100)
            : Math.min(1, Number(latestPrediction?.predictedExhaustion || 0) / 100),
        price: lastBar.close,
        masterIndex: latestPrediction?.psiIndexValue ?? 0,
        masterIndexAdjusted: latestPrediction?.predictedExhaustion ?? null,
        medianDailyMove: null,
        modelVersion: THOTH_V37P_MODEL_VERSION,
        direction: latestPrediction?.direction,
        predictedExhaustion: latestPrediction?.predictedExhaustion,
        deltaPercentile: latestPrediction?.deltaPercentile,
        reversalHazardNextBar: latestPrediction?.reversalHazardNextBar,
        convictionScore: latestPrediction?.convictionScore,
        entryReason: openTrade
          ? 'Holding long; waiting for the production dynamic velocity exit'
          : 'Cash; waiting for a qualified DOWN exhaustion entry',
      };

  return {
    signals,
    trades,
    equityCurve,
    stats,
    metrics,
    latestSignal,
    latestPrediction,
  };
}

function simulationCacheKey(bars: PriceBar[], params: ThothV37PParams): string | null {
  if (!params.ticker || bars.length === 0) return null;
  const last = bars[bars.length - 1];
  return [
    params.ticker.toUpperCase(),
    bars.length,
    last.date,
    last.open,
    last.high,
    last.low,
    last.close,
    last.volume ?? 0,
    params.startDate || DEFAULT_START_DATE,
    params.endDate || '',
    finitePositive(params.initialCapital, DEFAULT_INITIAL_CAPITAL),
  ].join('|');
}

async function simulate(
  bars: PriceBar[],
  params: ThothV37PParams = {},
): Promise<SimulationResult> {
  const key = simulationCacheKey(bars, params);
  if (!key) return simulateUncached(bars, params);

  const now = Date.now();
  const cached = simulationCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;
  if (cached) simulationCache.delete(key);

  const promise = simulateUncached(bars, params).catch((error) => {
    simulationCache.delete(key);
    throw error;
  });
  simulationCache.set(key, {
    expiresAt: now + SIMULATION_CACHE_TTL_MS,
    promise,
  });
  return promise;
}

export async function runThothV37PStrategy(
  bars: PriceBar[],
  params: ThothV37PParams = {},
): Promise<ThothV37PBacktestResult> {
  const result = await simulate(bars, params);
  return {
    signals: result.signals,
    latestSignal: result.latestSignal,
    latestMasterIndex: result.latestPrediction?.psiIndexValue ?? null,
    latestMasterIndexAdjusted: result.latestPrediction?.predictedExhaustion ?? null,
    metrics: result.metrics,
  };
}

export async function runFullThothV37PBacktest(
  bars: PriceBar[],
  params: ThothV37PParams = {},
): Promise<FullBacktestReport> {
  const result = await simulate(bars, params);
  return {
    trades: result.trades.map((trade) => ({
      ...trade,
      entryPrice: round(trade.entryPrice, 4),
      exitPrice: round(trade.exitPrice, 4),
      netPnl: round(trade.netPnl, 4),
      returnPct: round(trade.returnPct, 4),
      cumulativeEquity: round(trade.cumulativeEquity, 4),
    })),
    equityCurve: result.equityCurve,
    stats: result.stats,
    signals: result.signals,
  };
}
