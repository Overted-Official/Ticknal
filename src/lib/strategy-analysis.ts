import type { PriceBar } from '@/strategies/PSI/psiStrategy';
import {
  formatMetricsForApi,
  normalizeTickerSymbol,
  runPsiStrategy,
} from '@/strategies/PSI/psiStrategy';
import { resolvePsiParamsAsync } from '@/strategies/PSI/psiParameterStore';
import {
  formatPsiV2MetricsForApi,
  runPsiV2Strategy,
} from '@/strategies/PSI_V2';
import { runThothV37PStrategy } from '@/strategies/THOTH_EGX_V3_7P/thothV37PStrategy';
import type { EquityPoint, StrategyTrade } from '@/strategies/registry';
import { getLatestActionableSignal } from '@/lib/strategy-signal-state';

export type StrategyId = 'psi' | 'psi_v2' | 'thoth_egx_macro';

export type SignalEvent = {
  symbol: string;
  strategyId: StrategyId;
  signal: 'BUY' | 'SELL';
  date: string;
  price: number;
  barsAgo: number;
  reason?: string;
};

export type StrategyMetrics = {
  totalReturn: number | null;
  alpha: number | null;
  avgBarsPerTrade: number | null;
  maxDrawdown: number | null;
  maxAdverseExcursion: number | null;
  avgAdverseExcursion: number | null;
  winRate: number | null;
  trades: number | null;
  buyHoldReturn: number | null;
  annualCagr: number | null;
};

export type StrategyAnalysis = {
  symbol: string;
  strategyId: StrategyId;
  analysisStart: string;
  analysisEnd: string;
  dataAsOf: string;
  signalEvents: SignalEvent[];
  latestActionableSignal: SignalEvent | null;
  signalAgeBars: number | null;
  metrics: StrategyMetrics;
  trades: StrategyTrade[];
  equityCurve: EquityPoint[];
  parameterVersion: string;
  formattedMetrics: Record<string, string>;
  rawResult: unknown;
};

export type StrategyAnalysisOptions = {
  startDate?: string;
  endDate?: string;
  timeframe?: string;
  lookbackBars?: number;
  strategyParams?: Record<string, unknown>;
};

const DEFAULT_ANALYSIS_START = '2025-01-01';

