import {
  rollingMax,
  rollingMin,
  computeRsi,
  computeBankerScore,
  computeBollingerScore,
  computeAtr,
  computeSupertrend,
  computeDmiScore,
  computeMaScore,
  safeSub,
  clamp as psiClamp,
  isFiniteNumber
} from '@/strategies/PSI/psi8Indicators';
import type { PriceBar } from '@/strategies/PSI/psiStrategy';

/**
 * Thoth PSI-8 Macro V3.7 feature extractor.
 *
 * Core architecture:
 *   1) 8 PSI components with TradingView weights (sum=96).
 *   2) Double smoothing: EMA(3) across both BUY and SELL streams.
 *   3) Lookback Synthesis Architecture:
 *        - UP   / LONG->CASH exit model: 21-bar sequence lookback (1 trading month, rapid exit tracking)
 *        - DOWN / CASH->LONG entry model: 126-bar sequence lookback (6 months, balanced accumulation context)
 *   4) Causal EGX Tradability Eligibility Overlay.
 *   5) Direction-linked short-horizon memory dynamically scaled to sequence context (L / 8):
 *        - UP lag horizon   = 3 bars   (round(21 / 8))
 *        - DOWN lag horizon = 16 bars  (round(126 / 8))
 *      delta_velocity is normalized to PSI points per bar.
 *   6) Two calibrated historical-delta features are appended by the V3.7 dataset/live layer:
 *        - delta_percentile
 *        - reversal_hazard_next_bar
 */

export interface ThothBarFeatures {
  date: string;
  ticker?: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  direction: 'up' | 'down';
  // extractThothFeatures() emits the 18 core values. V3.7 dataset/live code appends
  // the two historical-delta calibration features with enrichThothV37Features().
  featuresDown: number[]; // EMA(3), DOWN 18-core-feature order before enrichment
  featuresUp: number[];   // EMA(3), UP 18-core-feature order before enrichment
}

export const THOTH_LAG_BARS = {
  down: 16,
  up: 3,
} as const;

export const THOTH_CORE_FEATURE_NAMES_DOWN = [
  'delta_to_red', 'delta_to_green', 'momentum', 'curr_is_bullish',
  'last_red_is_bullish', 'last_green_is_bullish',
  'bars_since_red', 'bars_since_green',
  'swing_roi_up', 'swing_roi_down',
  'roi_median_multiple_up', 'roi_median_multiple_down',
  'delta_to_red_lag16', 'momentum_lag16', 'delta_velocity_16_per_bar',
  'psi_index_value',
  'volume_ratio', 'cumulative_volume_ratio'
] as const;

export const THOTH_CORE_FEATURE_NAMES_UP = [
  'delta_to_red', 'delta_to_green', 'momentum', 'curr_is_bullish',
  'last_red_is_bullish', 'last_green_is_bullish',
  'bars_since_red', 'bars_since_green',
  'swing_roi_up', 'swing_roi_down',
  'roi_median_multiple_up', 'roi_median_multiple_down',
  'delta_to_red_lag3', 'momentum_lag3', 'delta_velocity_3_per_bar',
  'psi_index_value',
  'volume_ratio', 'cumulative_volume_ratio'
] as const;

export const THOTH_FEATURE_NAMES_DOWN = [
  ...THOTH_CORE_FEATURE_NAMES_DOWN,
  'delta_percentile',
  'reversal_hazard_next_bar',
] as const;

export const THOTH_FEATURE_NAMES_UP = [
  ...THOTH_CORE_FEATURE_NAMES_UP,
  'delta_percentile',
  'reversal_hazard_next_bar',
] as const;

export const THOTH_CORE_FEATURE_COUNT = 18;
export const THOTH_FEATURE_COUNT = 20;

export type ThothV37Direction = 'up' | 'down';

export interface ThothV37HazardBin {
  index: number;
  lo: number;
  hi: number;
  count: number;
  successes: number;
  hazard: number; // 0..100
}

