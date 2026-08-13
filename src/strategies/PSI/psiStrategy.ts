import { computePsi40 } from './psi40Indicators';
export type PriceBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type PsiSignalType = "BUY" | "SELL_TP" | "SELL_TRAIL" | "SELL_SL" | "SELL_STRUCT";

export type PsiSignal = {
  date: string;
  signal: PsiSignalType;
  confidence: number;
  price: number;
  masterIndex: number;
  masterIndexAdjusted: number;
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
  latestMasterIndexAdjusted: number | null;
};

export type PsiStrategyParams = {
  entryLevels: number[];
  useAym: boolean;
  aymMultiplier: number | null;
  aymLimit: number | null;
  useAtr: boolean;
  atrDistance: number | null;
  useStoploss: boolean;
  stoplossLevel: number | null;
  useStructStop: boolean;
  structLookback: number;
  initialCapital: number;
  startDate: string;
  endDate?: string;
};

type ComputedPsiBar = PriceBar & {
  masterIndex: number | null;
  masterIndexAdjusted: number | null;
  masterIndex40: number | null;
  atr14: number | null;
  medianDailyMove: number | null;
  structLow: number | null;
};

const PSI_LEVELS = [14.6, 23.6, 38.2, 50.0, 61.8];
const ENTRY_PRIORITY = [23.6, 14.6, 38.2, 50.0, 61.8];
const MODEL_VERSION = "psi-v9-platform";

const DEFAULT_PARAMS: PsiStrategyParams = {
  entryLevels: [...PSI_LEVELS],
  useAym: true,
  aymMultiplier: 9,
  aymLimit: 78.6,
  useAtr: true,
  atrDistance: 3,
  useStoploss: true,
  stoplossLevel: 3,
  useStructStop: false,
  structLookback: 20,
  initialCapital: 3000,
  startDate: "2021-01-01",
};

