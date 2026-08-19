import { computePsi40 } from './psi40Indicators';
import {
  computePsi8,
  computeTrueRange,
  adaptiveRollingMedian,
  isFiniteNumber,
  nullable,
} from './psi8Indicators';

export type PriceBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type PsiSignalType = "BUY" | "SELL_TP" | "SELL_TRAIL";

export type PsiSignal = {
  date: string;
  signal: PsiSignalType;
  confidence: number;
  price: number;
  masterIndex: number;
  medianDailyMove: number | null;
  entryReason?: string;
  exitReason?: string;
  modelVersion: string;
};

export type PsiMetrics = {
  sysRoi: number;
  buyHoldRoi: number;
  roiMargin: number;
  trades: number;
  winRate: number;
  maxDrawdown: number;
  maxAdverseExcursion: number;
  avgAdverseExcursion: number;
  avgFavorableExcursion: number;
  annualCagr: number;
  avgReturnPerTrade: number;
  avgBarsPerTrade: number;
  currentBalance: number;
};

export type PsiBacktestResult = {
  signals: PsiSignal[];
  metrics: PsiMetrics;
  latestMasterIndex: number | null;
};

export type PsiStrategyParams = {
  model?: "psi8" | "psi40";
  entryLevels: number[];
  useAym: boolean;
  aymMultiplier: number | null;
  aymLimit: number | null;
  useAtr: boolean;
  atrDistance: number | null;
  initialCapital: number;
  startDate: string;
  endDate?: string;
};

type ComputedPsiBar = PriceBar & {
  masterIndex: number | null;
  masterIndex40: number | null;
  atr14: number | null;
  medianDailyMove: number | null;
};

export const PSI_LEVELS = [14.6, 23.6, 38.2, 50.0, 61.8];
export const ENTRY_PRIORITY = [23.6, 14.6, 38.2, 50.0, 61.8];
const MODEL_VERSION = "psi-v9-platform";

export const DEFAULT_PARAMS: PsiStrategyParams = {
  model: "psi8",
  entryLevels: [...PSI_LEVELS],
  useAym: true,
  aymMultiplier: 9,
  aymLimit: 78.6,
  useAtr: true,
  atrDistance: 3,
  initialCapital: 3000,
  startDate: "2025-01-01",
};

const TICKER_PRESETS: Record<string, Partial<PsiStrategyParams>> = {
  'GC1!': { model: 'psi8', entryLevels: [23.6, 38.2], useAym: true, aymMultiplier: 3, aymLimit: 78.6, useAtr: true, atrDistance: 2 },
  'SI1!': { model: 'psi40', entryLevels: [14.6, 23.6, 38.2, 61.8], useAym: true, aymMultiplier: 4, aymLimit: 61.8, useAtr: true, atrDistance: 3 },
  GOLD: { model: 'psi8', entryLevels: [23.6, 38.2], useAym: true, aymMultiplier: 3, aymLimit: 78.6, useAtr: true, atrDistance: 2 },
  SILVER: { model: 'psi40', entryLevels: [14.6, 23.6, 38.2, 61.8], useAym: true, aymMultiplier: 4, aymLimit: 61.8, useAtr: true, atrDistance: 3 },
  XAUUSD: { model: 'psi8', entryLevels: [23.6, 38.2], useAym: true, aymMultiplier: 3, aymLimit: 78.6, useAtr: true, atrDistance: 2 },
  XAGUSD: { model: 'psi40', entryLevels: [14.6, 23.6, 38.2, 61.8], useAym: true, aymMultiplier: 4, aymLimit: 61.8, useAtr: true, atrDistance: 3 },
};

export function normalizeTickerSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase().replace('.CA', '').replace('=F', '');
  if (clean === 'GC' || clean === 'GC1' || clean === 'GC1!' || clean === 'XAUUSD' || clean === 'GOLD') return 'GC1!';
  if (clean === 'SI' || clean === 'SI1' || clean === 'SI1!' || clean === 'XAGUSD' || clean === 'SILVER') return 'SI1!';
  if (clean === 'USDEGP' || clean === 'USD/EGP' || clean === 'USD-EGP') return 'USDEGP';
  return clean.replace('!', '');
}

export function resolvePsiParams(symbol: string, overrides: Partial<PsiStrategyParams> = {}): PsiStrategyParams {
  const preset = TICKER_PRESETS[normalizeTickerSymbol(symbol)] ?? {};
  return {
    ...DEFAULT_PARAMS,
    ...preset,
    ...overrides,
    entryLevels: [...(overrides.entryLevels ?? preset.entryLevels ?? DEFAULT_PARAMS.entryLevels)],
  };
}