export interface ThothV37DirectionalCalibration {
  terminal_deltas_sorted: number[];
  terminal_swing_count: number;
  hazard_bin_min: number;
  hazard_bin_max: number;
  hazard_bin_width: number;
  hazard_prior_strength: number;
  global_hazard: number; // 0..100
  hazard_bins: ThothV37HazardBin[];
}

export interface ThothV37DeltaCalibration {
  version: string;
  training_cutoff: string;
  hazard_event: string;
  percentile_semantics: string;
  down: ThothV37DirectionalCalibration;
  up: ThothV37DirectionalCalibration;
}

/**
 * V3.7 directional PSI travel from the most recent confirmed pivot.
 *
 * DOWN maturity: last RED PSI - current PSI = -delta_to_red.
 * UP maturity:   current PSI - last GREEN PSI = delta_to_green.
 *
 * Core feature order is unchanged from V3.4-V3.6, so indices 0 and 1 remain stable.
 */
export function directionalDeltaFromCoreFeatures(
  coreFeatures: number[],
  direction: ThothV37Direction
): number {
  if (!Array.isArray(coreFeatures) || coreFeatures.length < THOTH_CORE_FEATURE_COUNT) {
    throw new Error(`Expected at least ${THOTH_CORE_FEATURE_COUNT} core Thoth features.`);
  }
  const delta = direction === 'down' ? -Number(coreFeatures[0]) : Number(coreFeatures[1]);
  if (!Number.isFinite(delta)) throw new Error(`Non-finite ${direction} directional delta.`);
  return clamp(delta, -100, 100);
}

function upperBound(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Empirical plotting-position CDF. The +0.5/(n+1) convention keeps finite samples
 * away from pathological exact 0/100 endpoints and yields 50 when no history exists.
 */
export function historicalDeltaPercentile(
  directionalDelta: number,
  terminalDeltasSorted: number[]
): number {
  const vals = terminalDeltasSorted.filter(Number.isFinite);
  if (vals.length === 0) return 50.0;
  // The builder writes sorted arrays. Sorting defensively here keeps production robust.
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] < vals[i - 1]) {
      vals.sort((a, b) => a - b);
      break;
    }
  }
  const rank = upperBound(vals, directionalDelta);
  return clamp(((rank + 0.5) / (vals.length + 1.0)) * 100.0, 0, 100);
}

export function reversalHazardNextBar(
  directionalDelta: number,
  calibration: ThothV37DirectionalCalibration
): number {
  const lo = Number(calibration.hazard_bin_min);
  const hi = Number(calibration.hazard_bin_max);
  const width = Number(calibration.hazard_bin_width);
  const fallback = clamp(Number(calibration.global_hazard), 0, 100);
  if (!(width > 0) || !(hi > lo) || !Array.isArray(calibration.hazard_bins)) return fallback;

  const nBins = Math.max(1, Math.ceil((hi - lo) / width));
  const clipped = clamp(directionalDelta, lo, hi);
  const rawIdx = Math.floor((clipped - lo) / width);
  const idx = clamp(rawIdx, 0, nBins - 1);
  const bin = calibration.hazard_bins.find(b => b.index === idx);
  return bin && Number.isFinite(bin.hazard)
    ? clamp(Number(bin.hazard), 0, 100)
    : fallback;
}

/**
 * Append the two V3.7 calibrated features to one 18-feature directional view.
 * The calibration must be built from information available no later than its declared
 * training_cutoff. Validation/test/live callers must not fit or mutate it using future data.
 */
