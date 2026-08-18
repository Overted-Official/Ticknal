import { computePsi40 } from '../PSI/psi40Indicators';
import { dynamicEma } from '../PSI/psi8Indicators';
import type { PriceBar } from '../PSI/psiStrategy';

export interface ThothBarFeatures {
  date: string;
  ticker?: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  direction: 'up' | 'down';
  features: number[]; // Exact 18 float values
}

export const THOTH_FEATURE_NAMES = [
  'delta_to_red', 'delta_to_green', 'momentum', 'curr_is_bullish', 
  'last_red_is_bullish', 'last_green_is_bullish', 
  'bars_since_red', 'bars_since_green', 
  'swing_roi_up', 'swing_roi_down', 
  'roi_median_multiple_up', 'roi_median_multiple_down', 
  'delta_to_red_lag5', 'momentum_lag5', 'delta_velocity', 
  'psi_index_value', 
  'volume_ratio', 'cumulative_volume_ratio'
];

const ROI_MEDIAN_MULTIPLE_CAP = 100;
const SWING_ROI_CAP = 50;

export function computeSwingThreshold(bars: PriceBar[]): number {
  if (bars.length < 2) return 0.05;
  const magnitudes: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prevClose = bars[i - 1].close;
    if (prevClose === 0) continue;
    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - prevClose);
    const lc = Math.abs(bars[i].low - prevClose);
    const tr = Math.max(hl, hc, lc);
    magnitudes.push(tr / prevClose);
  }
  if (magnitudes.length === 0) return 0.05;
  magnitudes.sort((a, b) => a - b);
  const p75 = Math.floor(magnitudes.length * 0.75);
  return Math.max(0.02, Math.min(0.08, magnitudes[p75]));
}

function insertSorted(arr: number[], val: number) {
  let low = 0, high = arr.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (arr[mid] < val) low = mid + 1;
    else high = mid;
  }
  arr.splice(low, 0, val);
}

function removeSorted(arr: number[], val: number) {
  let low = 0, high = arr.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (arr[mid] < val) low = mid + 1;
    else high = mid;
  }
  if (low < arr.length && arr[low] === val) {
    arr.splice(low, 1);
  }
}

/**
 * Extracts the 18 continuous PSI-40 feature channels using adaptive price swings.
 */