export function runPsiStrategy(bars: PriceBar[], params: PsiStrategyParams): PsiBacktestResult {
  const computed = computePsiSeries(bars);
  const startTime = Date.parse(params.startDate);
  const endTime = params.endDate ? Date.parse(params.endDate) : Number.POSITIVE_INFINITY;
  const signals: PsiSignal[] = [];
  const initialCapital = params.initialCapital;

  let balance = initialCapital;
  let active = false;
  let entryPrice = 0;
  let activeShares = 0;
  let targetPrice = Number.NaN;
  let highestPrice = 0;
  let lowestPrice = 0;
  let tradeCount = 0;
  let winCount = 0;
  let closedTrades = 0;
  let activeBars = 0;
  let accumulatedReturnPct = 0;
  let adverseSum = 0;
  let maxAdverseExcursion = 0;
  let favorableSum = 0;
  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let firstClose: number | null = null;
  let lastClose: number | null = null;
  let lastDate = params.startDate;
  let finalEquity = initialCapital;

  const is40 = params.model === "psi40";

  for (let i = 1; i < computed.length; i += 1) {
    const bar = computed[i];
    const time = Date.parse(bar.date);
    if (time < startTime || time > endTime) continue;

    if (firstClose === null) firstClose = bar.close;
    lastClose = bar.close;
    lastDate = bar.date;

    const previousMaster = is40 ? computed[i - 1].masterIndex40 : computed[i - 1].masterIndex;
    const currentMaster = is40 ? bar.masterIndex40 : bar.masterIndex;
    const entryLevel = getCrossedEntryLevel(previousMaster, currentMaster, params.entryLevels);

    if (!active && entryLevel !== null) {
      const shares = Math.floor(balance / bar.close);
      if (shares > 0) {
        active = true;
        activeShares = shares;
        entryPrice = bar.close;
        highestPrice = bar.high;
        lowestPrice = bar.low;
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
          modelVersion: is40 ? "psi40-platform" : MODEL_VERSION,
        });
      }
    }

    if (active) {
      activeBars += 1;
      highestPrice = Math.max(highestPrice, bar.high);
      lowestPrice = Math.min(lowestPrice, bar.low);

      const exitSignal = getExitSignal(bar, params, entryPrice, targetPrice, highestPrice);
      if (exitSignal !== null) {
        const tradeReturnPct = ((bar.close - entryPrice) / entryPrice) * 100;
        balance += activeShares * (bar.close - entryPrice);
        accumulatedReturnPct += tradeReturnPct;
        closedTrades += 1;
        const adverseExcursion = ((lowestPrice - entryPrice) / entryPrice) * 100;
        adverseSum += adverseExcursion;
        maxAdverseExcursion = Math.min(maxAdverseExcursion, adverseExcursion);
        favorableSum += ((highestPrice - entryPrice) / entryPrice) * 100;
        if (tradeReturnPct > 0) winCount += 1;

        signals.push({
          date: bar.date,
          signal: exitSignal.signal,
          confidence: exitSignal.confidence,
          price: bar.close,
          masterIndex: currentMaster ?? 0,
          medianDailyMove: bar.medianDailyMove,
          exitReason: exitSignal.reason,
          modelVersion: is40 ? "psi40-platform" : MODEL_VERSION,
        });

        active = false;
        activeShares = 0;
        entryPrice = 0;
        highestPrice = 0;
        lowestPrice = 0;
        targetPrice = Number.NaN;
      }
    }

    finalEquity = active ? balance + activeShares * (bar.close - entryPrice) : balance;
    peakEquity = Math.max(peakEquity, finalEquity);
    if (peakEquity > 0) {
      maxDrawdown = Math.max(maxDrawdown, ((peakEquity - finalEquity) / peakEquity) * 100);
    }
  }

  const buyHoldRoi = firstClose !== null && lastClose !== null && firstClose > 0 ? ((lastClose / firstClose) - 1) * 100 : 0;
  const sysRoi = ((finalEquity - initialCapital) / initialCapital) * 100;
  const durationYears = Math.max((Date.parse(lastDate) - startTime) / (1000 * 60 * 60 * 24 * 365.25), 0.001);
  const annualCagr = finalEquity > 0 ? ((finalEquity / initialCapital) ** (1 / durationYears) - 1) * 100 : 0;
  const latest = [...computed].reverse().find((bar) => {
    const time = Date.parse(bar.date);
    return time >= startTime && time <= endTime && bar.masterIndex !== null;
  });

  return {
    signals,
    latestMasterIndex: latest?.masterIndex ?? null,
    metrics: {
      sysRoi,
      buyHoldRoi,
      roiMargin: sysRoi - buyHoldRoi,
      trades: tradeCount,
      winRate: closedTrades > 0 ? (winCount / closedTrades) * 100 : 0,
      maxDrawdown,
      maxAdverseExcursion,
      avgAdverseExcursion: tradeCount > 0 ? adverseSum / tradeCount : 0,
      avgFavorableExcursion: tradeCount > 0 ? favorableSum / tradeCount : 0,
      annualCagr,
      avgReturnPerTrade: closedTrades > 0 ? accumulatedReturnPct / closedTrades : 0,
      avgBarsPerTrade: tradeCount > 0 ? activeBars / tradeCount : 0,
      currentBalance: finalEquity,
    },
  };
}