export function enrichThothV37Features(
  coreFeatures: number[],
  direction: ThothV37Direction,
  calibration: ThothV37DeltaCalibration
): number[] {
  if (coreFeatures.length !== THOTH_CORE_FEATURE_COUNT) {
    throw new Error(
      `V3.7 enrichment requires exactly ${THOTH_CORE_FEATURE_COUNT} core features, got ${coreFeatures.length}.`
    );
  }
  const directional = calibration[direction];
  if (!directional) throw new Error(`Missing ${direction} V3.7 delta calibration.`);
  const delta = directionalDeltaFromCoreFeatures(coreFeatures, direction);
  const percentile = historicalDeltaPercentile(delta, directional.terminal_deltas_sorted);
  const reversalHazard = reversalHazardNextBar(delta, directional);
  const out = [...coreFeatures, percentile, reversalHazard];
  if (out.length !== THOTH_FEATURE_COUNT || out.some(x => !Number.isFinite(x))) {
    throw new Error('Invalid V3.7 enriched feature vector.');
  }
  return out;
}

export const THOTH_PSI8_V32_WEIGHTS = {
  normalized_range_14: 15,
  supertrend_distance: 47,
  rsi_14: 10,
  banker_accumulation: 5,
  dmi_adx_directional_strength: 10,
  bollinger_percent_b: 4,
  ma_50_200_convergence: 4,
  atr_normalized_slope_14: 1,
} as const;

export const THOTH_PSI8_V32_SMOOTHING = {
  down: 3,
  up: 3,
} as const;

const WEIGHT_SUM = 96.0;
const ROI_MEDIAN_MULTIPLE_CAP = 100;
const SWING_ROI_CAP = 50;
const DEFAULT_SWING_THRESHOLD = 0.05;
const SWING_THRESHOLD_MIN = 0.02;
const SWING_THRESHOLD_MAX = 0.08;
const SWING_THRESHOLD_WINDOW = 252;
const SWING_THRESHOLD_MIN_OBS = 20;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function finiteOr(x: number, fallback: number): number {
  return Number.isFinite(x) ? x : fallback;
}

function insertSorted(arr: number[], val: number): void {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (arr[mid] < val) low = mid + 1;
    else high = mid;
  }
  arr.splice(low, 0, val);
}

function removeSorted(arr: number[], val: number): void {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (arr[mid] < val) low = mid + 1;
    else high = mid;
  }
  if (low < arr.length && arr[low] === val) arr.splice(low, 1);
}

function p75(sorted: number[]): number {
  if (sorted.length === 0) return DEFAULT_SWING_THRESHOLD;
  const idx = Math.min(sorted.length - 1, Math.floor(0.75 * (sorted.length - 1)));
  return sorted[idx];
}

function trueRangeRatio(curr: PriceBar, prev: PriceBar): number | null {
  if (!(prev.close > 0)) return null;
  const tr = Math.max(
    curr.high - curr.low,
    Math.abs(curr.high - prev.close),
    Math.abs(curr.low - prev.close)
  );
  const ratio = tr / prev.close;
  return Number.isFinite(ratio) && ratio >= 0 ? ratio : null;
}

export function computeCausalSwingThresholds(
  bars: PriceBar[],
  window: number = SWING_THRESHOLD_WINDOW,
  minObs: number = SWING_THRESHOLD_MIN_OBS
): number[] {
  if (!bars || bars.length === 0) return [];
  const thresholds = new Array<number>(bars.length).fill(DEFAULT_SWING_THRESHOLD);
  const queue: number[] = [];
  const sorted: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const magnitude = trueRangeRatio(bars[i], bars[i - 1]);
    if (magnitude !== null) {
      queue.push(magnitude);
      insertSorted(sorted, magnitude);
      if (queue.length > window) {
        const removed = queue.shift()!;
        removeSorted(sorted, removed);
      }
    }
    thresholds[i] = sorted.length >= minObs
      ? clamp(p75(sorted), SWING_THRESHOLD_MIN, SWING_THRESHOLD_MAX)
      : DEFAULT_SWING_THRESHOLD;
  }
  return thresholds;
}

export function computeSwingThreshold(bars: PriceBar[]): number {
  const thresholds = computeCausalSwingThresholds(bars);
  return thresholds.length ? thresholds[thresholds.length - 1] : DEFAULT_SWING_THRESHOLD;
}