const TICKER_PRESETS: Record<string, Partial<PsiStrategyParams>> = {
  COMI: { entryLevels: [23.6], useAym: true, aymMultiplier: 3, aymLimit: 78.6, useAtr: true, atrDistance: 2, useStoploss: true, stoplossLevel: 6 },
  ADIB: { entryLevels: [23.6, 38.2, 50.0, 61.8], useAym: true, aymMultiplier: 8, aymLimit: 88.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  HDBK: { entryLevels: [14.6], useAym: true, aymMultiplier: 3, aymLimit: 50.0, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  CANA: { entryLevels: [14.6, 23.6, 38.2, 50.0], useAym: true, aymMultiplier: 9, aymLimit: 78.6, useAtr: true, atrDistance: 5, useStoploss: false, stoplossLevel: null },
  JUFO: { entryLevels: [14.6, 23.6, 38.2], useAym: true, aymMultiplier: 4, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  POUL: { entryLevels: [14.6, 38.2], useAym: true, aymMultiplier: 10, aymLimit: 88.6, useAtr: true, atrDistance: 6, useStoploss: false, stoplossLevel: null },
  IFAP: { entryLevels: [38.2, 61.8], useAym: true, aymMultiplier: 3, aymLimit: 88.6, useAtr: true, atrDistance: 4, useStoploss: false, stoplossLevel: null },
  SCFM: { entryLevels: [14.6, 38.2, 50.0], useAym: true, aymMultiplier: 6, aymLimit: 88.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  EFIC: { entryLevels: [14.6, 23.6, 38.2, 50.0], useAym: true, aymMultiplier: 3, aymLimit: 61.8, useAtr: true, atrDistance: 5, useStoploss: false, stoplossLevel: null },
  ICFC: { entryLevels: [14.6, 23.6, 38.2], useAym: true, aymMultiplier: 12, aymLimit: 78.6, useAtr: true, atrDistance: 4, useStoploss: false, stoplossLevel: null },
  MCQE: { entryLevels: [23.6, 38.2], useAym: true, aymMultiplier: 12, aymLimit: 88.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  ARCC: { entryLevels: [14.6, 61.8], useAym: true, aymMultiplier: 8, aymLimit: 88.6, useAtr: true, atrDistance: 6, useStoploss: false, stoplossLevel: null },
  SCEM: { entryLevels: [38.2, 50.0], useAym: true, aymMultiplier: 2, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  MBSC: { entryLevels: [23.6, 61.8], useAym: true, aymMultiplier: 2, aymLimit: 88.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  PHDC: { entryLevels: [14.6, 23.6, 61.8], useAym: true, aymMultiplier: 2, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  EALR: { entryLevels: [14.6], useAym: true, aymMultiplier: 6, aymLimit: 88.6, useAtr: true, atrDistance: 6, useStoploss: false, stoplossLevel: null },
  WKOL: { entryLevels: [38.2, 50.0], useAym: true, aymMultiplier: 2, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  MPCI: { entryLevels: [23.6, 38.2, 61.8], useAym: true, aymMultiplier: 8, aymLimit: 78.6, useAtr: true, atrDistance: 3, useStoploss: false, stoplossLevel: null },
  NIPH: { entryLevels: [38.2, 50.0, 61.8], useAym: true, aymMultiplier: 8, aymLimit: 88.6, useAtr: true, atrDistance: 3, useStoploss: false, stoplossLevel: null },
  EGAL: { entryLevels: [23.6, 50.0], useAym: true, aymMultiplier: 8, aymLimit: 88.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  IRON: { entryLevels: [14.6], useAym: true, aymMultiplier: 3, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  MBEG: { entryLevels: [14.6, 23.6, 61.8], useAym: true, aymMultiplier: 12, aymLimit: 78.6, useAtr: true, atrDistance: 4, useStoploss: false, stoplossLevel: null },
  MEBG: { entryLevels: [14.6, 23.6, 61.8], useAym: true, aymMultiplier: 12, aymLimit: 78.6, useAtr: true, atrDistance: 4, useStoploss: false, stoplossLevel: null },
  GBCO: { entryLevels: [23.6], useAym: true, aymMultiplier: 2, aymLimit: 61.8, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  SWDY: { entryLevels: [14.6, 50.0], useAym: true, aymMultiplier: 3, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  EMFD: { entryLevels: [14.6, 23.6, 38.2], useAym: true, aymMultiplier: 3, aymLimit: 88.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  AFMC: { entryLevels: [14.6, 50.0], useAym: true, aymMultiplier: 3, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  ORHD: { entryLevels: [14.6, 23.6], useAym: true, aymMultiplier: 3, aymLimit: 61.8, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  BTFH: { entryLevels: [23.6, 38.2], useAym: true, aymMultiplier: 2, aymLimit: 78.6, useAtr: true, atrDistance: 3, useStoploss: false, stoplossLevel: null },
  OIH: { entryLevels: [23.6, 50.0], useAym: true, aymMultiplier: 8, aymLimit: 78.6, useAtr: true, atrDistance: 3, useStoploss: false, stoplossLevel: null },
  EFID: { entryLevels: [23.6, 50.0], useAym: true, aymMultiplier: 4, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  OLFI: { entryLevels: [14.6, 50.0], useAym: true, aymMultiplier: 3, aymLimit: 88.6, useAtr: true, atrDistance: 4, useStoploss: false, stoplossLevel: null },
  ORWE: { entryLevels: [14.6, 23.6, 38.2], useAym: true, aymMultiplier: 3, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  ETEL: { entryLevels: [14.6, 38.2, 61.8], useAym: true, aymMultiplier: 5, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
  XAUUSD: { entryLevels: [14.6, 23.6, 38.2, 50.0], useAym: true, aymMultiplier: 2, aymLimit: 78.6, useAtr: false, atrDistance: null, useStoploss: false, stoplossLevel: null },
};

export function normalizeTickerSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(".CA", "");
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

  for (let i = 1; i < computed.length; i += 1) {
    const bar = computed[i];
    const time = Date.parse(bar.date);
    if (time < startTime || time > endTime) continue;

    if (firstClose === null) firstClose = bar.close;
    lastClose = bar.close;
    lastDate = bar.date;

    const previousMaster = computed[i - 1].masterIndex;
    const currentMaster = bar.masterIndex;
    const entryLevel = getCrossedEntryLevel(previousMaster, currentMaster, params.entryLevels);

    if (!active && entryLevel !== null) {
      const shares = Math.floor(balance / bar.close);
      if (shares > 0) {
        active = true;
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
          masterIndexAdjusted: bar.masterIndexAdjusted ?? 0,
          medianDailyMove: bar.medianDailyMove,
          entryReason: `L-${entryLevel.toFixed(1)}`,
          modelVersion: MODEL_VERSION,
        });
      }
    }

    if (active) {
      activeBars += 1;
      highestPrice = Math.max(highestPrice, bar.high);
      lowestPrice = Math.min(lowestPrice, bar.low);

      const exitSignal = getExitSignal(bar, params, entryPrice, targetPrice, highestPrice);
      if (exitSignal !== null) {
        const shares = Math.floor(balance / entryPrice);
        const tradeReturnPct = ((bar.close - entryPrice) / entryPrice) * 100;
        balance += shares * (bar.close - entryPrice);
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
          masterIndexAdjusted: bar.masterIndexAdjusted ?? 0,
          medianDailyMove: bar.medianDailyMove,
          exitReason: exitSignal.reason,
          modelVersion: MODEL_VERSION,
        });

        active = false;
        entryPrice = 0;
        highestPrice = 0;
        lowestPrice = 0;
        targetPrice = Number.NaN;
      }
    }

    finalEquity = active ? markToMarket(balance, entryPrice, bar.close) : balance;
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
    latestMasterIndexAdjusted: latest?.masterIndexAdjusted ?? null,
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

  const normHigh = rollingMax(close, 14);
  const normLow = rollingMin(close, 14);
  const normPrice = close.map((value, i) => {
    const range = safeSub(normHigh[i], normLow[i]);
    return isFiniteNumber(range) && range !== 0 ? ((value - Number(normLow[i])) / range) * 100 : 50;
  });

  const rsi = computeRsi(close, 14);
  const banker = computeBankerScore(close, high, low);
  const bbScore = computeBollingerScore(close, 14, 2);
  const atr14 = computeAtr(high, low, close, 14);
  const supertrend = computeSupertrend(high, low, close, atr14, 3);
  const stScore = close.map((value, i) => {
    const atr = atr14[i];
    const stValue = supertrend.value[i];
    if (!isFiniteNumber(atr) || !isFiniteNumber(stValue) || Number(atr) <= 0) return null;
    return clamp(50 + ((value - Number(stValue)) / (Number(atr) * 3)) * 50, 0, 100);
  });
  const adxScore = computeDmiScore(high, low, close, 14);
  const maScore = computeMaScore(close, 50, 200, 14);
  const slopeScore = close.map((value, i) => {
    const atr = atr14[i];
    if (i < 14 || !isFiniteNumber(atr) || Number(atr) <= 0) return null;
    const rawSlope = (value - close[i - 14]) / (Number(atr) * 14);
    const angle = (Math.atan(rawSlope) * 180) / Math.PI;
    return clamp(((angle + 90) / 180) * 100, 0, 100);
  });

  const rawIndex = close.map((_value, i) => {
    const components = [
      normPrice[i],
      rsi[i],
      banker[i],
      bbScore[i],
      stScore[i],
      adxScore[i],
      maScore[i],
      slopeScore[i],
    ];
    if (components.some((value) => !isFiniteNumber(value))) return null;
    const weighted =
      Number(normPrice[i]) * 21 +
      Number(rsi[i]) * 10 +
      Number(banker[i]) * 5 +
      Number(bbScore[i]) * 4 +
      Number(stScore[i]) * 44 +
      Number(adxScore[i]) * 10 +
      Number(maScore[i]) * 4 +
      Number(slopeScore[i]) * 1;
    return Math.round((weighted / 99) / 16.18) * 16.18;
  });

  const rawIndex40 = computePsi40(sorted);
  const masterIndex40 = dynamicEma(rawIndex40, 1);

  const masterIndex = dynamicEma(rawIndex, 1);
  const masterIndexAdjusted = dynamicEma(rawIndex, 2);
  const trueRange = computeTrueRange(high, low, close);
  const medianDailyMove = rollingMedian(
    trueRange.map((value, i) => (isFiniteNumber(value) && close[i] > 0 ? (Number(value) / close[i]) * 100 : null)),
    252,
  );
  const structLow = rollingMin(low, 20);

  return sorted.map((bar, i) => ({
    ...bar,
    masterIndex: nullable(masterIndex[i]),
    masterIndexAdjusted: nullable(masterIndexAdjusted[i]),
    masterIndex40: nullable(masterIndex40[i]),
    atr14: nullable(atr14[i]),
    medianDailyMove: nullable(medianDailyMove[i]),
    structLow: nullable(structLow[i]),
  }));
}

function getCrossedEntryLevel(previous: number | null, current: number | null, enabledLevels: number[]): number | null {
  if (!isFiniteNumber(previous) || !isFiniteNumber(current)) return null;
  for (const level of ENTRY_PRIORITY) {
    if (enabledLevels.includes(level) && Number(current) > level && Number(previous) <= level) {
      return level;
    }
  }
  return null;
}

function getExitSignal(
  bar: ComputedPsiBar,
  params: PsiStrategyParams,
  entryPrice: number,
  targetPrice: number,
  highestPrice: number,
): { signal: PsiSignalType; reason: string; confidence: number } | null {
  const medianDailyMove = bar.medianDailyMove;
  const hitTakeProfit =
    params.useAym &&
    isFiniteNumber(targetPrice) &&
    isFiniteNumber(params.aymLimit) &&
    isFiniteNumber(bar.masterIndexAdjusted) &&
    bar.close >= targetPrice &&
    Number(bar.masterIndexAdjusted) < Number(params.aymLimit);
  const hitStop =
    params.useStoploss &&
    isFiniteNumber(params.stoplossLevel) &&
    isFiniteNumber(medianDailyMove) &&
    bar.close <= entryPrice * (1 - (Number(medianDailyMove) * Number(params.stoplossLevel)) / 100);
  const hitTrail =
    params.useAtr &&
    isFiniteNumber(params.atrDistance) &&
    isFiniteNumber(bar.atr14) &&
    bar.close <= highestPrice - Number(bar.atr14) * Number(params.atrDistance) &&
    bar.close > entryPrice;
  const hitStruct = params.useStructStop && isFiniteNumber(bar.structLow) && bar.close < Number(bar.structLow);

  if (hitStop) return { signal: "SELL_SL", reason: "SL", confidence: 0.5 };
  if (hitStruct) return { signal: "SELL_STRUCT", reason: "Crash Stop", confidence: 0.5 };
  if (hitTrail) return { signal: "SELL_TRAIL", reason: "Trail", confidence: 0.5 };
  if (hitTakeProfit) return { signal: "SELL_TP", reason: "AYM TP", confidence: 1 };
  return null;
}

function markToMarket(balance: number, entryPrice: number, close: number): number {
  const shares = Math.floor(balance / entryPrice);
  return shares * close + (balance - shares * entryPrice);
}

function computeBankerScore(close: number[], high: number[], low: number[]): Array<number | null> {
  const stochLow = rollingMin(low, 27);
  const stochHigh = rollingMax(high, 27);
  const stoch = close.map((value, i) => {
    const range = safeSub(stochHigh[i], stochLow[i]);
    return isFiniteNumber(range) && range !== 0 ? ((value - Number(stochLow[i])) / range) * 100 : 50;
  });
  const out1 = weightedSimpleAverage(stoch, 5, 1);
  const out2 = weightedSimpleAverage(out1, 3, 1);
  return out1.map((value, i) => {
    if (!isFiniteNumber(value) || !isFiniteNumber(out2[i])) return null;
    return clamp((3 * Number(value) - 2 * Number(out2[i]) - 50) * 1.032 + 50, 0, 100);
  });
}

function computeBollingerScore(values: number[], length: number, mult: number): Array<number | null> {
  const sma = simpleMovingAverage(values, length);
  return values.map((value, i) => {
    if (!isFiniteNumber(sma[i]) || i < length - 1) return null;
    let sumSquares = 0;
    for (let j = i - length + 1; j <= i; j += 1) {
      sumSquares += (values[j] - Number(sma[i])) ** 2;
    }
    const deviation = Math.sqrt(sumSquares / length);
    const upper = Number(sma[i]) + deviation * mult;
    const lower = Number(sma[i]) - deviation * mult;
    const diff = upper - lower;
    return diff !== 0 ? clamp(((value - lower) / diff) * 100, 0, 100) : 50;
  });
}

function computeMaScore(values: number[], fastLength: number, slowLength: number, normLength: number): Array<number | null> {
  const fast = simpleMovingAverage(values, fastLength);
  const slow = simpleMovingAverage(values, slowLength);
  const diff = values.map((_value, i) => {
    if (!isFiniteNumber(fast[i]) || !isFiniteNumber(slow[i])) return null;
    return Number(fast[i]) - Number(slow[i]);
  });
  const diffHigh = rollingMax(diff, normLength);
  const diffLow = rollingMin(diff, normLength);
  return diff.map((value, i) => {
    const range = safeSub(diffHigh[i], diffLow[i]);
    if (!isFiniteNumber(value) || !isFiniteNumber(range)) return null;
    return range !== 0 ? ((Number(value) - Number(diffLow[i])) / range) * 100 : 50;
  });
}

function computeRsi(values: number[], length: number): Array<number | null> {
  const gains = values.map((_value, i) => (i === 0 ? null : Math.max(values[i] - values[i - 1], 0)));
  const losses = values.map((_value, i) => (i === 0 ? null : Math.max(values[i - 1] - values[i], 0)));
  const avgGain = rma(gains, length);
  const avgLoss = rma(losses, length);
  return values.map((_value, i) => {
    if (!isFiniteNumber(avgGain[i]) || !isFiniteNumber(avgLoss[i])) return null;
    if (Number(avgLoss[i]) === 0 && Number(avgGain[i]) === 0) return 50;
    if (Number(avgLoss[i]) === 0) return 100;
    const rs = Number(avgGain[i]) / Number(avgLoss[i]);
    return 100 - 100 / (1 + rs);
  });
}

function computeDmiScore(high: number[], low: number[], close: number[], length: number): Array<number | null> {
  const tr = computeTrueRange(high, low, close);
  const plusDm = high.map((_value, i) => {
    if (i === 0) return null;
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    return upMove > downMove && upMove > 0 ? upMove : 0;
  });
  const minusDm = low.map((_value, i) => {
    if (i === 0) return null;
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    return downMove > upMove && downMove > 0 ? downMove : 0;
  });
  const trRma = rma(tr, length);
  const plusRma = rma(plusDm, length);
  const minusRma = rma(minusDm, length);
  return close.map((_value, i) => {
    if (!isFiniteNumber(trRma[i]) || Number(trRma[i]) === 0 || !isFiniteNumber(plusRma[i]) || !isFiniteNumber(minusRma[i])) return null;
    const diPlus = (100 * Number(plusRma[i])) / Number(trRma[i]);
    const diMinus = (100 * Number(minusRma[i])) / Number(trRma[i]);
    const sum = diPlus + diMinus;
    return sum !== 0 ? clamp(50 + ((diPlus - diMinus) / sum) * 50, 0, 100) : 50;
  });
}

function computeAtr(high: number[], low: number[], close: number[], length: number): Array<number | null> {
  return rma(computeTrueRange(high, low, close), length);
}

function computeTrueRange(high: number[], low: number[], close: number[]): Array<number | null> {
  return high.map((value, i) => {
    if (i === 0) return value - low[i];
    return Math.max(value - low[i], Math.abs(value - close[i - 1]), Math.abs(low[i] - close[i - 1]));
  });
}

function computeSupertrend(
  high: number[],
  low: number[],
  close: number[],
  atr: Array<number | null>,
  factor: number,
): { value: Array<number | null>; direction: Array<number | null> } {
  const value: Array<number | null> = Array(high.length).fill(null);
  const direction: Array<number | null> = Array(high.length).fill(null);
  const finalUpper: Array<number | null> = Array(high.length).fill(null);
  const finalLower: Array<number | null> = Array(high.length).fill(null);

  for (let i = 0; i < high.length; i += 1) {
    if (!isFiniteNumber(atr[i])) continue;
    const hl2 = (high[i] + low[i]) / 2;
    const basicUpper = hl2 + factor * Number(atr[i]);
    const basicLower = hl2 - factor * Number(atr[i]);

    if (i === 0 || !isFiniteNumber(finalUpper[i - 1]) || !isFiniteNumber(finalLower[i - 1]) || !isFiniteNumber(value[i - 1])) {
      finalUpper[i] = basicUpper;
      finalLower[i] = basicLower;
      value[i] = basicUpper;
      direction[i] = 1;
      continue;
    }

    finalUpper[i] = basicUpper < Number(finalUpper[i - 1]) || close[i - 1] > Number(finalUpper[i - 1]) ? basicUpper : finalUpper[i - 1];
    finalLower[i] = basicLower > Number(finalLower[i - 1]) || close[i - 1] < Number(finalLower[i - 1]) ? basicLower : finalLower[i - 1];

    if (Number(value[i - 1]) === Number(finalUpper[i - 1])) {
      if (close[i] <= Number(finalUpper[i])) {
        value[i] = finalUpper[i];
        direction[i] = 1;
      } else {
        value[i] = finalLower[i];
        direction[i] = -1;
      }
    } else if (close[i] >= Number(finalLower[i])) {
      value[i] = finalLower[i];
      direction[i] = -1;
    } else {
      value[i] = finalUpper[i];
      direction[i] = 1;
    }
  }

  return { value, direction };
}

function simpleMovingAverage(values: Array<number | null>, length: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  let sum = 0;
  let validCount = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (isFiniteNumber(values[i])) {
      sum += Number(values[i]);
      validCount += 1;
    }
    if (i >= length && isFiniteNumber(values[i - length])) {
      sum -= Number(values[i - length]);
      validCount -= 1;
    }
    if (i >= length - 1 && validCount === length) result[i] = sum / length;
  }
  return result;
}

function rma(values: Array<number | null>, length: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  let seedSum = 0;
  let seedCount = 0;
  let previous: number | null = null;

  for (let i = 0; i < values.length; i += 1) {
    if (!isFiniteNumber(values[i])) continue;
    const value = Number(values[i]);
    if (previous === null) {
      seedSum += value;
      seedCount += 1;
      if (seedCount === length) {
        previous = seedSum / length;
        result[i] = previous;
      }
    } else {
      previous = (previous * (length - 1) + value) / length;
      result[i] = previous;
    }
  }

  return result;
}

function weightedSimpleAverage(values: Array<number | null>, length: number, weight: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  let sumFloat: number | null = null;

  for (let i = 0; i < values.length; i += 1) {
    if (!isFiniteNumber(values[i])) {
      sumFloat = null;
      continue;
    }
    const previousSum: number = sumFloat === null ? 0 : sumFloat;
    const oldValue = i >= length && isFiniteNumber(values[i - length]) ? Number(values[i - length]) : 0;
    sumFloat = previousSum - oldValue + Number(values[i]);
    const movingAverage = i >= length && isFiniteNumber(values[i - length]) ? sumFloat / length : null;
    const previousOutput = i > 0 ? result[i - 1] : null;
    result[i] = previousOutput === null ? movingAverage : (Number(values[i]) * weight + previousOutput * (length - weight)) / length;
  }

  return result;
}

function dynamicEma(values: Array<number | null>, length: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  const alpha = 2 / (length + 1);
  let previous: number | null = null;
  for (let i = 0; i < values.length; i += 1) {
    if (!isFiniteNumber(values[i])) continue;
    previous = previous === null ? Number(values[i]) : alpha * Number(values[i]) + (1 - alpha) * previous;
    result[i] = previous;
  }
  return result;
}

function rollingMax(values: Array<number | null>, length: number): Array<number | null> {
  return rollingExtreme(values, length, Math.max);
}

function rollingMin(values: Array<number | null>, length: number): Array<number | null> {
  return rollingExtreme(values, length, Math.min);
}

function rollingExtreme(
  values: Array<number | null>,
  length: number,
  reducer: (left: number, right: number) => number,
): Array<number | null> {
  return values.map((_value, i) => {
    if (i < length - 1) return null;
    let extreme: number | null = null;
    for (let j = i - length + 1; j <= i; j += 1) {
      if (!isFiniteNumber(values[j])) return null;
      extreme = extreme === null ? Number(values[j]) : reducer(extreme, Number(values[j]));
    }
    return extreme;
  });
}

function rollingMedian(values: Array<number | null>, length: number): Array<number | null> {
  return values.map((_value, i) => {
    if (i < length - 1) return null;
    const window: number[] = [];
    for (let j = i - length + 1; j <= i; j += 1) {
      if (!isFiniteNumber(values[j])) return null;
      window.push(Number(values[j]));
    }
    window.sort((a, b) => a - b);
    const mid = Math.floor(window.length / 2);
    return window.length % 2 === 0 ? (window[mid - 1] + window[mid]) / 2 : window[mid];
  });
}

function safeSub(left: number | null, right: number | null): number | null {
  return isFiniteNumber(left) && isFiniteNumber(right) ? Number(left) - Number(right) : null;
}

function nullable(value: number | null): number | null {
  return isFiniteNumber(value) ? Number(value) : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "0.00";
}