export function formatMetricsForApi(metrics: PsiMetrics): Record<string, string> {
  return {
    "Sys ROI": formatNumber(metrics.sysRoi, 2),
    "B&H ROI": formatNumber(metrics.buyHoldRoi, 2),
    "ROI Margin": formatNumber(metrics.roiMargin, 2),
    "# of Trades": String(metrics.trades),
    "Win Rate": formatNumber(metrics.winRate, 2),
    "Max Drawdown": formatNumber(metrics.maxDrawdown, 2),
    "Max Adverse Excursion": formatNumber(metrics.maxAdverseExcursion, 2),
    "Avg. Adverse Excursion": formatNumber(metrics.avgAdverseExcursion, 2),
    "Avg. Favorable Excursion": formatNumber(metrics.avgFavorableExcursion, 2),
    "Annual CAGR": formatNumber(metrics.annualCagr, 2),
    "Avg. Return/Trade": formatNumber(metrics.avgReturnPerTrade, 2),
    "Avg Bars/Trade": formatNumber(metrics.avgBarsPerTrade, 1),
  };
}

export function computePsiSeries(bars: PriceBar[]): ComputedPsiBar[] {
  const sorted = [...bars]
    .filter((bar) => isFiniteNumber(bar.close) && isFiniteNumber(bar.high) && isFiniteNumber(bar.low))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const close = sorted.map((bar) => bar.close);
  const high = sorted.map((bar) => bar.high);
  const low = sorted.map((bar) => bar.low);

  const { rawIndex, atr14 } = computePsi8(close, high, low);
  const rawIndex40 = computePsi40(sorted);

  const trueRange = computeTrueRange(high, low, close);
  const trPct = trueRange.map((value, i) => (isFiniteNumber(value) && close[i] > 0 ? (Number(value) / close[i]) * 100 : null));
  const medianDailyMove = adaptiveRollingMedian(trPct, 252, 30);

  return sorted.map((bar, i) => ({
    ...bar,
    masterIndex: nullable(rawIndex[i]),
    masterIndex40: nullable(rawIndex40[i]),
    atr14: nullable(atr14[i]),
    medianDailyMove: nullable(medianDailyMove[i]),
  }));
}

export function getCrossedEntryLevel(previous: number | null, current: number | null, enabledLevels: number[]): number | null {
  if (!isFiniteNumber(previous) || !isFiniteNumber(current)) return null;
  for (const level of ENTRY_PRIORITY) {
    if (enabledLevels.includes(level) && Number(current) > level && Number(previous) <= level) {
      return level;
    }
  }
  return null;
}

export function getExitSignal(
  bar: ComputedPsiBar,
  params: PsiStrategyParams,
  entryPrice: number,
  targetPrice: number,
  highestPrice: number,
): { signal: PsiSignalType; reason: string; confidence: number } | null {
  const currentRaw = params.model === "psi40" ? bar.masterIndex40 : bar.masterIndex;

  // 1. AYM Take Profit
  const hitTakeProfit =
    params.useAym &&
    isFiniteNumber(targetPrice) &&
    isFiniteNumber(params.aymLimit) &&
    isFiniteNumber(currentRaw) &&
    bar.close >= targetPrice &&
    Number(currentRaw) < Number(params.aymLimit);

  // 2. ATR Trailing Stop
  const hitTrail =
    params.useAtr &&
    isFiniteNumber(params.atrDistance) &&
    isFiniteNumber(bar.atr14) &&
    bar.close <= highestPrice - Number(bar.atr14) * Number(params.atrDistance) &&
    bar.close > entryPrice;

  if (hitTakeProfit) return { signal: "SELL_TP", reason: "AYM Target Hit", confidence: 1 };
  if (hitTrail) return { signal: "SELL_TRAIL", reason: "ATR Trail Stop", confidence: 0.5 };
  return null;
}

function markToMarket(balance: number, entryPrice: number, close: number): number {
  const shares = Math.floor(balance / entryPrice);
  return shares * close + (balance - shares * entryPrice);
}

function formatNumber(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "0.00";
}