function computeEma(values: Array<number | null>, length: number): Array<number | null> {
  const alpha = 2 / (length + 1);
  const out: Array<number | null> = new Array(values.length).fill(null);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!isFiniteNumber(v)) continue;
    prev = prev === null ? Number(v) : alpha * Number(v) + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

/**
 * 8 component definitions with TV weights (sum=96).
 * Null warm-up is neutralized to 50 AFTER EMA calculation, preserving true chronology.
 */
export function computePsi8V32(
  close: number[],
  high: number[],
  low: number[]
): {
  rawIndex: Array<number | null>;
  buyIndex: number[];
  sellIndex: number[];
  atr14: Array<number | null>;
} {
  if (close.length !== high.length || close.length !== low.length) {
    throw new Error('PSI-8 V3.2 arrays must have identical lengths.');
  }

  const normHigh = rollingMax(close, 14);
  const normLow = rollingMin(close, 14);
  const normPrice = close.map((value, i) => {
    const range = safeSub(normHigh[i], normLow[i]);
    return isFiniteNumber(range) && Number(range) !== 0
      ? ((value - Number(normLow[i])) / Number(range)) * 100
      : 50;
  });

  const rsi = computeRsi(close, 14);
  const banker = computeBankerScore(close, high, low);
  const bbScore = computeBollingerScore(close, 14, 2);
  const atr14 = computeAtr(high, low, close, 14);
  const supertrend = computeSupertrend(high, low, close, atr14, 3);

  const stScore = close.map((value, i) => {
    const atr = atr14[i];
    const stVal = supertrend.value[i];
    if (!isFiniteNumber(atr) || !isFiniteNumber(stVal) || Number(atr) <= 0) return null;
    return psiClamp(50 + ((value - Number(stVal)) / (Number(atr) * 3)) * 50, 0, 100);
  });

  const adxScore = computeDmiScore(high, low, close, 14);
  const maScore = computeMaScore(close, 50, 200, 14);

  const slopeScore = close.map((value, i) => {
    const atr = atr14[i];
    if (i < 14 || !isFiniteNumber(atr) || Number(atr) <= 0) return null;
    const rawSlope = (value - close[i - 14]) / (Number(atr) * 14);
    const angle = (Math.atan(rawSlope) * 180) / Math.PI;
    return psiClamp(((angle + 90) / 180) * 100, 0, 100);
  });

  const rawIndex = close.map((_value, i) => {
    const components = [
      normPrice[i], stScore[i], rsi[i], banker[i], adxScore[i],
      bbScore[i], maScore[i], slopeScore[i]
    ];
    if (components.some(v => !isFiniteNumber(v))) return null;

    const weightedSum =
      Number(normPrice[i]) * 15 +
      Number(stScore[i]) * 47 +
      Number(rsi[i]) * 10 +
      Number(banker[i]) * 5 +
      Number(adxScore[i]) * 10 +
      Number(bbScore[i]) * 4 +
      Number(maScore[i]) * 4 +
      Number(slopeScore[i]) * 1;

    const out = weightedSum / WEIGHT_SUM;
    if (!Number.isFinite(out) || out < 0 || out > 100) {
      throw new Error(`PSI-8 V3.2 raw index out of [0,100] at bar ${i}: ${out}`);
    }
    return out;
  });

  // Warm-up nulls are allowed only before the first fully-defined composite.
  let seenValidRaw = false;
  for (let i = 0; i < rawIndex.length; i++) {
    if (isFiniteNumber(rawIndex[i])) {
      seenValidRaw = true;
    } else if (seenValidRaw) {
      throw new Error(`PSI-8 V3.2 composite became non-finite after warm-up at bar ${i}.`);
    }
  }

  const buyRaw = computeEma(rawIndex, 3);
  const sellRaw = computeEma(rawIndex, 3);
  const buyIndex = buyRaw.map(v => isFiniteNumber(v) ? Number(v) : 50.0);
  const sellIndex = sellRaw.map(v => isFiniteNumber(v) ? Number(v) : 50.0);

  return { rawIndex, buyIndex, sellIndex, atr14 };
}