function numberOrNull(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeDate(value: unknown): string {
  return value instanceof Date
    ? value.toISOString().split('T')[0]
    : String(value).split('T')[0];
}

function normalizedBars(input: PriceBar[]): PriceBar[] {
  return input
    .map((bar) => ({
      date: normalizeDate(bar.date),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number(bar.volume ?? 0),
    }))
    .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function barsAgoForDate(date: string, bars: PriceBar[]): number {
  for (let index = bars.length - 1; index >= 0; index -= 1) {
    if (bars[index].date === date) return bars.length - 1 - index;
  }
  return 0;
}

function mapMetrics(metrics: Record<string, unknown>): StrategyMetrics {
  return {
    totalReturn: numberOrNull(metrics.sysRoi),
    alpha: numberOrNull(metrics.roiMargin),
    avgBarsPerTrade: numberOrNull(metrics.avgBarsPerTrade),
    maxDrawdown: numberOrNull(metrics.maxDrawdown),
    maxAdverseExcursion: numberOrNull(metrics.maxAdverseExcursion),
    avgAdverseExcursion: numberOrNull(metrics.avgAdverseExcursion),
    winRate: numberOrNull(metrics.winRate),
    trades: numberOrNull(metrics.trades),
    buyHoldReturn: numberOrNull(metrics.buyHoldRoi),
    annualCagr: numberOrNull(metrics.annualCagr),
  };
}

function makeSignalEvents(
  symbol: string,
  strategyId: StrategyId,
  signals: Array<{ date: string; signal: string; price: number; entryReason?: string; exitReason?: string; reasoning?: string }>,
  bars: PriceBar[],
): SignalEvent[] {
  return signals
    .filter((signal) => signal.signal === 'BUY' || signal.signal.startsWith('SELL'))
    .map((signal) => ({
      symbol,
      strategyId,
      signal: (signal.signal === 'BUY' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
      date: normalizeDate(signal.date),
      price: Number(signal.price),
      barsAgo: barsAgoForDate(normalizeDate(signal.date), bars),
      reason: signal.entryReason || signal.exitReason || signal.reasoning,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function latestActionable(events: SignalEvent[], bars: PriceBar[], lookbackBars: number): SignalEvent | null {
  const result = getLatestActionableSignal(events, bars, lookbackBars);
  return result?.signal ?? null;
}

export async function analyzeStrategy(
  symbol: string,
  inputBars: PriceBar[],
  strategyId: StrategyId,
  options: StrategyAnalysisOptions = {},
): Promise<StrategyAnalysis> {
  const cleanSymbol = normalizeTickerSymbol(symbol);
  const bars = normalizedBars(inputBars);
  const analysisStart = options.startDate || DEFAULT_ANALYSIS_START;
  const analysisEnd = options.endDate || bars[bars.length - 1]?.date || analysisStart;
  const lookbackBars = options.lookbackBars ?? 5;
  const commonParams = {
    ...(options.strategyParams || {}),
    startDate: analysisStart,
    ...(options.endDate ? { endDate: options.endDate } : {}),
    ...(options.timeframe ? { timeframe: options.timeframe } : {}),
  };

  if (bars.length === 0) {
    return {
      symbol: cleanSymbol,
      strategyId,
      analysisStart,
      analysisEnd,
      dataAsOf: analysisEnd,
      signalEvents: [],
      latestActionableSignal: null,
      signalAgeBars: null,
      metrics: {
        totalReturn: null,
        alpha: null,
        avgBarsPerTrade: null,
        maxDrawdown: null,
        maxAdverseExcursion: null,
        avgAdverseExcursion: null,
        winRate: null,
        trades: null,
        buyHoldReturn: null,
        annualCagr: null,
      },
      trades: [],
      equityCurve: [],
      parameterVersion: 'unavailable',
      formattedMetrics: {},
      rawResult: null,
    };
  }

  let rawResult: any;
  let signals: Array<{ date: string; signal: string; price: number; entryReason?: string; exitReason?: string; reasoning?: string }>;
  let metrics: Record<string, unknown>;
  let trades: StrategyTrade[] = [];
  let equityCurve: EquityPoint[] = [];
  let parameterVersion = 'unavailable';
  let formattedMetrics: Record<string, string> = {};

  if (strategyId === 'psi') {
    const parameterResolution = await resolvePsiParamsAsync(cleanSymbol, commonParams as any, options.timeframe || 'D');
    rawResult = runPsiStrategy(bars, parameterResolution.params);
    signals = rawResult.signals;
    metrics = rawResult.metrics;
    parameterVersion = parameterResolution.parameterSource;
    formattedMetrics = formatMetricsForApi(rawResult.metrics);
  } else if (strategyId === 'psi_v2') {
    rawResult = runPsiV2Strategy(bars, { ticker: cleanSymbol, ...commonParams });
    signals = rawResult.signals;
    metrics = rawResult.metrics;
    trades = rawResult.trades || [];
    equityCurve = rawResult.equityCurve || [];
    parameterVersion = `psi-v2-levels-${cleanSymbol}`;
    formattedMetrics = formatPsiV2MetricsForApi(rawResult.metrics);
  } else {
    rawResult = await runThothV37PStrategy(bars, { ticker: cleanSymbol, ...commonParams });
    signals = rawResult.signals;
    metrics = rawResult.metrics;
    parameterVersion = 'thoth-egx-v3.7p-production-frozen';
    formattedMetrics = formatMetricsForApi(rawResult.metrics);
  }

  const signalEvents = makeSignalEvents(cleanSymbol, strategyId, signals, bars);
  const latest = latestActionable(signalEvents, bars, lookbackBars);

  return {
    symbol: cleanSymbol,
    strategyId,
    analysisStart,
    analysisEnd,
    dataAsOf: bars[bars.length - 1].date,
    signalEvents,
    latestActionableSignal: latest,
    signalAgeBars: latest?.barsAgo ?? null,
    metrics: mapMetrics(metrics),
    trades,
    equityCurve,
    parameterVersion,
    formattedMetrics,
    rawResult,
  };
}

export function strategyLabel(strategyId: StrategyId): string {
  if (strategyId === 'psi_v2') return 'PSI V2';
  if (strategyId === 'thoth_egx_macro') return 'THOTH';
  return 'PSI';
}