export function extractThothFeatures(bars: PriceBar[]): ThothBarFeatures[] {
  if (!bars || bars.length === 0) return [];

  const sortedBars = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  
  // 1. Compute PSI-40 Indicator
  const rawIndex40 = computePsi40(sortedBars);
  const masterIndex40 = dynamicEma(rawIndex40, 1);

  const results: ThothBarFeatures[] = [];
  const threshold = computeSwingThreshold(sortedBars);

  let state = 1;
  let extremumIndex = 0;
  let extremumPrice = sortedBars[0].close;

  let lastConfirmedRedIndex: number | null = null;
  let lastConfirmedGreenIndex: number | null = null;
  let lastConfirmedRedIsBullish: number | null = null;
  let lastConfirmedGreenIsBullish: number | null = null;
  let lastConfirmedRedBarIdx: number | null = null;
  let lastConfirmedGreenBarIdx: number | null = null;

  const dailyMoves: number[] = [];
  const sortedDailyMoves: number[] = [];
  const deltaToRedBuffer: number[] = [];
  const momentumBuffer: number[] = [];
  const volumeBuffer: number[] = [];
  let swingStartBarIdx = 0;
  let cumulativeVolumeSinceSwing = 0;

  for (let i = 0; i < sortedBars.length; i++) {
    const bar = sortedBars[i];
    const price = bar.close;

    if (i > 0) {
      const dailyMovePct = bar.open > 0 ? (Math.abs(bar.close - bar.open) / bar.open) * 100 : 0;
      dailyMoves.push(dailyMovePct);
      insertSorted(sortedDailyMoves, dailyMovePct);

      if (dailyMoves.length > 64) {
        const removed = dailyMoves.shift()!;
        removeSorted(sortedDailyMoves, removed);
      }
    }

    volumeBuffer.push(bar.volume || 0);
    if (volumeBuffer.length > 20) {
      volumeBuffer.shift();
    }

    // Adaptive Price Swing State Machine
    if (i > 0) {
      if (state === 1) {
        if (price > extremumPrice) {
          extremumPrice = price;
          extremumIndex = i;
        } else if (price < extremumPrice * (1.0 - threshold)) {
          lastConfirmedGreenIndex = masterIndex40[extremumIndex] ?? 50.0;
          lastConfirmedGreenIsBullish = sortedBars[extremumIndex].close >= sortedBars[extremumIndex].open ? 1 : 0;
          lastConfirmedGreenBarIdx = extremumIndex;
          swingStartBarIdx = extremumIndex;
          cumulativeVolumeSinceSwing = 0;
          state = -1;
          extremumIndex = i;
          extremumPrice = price;
        }
      } else {
        if (price < extremumPrice) {
          extremumPrice = price;
          extremumIndex = i;
        } else if (price > extremumPrice * (1.0 + threshold)) {
          lastConfirmedRedIndex = masterIndex40[extremumIndex] ?? 50.0;
          lastConfirmedRedIsBullish = sortedBars[extremumIndex].close >= sortedBars[extremumIndex].open ? 1 : 0;
          lastConfirmedRedBarIdx = extremumIndex;
          swingStartBarIdx = extremumIndex;
          cumulativeVolumeSinceSwing = 0;
          state = 1;
          extremumIndex = i;
          extremumPrice = price;
        }
      }
    }

    cumulativeVolumeSinceSwing += (bar.volume || 0);

    const currIndex = masterIndex40[i] ?? 50.0;
    const prevIndex = i > 0 ? (masterIndex40[i - 1] ?? 50.0) : currIndex;

    let deltaToRed = 0;
    let deltaToGreen = 0;
    let momentum = (currIndex - prevIndex) / (Math.abs(prevIndex) + 0.0001) * 100;
    let currIsBullish = bar.close >= bar.open ? 1 : 0;
    let lastRedIsBull = lastConfirmedRedIsBullish ?? 0;
    let lastGreenIsBull = lastConfirmedGreenIsBullish ?? 0;
    let barsSinceRed = lastConfirmedRedBarIdx !== null ? i - lastConfirmedRedBarIdx : 0;
    let barsSinceGreen = lastConfirmedGreenBarIdx !== null ? i - lastConfirmedGreenBarIdx : 0;
    let swingRoiUp = 0;
    let swingRoiDown = 0;
    let roiMedianMultipleUp = 0;
    let roiMedianMultipleDown = 0;

    if (lastConfirmedRedIndex !== null) {
      deltaToRed = (currIndex - lastConfirmedRedIndex) / (Math.abs(lastConfirmedRedIndex) + 0.0001) * 100;
    }
    if (lastConfirmedGreenIndex !== null) {
      deltaToGreen = (currIndex - lastConfirmedGreenIndex) / (Math.abs(lastConfirmedGreenIndex) + 0.0001) * 100;
    }

    if (lastConfirmedGreenBarIdx !== null) {
      const greenClose = sortedBars[lastConfirmedGreenBarIdx].close;
      swingRoiUp = greenClose > 0 ? ((bar.close - greenClose) / greenClose) * 100 : 0;
      swingRoiUp = Math.max(-SWING_ROI_CAP, Math.min(SWING_ROI_CAP, swingRoiUp));
    }
    if (lastConfirmedRedBarIdx !== null) {
      const redClose = sortedBars[lastConfirmedRedBarIdx].close;
      swingRoiDown = redClose > 0 ? ((redClose - bar.close) / redClose) * 100 : 0;
      swingRoiDown = Math.max(-SWING_ROI_CAP, Math.min(SWING_ROI_CAP, swingRoiDown));
    }

    const medianMove = sortedDailyMoves.length > 0 ? sortedDailyMoves[Math.floor(sortedDailyMoves.length / 2)] : 1.0;
    const safeMedian = Math.max(medianMove, 0.0001);

    roiMedianMultipleUp = swingRoiUp / safeMedian;
    roiMedianMultipleUp = Math.max(-ROI_MEDIAN_MULTIPLE_CAP, Math.min(ROI_MEDIAN_MULTIPLE_CAP, roiMedianMultipleUp));

    roiMedianMultipleDown = swingRoiDown / safeMedian;
    roiMedianMultipleDown = Math.max(-ROI_MEDIAN_MULTIPLE_CAP, Math.min(ROI_MEDIAN_MULTIPLE_CAP, roiMedianMultipleDown));

    deltaToRedBuffer.push(deltaToRed);
    if (deltaToRedBuffer.length > 6) deltaToRedBuffer.shift();

    momentumBuffer.push(momentum);
    if (momentumBuffer.length > 6) momentumBuffer.shift();

    const deltaToRedLag5 = deltaToRedBuffer.length >= 6 ? deltaToRedBuffer[0] : deltaToRed;
    const momentumLag5 = momentumBuffer.length >= 6 ? momentumBuffer[0] : momentum;
    const deltaVelocity = deltaToRed - deltaToRedLag5;

    const avgVol20 = volumeBuffer.reduce((a, b) => a + b, 0) / volumeBuffer.length;
    const volumeRatio = avgVol20 > 0 ? (bar.volume || 0) / avgVol20 : 1.0;

    const barsInCurrentSwing = Math.max(1, i - swingStartBarIdx + 1);
    const expectedCumulativeVol = avgVol20 * barsInCurrentSwing;
    const cumulativeVolumeRatio = expectedCumulativeVol > 0 ? cumulativeVolumeSinceSwing / expectedCumulativeVol : 1.0;

    const direction: 'up' | 'down' = state === 1 ? 'up' : 'down';

    const featureVector = [
      deltaToRed,
      deltaToGreen,
      momentum,
      currIsBullish,
      lastRedIsBull,
      lastGreenIsBull,
      barsSinceRed,
      barsSinceGreen,
      swingRoiUp,
      swingRoiDown,
      roiMedianMultipleUp,
      roiMedianMultipleDown,
      deltaToRedLag5,
      momentumLag5,
      deltaVelocity,
      currIndex,
      volumeRatio,
      cumulativeVolumeRatio
    ];

    results.push({
      date: bar.date,
      close: bar.close,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      volume: bar.volume || 0,
      direction,
      features: featureVector
    });
  }

  return results;
}