type StreamState = {
  lastRedIndex: number | null;
  lastGreenIndex: number | null;
  deltaToRedBuffer: number[];
  momentumBuffer: number[];
};

function buildStreamFeatures(
  currIndex: number,
  prevIndex: number,
  stream: StreamState,
  lagBars: number,
  common: {
    currIsBullish: number;
    lastRedIsBullish: number;
    lastGreenIsBullish: number;
    barsSinceRed: number;
    barsSinceGreen: number;
    swingRoiUp: number;
    swingRoiDown: number;
    roiMedianMultipleUp: number;
    roiMedianMultipleDown: number;
    volumeRatio: number;
    cumulativeVolumeRatio: number;
  }
): number[] {
  const deltaToRed = stream.lastRedIndex !== null ? currIndex - stream.lastRedIndex : 0;
  const deltaToGreen = stream.lastGreenIndex !== null ? currIndex - stream.lastGreenIndex : 0;
  const momentum = currIndex - prevIndex;

  if (!Number.isInteger(lagBars) || lagBars <= 0) {
    throw new Error(`lagBars must be a positive integer, got ${lagBars}.`);
  }
  const required = lagBars + 1;
  stream.deltaToRedBuffer.push(deltaToRed);
  if (stream.deltaToRedBuffer.length > required) stream.deltaToRedBuffer.shift();
  stream.momentumBuffer.push(momentum);
  if (stream.momentumBuffer.length > required) stream.momentumBuffer.shift();

  const deltaToRedLag = stream.deltaToRedBuffer.length >= required
    ? stream.deltaToRedBuffer[0]
    : deltaToRed;
  const momentumLag = stream.momentumBuffer.length >= required
    ? stream.momentumBuffer[0]
    : momentum;
  const deltaVelocityPerBar = (deltaToRed - deltaToRedLag) / lagBars;

  const vector = [
    deltaToRed,
    deltaToGreen,
    momentum,
    common.currIsBullish,
    common.lastRedIsBullish,
    common.lastGreenIsBullish,
    common.barsSinceRed,
    common.barsSinceGreen,
    common.swingRoiUp,
    common.swingRoiDown,
    common.roiMedianMultipleUp,
    common.roiMedianMultipleDown,
    deltaToRedLag,
    momentumLag,
    deltaVelocityPerBar,
    currIndex,
    common.volumeRatio,
    common.cumulativeVolumeRatio,
  ];

  for (let j = 0; j < vector.length; j++) {
    if (!Number.isFinite(vector[j])) throw new Error(`Non-finite Thoth feature ${j}.`);
  }
  return vector;
}

export function extractThothFeatures(bars: PriceBar[]): ThothBarFeatures[] {
  if (!bars || bars.length === 0) return [];

  const sortedBars = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < sortedBars.length; i++) {
    const b = sortedBars[i];
    if (!b.date || !Number.isFinite(b.open) || !Number.isFinite(b.high) ||
        !Number.isFinite(b.low) || !Number.isFinite(b.close) || !(b.close > 0)) {
      throw new Error(`Invalid OHLC bar at index ${i}.`);
    }
    if (i > 0 && sortedBars[i - 1].date === b.date) {
      throw new Error(`Duplicate bar date detected: ${b.date}`);
    }
  }

  const closes = sortedBars.map(b => b.close);
  const highs = sortedBars.map(b => b.high);
  const lows = sortedBars.map(b => b.low);
  const { buyIndex, sellIndex } = computePsi8V32(closes, highs, lows);
  const thresholds = computeCausalSwingThresholds(sortedBars);

  const volumePrefix = new Array<number>(sortedBars.length + 1).fill(0);
  for (let i = 0; i < sortedBars.length; i++) {
    const v = Math.max(0, finiteOr(sortedBars[i].volume || 0, 0));
    volumePrefix[i + 1] = volumePrefix[i] + v;
  }

  let state: 1 | -1 = 1;
  let extremumIndex = 0;
  let extremumPrice = sortedBars[0].close;
  let lastConfirmedRedBarIdx: number | null = null;
  let lastConfirmedGreenBarIdx: number | null = null;
  let lastConfirmedRedIsBullish: number | null = null;
  let lastConfirmedGreenIsBullish: number | null = null;
  let swingStartBarIdx = 0;

  const downStream: StreamState = {
    lastRedIndex: null,
    lastGreenIndex: null,
    deltaToRedBuffer: [],
    momentumBuffer: [],
  };
  const upStream: StreamState = {
    lastRedIndex: null,
    lastGreenIndex: null,
    deltaToRedBuffer: [],
    momentumBuffer: [],
  };

  const dailyMoves: number[] = [];
  const sortedDailyMoves: number[] = [];
  const volumeBuffer: number[] = [];
  const results: ThothBarFeatures[] = [];

  for (let i = 0; i < sortedBars.length; i++) {
    const bar = sortedBars[i];
    const price = bar.close;

    if (i > 0) {
      const dailyMovePct = bar.open > 0
        ? (Math.abs(bar.close - bar.open) / bar.open) * 100
        : 0;
      const move = finiteOr(dailyMovePct, 0);
      dailyMoves.push(move);
      insertSorted(sortedDailyMoves, move);
      if (dailyMoves.length > 64) {
        const removed = dailyMoves.shift()!;
        removeSorted(sortedDailyMoves, removed);
      }
    }

    const currentVolume = Math.max(0, finiteOr(bar.volume || 0, 0));
    volumeBuffer.push(currentVolume);
    if (volumeBuffer.length > 20) volumeBuffer.shift();

    if (i > 0) {
      const threshold = thresholds[i];
      if (state === 1) {
        if (price > extremumPrice) {
          extremumPrice = price;
          extremumIndex = i;
        } else if (price < extremumPrice * (1.0 - threshold)) {
          // UP -> DOWN confirms running maximum as RED peak.
          lastConfirmedRedBarIdx = extremumIndex;
          lastConfirmedRedIsBullish =
            sortedBars[extremumIndex].close >= sortedBars[extremumIndex].open ? 1 : 0;
          downStream.lastRedIndex = buyIndex[extremumIndex];
          upStream.lastRedIndex = sellIndex[extremumIndex];
          swingStartBarIdx = extremumIndex;
          state = -1;
          extremumIndex = i;
          extremumPrice = price;
        }
      } else {
        if (price < extremumPrice) {
          extremumPrice = price;
          extremumIndex = i;
        } else if (price > extremumPrice * (1.0 + threshold)) {
          // DOWN -> UP confirms running minimum as GREEN trough.
          lastConfirmedGreenBarIdx = extremumIndex;
          lastConfirmedGreenIsBullish =
            sortedBars[extremumIndex].close >= sortedBars[extremumIndex].open ? 1 : 0;
          downStream.lastGreenIndex = buyIndex[extremumIndex];
          upStream.lastGreenIndex = sellIndex[extremumIndex];
          swingStartBarIdx = extremumIndex;
          state = 1;
          extremumIndex = i;
          extremumPrice = price;
        }
      }
    }

    const currIsBullish = bar.close >= bar.open ? 1 : 0;
    const lastRedIsBullish = lastConfirmedRedIsBullish ?? 0;
    const lastGreenIsBullish = lastConfirmedGreenIsBullish ?? 0;
    const barsSinceRed = lastConfirmedRedBarIdx !== null ? i - lastConfirmedRedBarIdx : 0;
    const barsSinceGreen = lastConfirmedGreenBarIdx !== null ? i - lastConfirmedGreenBarIdx : 0;

    let swingRoiUp = 0;
    let swingRoiDown = 0;
    if (lastConfirmedGreenBarIdx !== null) {
      const greenClose = sortedBars[lastConfirmedGreenBarIdx].close;
      swingRoiUp = greenClose > 0 ? ((bar.close - greenClose) / greenClose) * 100 : 0;
      swingRoiUp = clamp(finiteOr(swingRoiUp, 0), -SWING_ROI_CAP, SWING_ROI_CAP);
    }
    if (lastConfirmedRedBarIdx !== null) {
      const redClose = sortedBars[lastConfirmedRedBarIdx].close;
      swingRoiDown = redClose > 0 ? ((redClose - bar.close) / redClose) * 100 : 0;
      swingRoiDown = clamp(finiteOr(swingRoiDown, 0), -SWING_ROI_CAP, SWING_ROI_CAP);
    }

    const medianMove = sortedDailyMoves.length > 0
      ? sortedDailyMoves[Math.floor(sortedDailyMoves.length / 2)]
      : 1.0;
    const safeMedian = Math.max(finiteOr(medianMove, 1.0), 0.0001);
    const roiMedianMultipleUp = clamp(
      finiteOr(swingRoiUp / safeMedian, 0),
      -ROI_MEDIAN_MULTIPLE_CAP,
      ROI_MEDIAN_MULTIPLE_CAP
    );
    const roiMedianMultipleDown = clamp(
      finiteOr(swingRoiDown / safeMedian, 0),
      -ROI_MEDIAN_MULTIPLE_CAP,
      ROI_MEDIAN_MULTIPLE_CAP
    );

    const avgVol20 = volumeBuffer.length > 0
      ? volumeBuffer.reduce((a, b) => a + b, 0) / volumeBuffer.length
      : 0;
    const volumeRatio = avgVol20 > 0 ? currentVolume / avgVol20 : 1.0;

    const effectiveSwingStart = clamp(swingStartBarIdx, 0, i);
    const barsInCurrentSwing = Math.max(1, i - effectiveSwingStart + 1);
    const cumulativeVolumeSinceSwing = volumePrefix[i + 1] - volumePrefix[effectiveSwingStart];
    const expectedCumulativeVol = avgVol20 * barsInCurrentSwing;
    const cumulativeVolumeRatio = expectedCumulativeVol > 0
      ? cumulativeVolumeSinceSwing / expectedCumulativeVol
      : 1.0;

    const common = {
      currIsBullish,
      lastRedIsBullish,
      lastGreenIsBullish,
      barsSinceRed,
      barsSinceGreen,
      swingRoiUp,
      swingRoiDown,
      roiMedianMultipleUp,
      roiMedianMultipleDown,
      volumeRatio: finiteOr(volumeRatio, 1.0),
      cumulativeVolumeRatio: finiteOr(cumulativeVolumeRatio, 1.0),
    };

    const featuresDown = buildStreamFeatures(
      buyIndex[i],
      i > 0 ? buyIndex[i - 1] : buyIndex[i],
      downStream,
      THOTH_LAG_BARS.down,
      common
    );
    const featuresUp = buildStreamFeatures(
      sellIndex[i],
      i > 0 ? sellIndex[i - 1] : sellIndex[i],
      upStream,
      THOTH_LAG_BARS.up,
      common
    );

    results.push({
      date: bar.date,
      close: bar.close,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      volume: currentVolume,
      direction: state === 1 ? 'up' : 'down',
      featuresDown,
      featuresUp,
    });
  }

  return results;
}

export const extractThothPsi8Features = extractThothFeatures;
export const THOTH_PSI8_V37_WEIGHTS = THOTH_PSI8_V32_WEIGHTS;
export const THOTH_PSI8_V37_SMOOTHING = THOTH_PSI8_V32_SMOOTHING;
export const computePsi8V37 = computePsi8V32;
