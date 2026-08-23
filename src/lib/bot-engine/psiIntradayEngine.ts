import { CandleBar, ComputedBar } from '@/lib/bot-engine/types';
import { botLog } from '@/lib/bot-engine/systemLogger';

// Helper to clamp values
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// SMA Helper
function sma(data: number[], length: number): number[] {
  const result = new Array(data.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= length) sum -= data[i - length];
    if (i >= length - 1) result[i] = sum / length;
  }
  return result;
}

// RMA (Running Moving Average - used in RSI and ATR in PineScript)
function rma(data: number[], length: number): number[] {
  const result = new Array(data.length).fill(NaN);
  const alpha = 1 / length;
  
  // Seed with SMA
  let sum = 0;
  let count = 0;
  let seeded = false;
  for (let i = 0; i < data.length; i++) {
    if (!Number.isNaN(data[i])) {
      sum += data[i];
      count++;
      if (count === length && !seeded) {
        result[i] = sum / length;
        seeded = true;
      } else if (seeded) {
        result[i] = alpha * data[i] + (1 - alpha) * result[i - 1];
      }
    }
  }
  return result;
}

// EMA Helper
function ema(data: number[], length: number): number[] {
  const result = new Array(data.length).fill(NaN);
  const alpha = 2 / (length + 1);
  
  let sum = 0;
  let count = 0;
  let seeded = false;
  for (let i = 0; i < data.length; i++) {
    if (!Number.isNaN(data[i])) {
      sum += data[i];
      count++;
      if (count === length && !seeded) {
        result[i] = sum / length;
        seeded = true;
      } else if (seeded) {
        result[i] = alpha * data[i] + (1 - alpha) * result[i - 1];
      }
    }
  }
  return result;
}

// Dynamic EMA (seeds with SMA of first length non-NaN values)
function dynamicEma(data: number[], length: number): number[] {
  return ema(data, length); // The ema function already implements this logic
}

// True Range
function trueRange(high: number[], low: number[], close: number[]): number[] {
  const tr = new Array(high.length).fill(NaN);
  tr[0] = high[0] - low[0];
  for (let i = 1; i < high.length; i++) {
    const hl = high[i] - low[i];
    const hc = Math.abs(high[i] - close[i - 1]);
    const lc = Math.abs(low[i] - close[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }
  return tr;
}

// RSI Helper
function rsi(data: number[], length: number): number[] {
  const changes = new Array(data.length).fill(0);
  for (let i = 1; i < data.length; i++) {
    changes[i] = data[i] - data[i - 1];
  }
  
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);
  
  const avgGains = rma(gains, length);
  const avgLosses = rma(losses, length);
  
  const result = new Array(data.length).fill(NaN);
  for (let i = 0; i < data.length; i++) {
    if (!Number.isNaN(avgGains[i]) && !Number.isNaN(avgLosses[i])) {
      if (avgLosses[i] === 0) {
        result[i] = 100;
      } else {
        const rs = avgGains[i] / avgLosses[i];
        result[i] = 100 - (100 / (1 + rs));
      }
    }
  }
  return result;
}

// Supertrend
function supertrend(high: number[], low: number[], close: number[], length: number, multiplier: number): number[] {
  const tr = trueRange(high, low, close);
  const atr = rma(tr, length);
  
  const hl2 = high.map((h, i) => (h + low[i]) / 2);
  
  const basicUb = hl2.map((h, i) => h + (multiplier * atr[i]));
  const basicLb = hl2.map((h, i) => h - (multiplier * atr[i]));
  
  const finalUb = new Array(close.length).fill(NaN);
  const finalLb = new Array(close.length).fill(NaN);
  const trend = new Array(close.length).fill(1);
  
  for (let i = length; i < close.length; i++) {
    // Upper Band
    if (basicUb[i] < finalUb[i - 1] || close[i - 1] > finalUb[i - 1] || Number.isNaN(finalUb[i - 1])) {
      finalUb[i] = basicUb[i];
    } else {
      finalUb[i] = finalUb[i - 1];
    }
    
    // Lower Band
    if (basicLb[i] > finalLb[i - 1] || close[i - 1] < finalLb[i - 1] || Number.isNaN(finalLb[i - 1])) {
      finalLb[i] = basicLb[i];
    } else {
      finalLb[i] = finalLb[i - 1];
    }
    
    // Trend
    if (trend[i - 1] === 1 && close[i] < finalLb[i]) {
      trend[i] = -1;
    } else if (trend[i - 1] === -1 && close[i] > finalUb[i]) {
      trend[i] = 1;
    } else {
      trend[i] = trend[i - 1] || 1;
    }
  }
  
  return trend;
}

// ADX Helper
function adx(high: number[], low: number[], close: number[], length: number): number[] {
  const tr = trueRange(high, low, close);
  const atr = rma(tr, length); // Pine uses RMA for ATR
  
  const plusDm = new Array(high.length).fill(0);
  const minusDm = new Array(high.length).fill(0);
  
  for (let i = 1; i < high.length; i++) {
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    
    if (upMove > downMove && upMove > 0) plusDm[i] = upMove;
    if (downMove > upMove && downMove > 0) minusDm[i] = downMove;
  }
  
  const smoothedPlusDm = rma(plusDm, length);
  const smoothedMinusDm = rma(minusDm, length);
  
  const plusDi = new Array(high.length).fill(NaN);
  const minusDi = new Array(high.length).fill(NaN);
  const dx = new Array(high.length).fill(NaN);
  
  for (let i = 0; i < high.length; i++) {
    if (!Number.isNaN(atr[i]) && atr[i] !== 0) {
      plusDi[i] = 100 * smoothedPlusDm[i] / atr[i];
      minusDi[i] = 100 * smoothedMinusDm[i] / atr[i];
      const sum = plusDi[i] + minusDi[i];
      if (sum !== 0) {
        dx[i] = 100 * Math.abs(plusDi[i] - minusDi[i]) / sum;
      } else {
        dx[i] = 0;
      }
    }
  }
  
  const adxVal = rma(dx, length);
  return adxVal;
}

// Bollinger %B Helper
function bollingerPercentB(close: number[], length: number, stdDevMult: number): number[] {
  const smaVal = sma(close, length);
  const result = new Array(close.length).fill(NaN);
  
  for (let i = length - 1; i < close.length; i++) {
    let sumSq = 0;
    for (let j = 0; j < length; j++) {
      const diff = close[i - j] - smaVal[i];
      sumSq += diff * diff;
    }
    const stdDev = Math.sqrt(sumSq / length);
    
    const upper = smaVal[i] + stdDevMult * stdDev;
    const lower = smaVal[i] - stdDevMult * stdDev;
    
    if (upper !== lower) {
      result[i] = ((close[i] - lower) / (upper - lower)) * 100;
    } else {
      result[i] = 50;
    }
  }
  return result;
}

// Rolling Min
function rollingMin(data: number[], length: number): number[] {
  const result = new Array(data.length).fill(NaN);
  for (let i = length - 1; i < data.length; i++) {
    let min = data[i];
    for (let j = 1; j < length; j++) {
      if (data[i - j] < min) min = data[i - j];
    }
    result[i] = min;
  }
  return result;
}

// Rolling Max
function rollingMax(data: number[], length: number): number[] {
  const result = new Array(data.length).fill(NaN);
  for (let i = length - 1; i < data.length; i++) {
    let max = data[i];
    for (let j = 1; j < length; j++) {
      if (data[i - j] > max) max = data[i - j];
    }
    result[i] = max;
  }
  return result;
}

// Rolling Median Helper
function rollingMedian(data: number[], length: number): number[] {
  const result = new Array(data.length).fill(NaN);
  for (let i = length - 1; i < data.length; i++) {
    const window = data.slice(i - length + 1, i + 1).sort((a, b) => a - b);
    const mid = Math.floor(length / 2);
    result[i] = length % 2 !== 0 ? window[mid] : (window[mid - 1] + window[mid]) / 2;
  }
  return result;
}

const WEIGHT_NORM_PRICE = 15.0;
const WEIGHT_RSI = 10.0;
const WEIGHT_BANKER = 5.0;
const WEIGHT_SUPERTREND = 47.0;
const WEIGHT_ADX = 10.0;
const WEIGHT_BB = 4.0;
const WEIGHT_MA_SPREAD = 4.0;
const WEIGHT_SLOPE = 1.0;
const COMPOSITE_DIVISOR = 96.0;

/**
 * Computes the intraday PSI series for a given set of candle bars.
 * Implements a pure TypeScript port of the Python intraday indicator engine.
 * 
 * @param candles The array of candle bars to process.
 * @returns Array of ComputedBar with identical length to input candles.
 */
export function computeIntradayPsiSeries(candles: CandleBar[]): ComputedBar[] {
  if (!candles || candles.length < 50) {
    return [];
  }

  try {
    const close = candles.map(c => Number(c.close));
    const high = candles.map(c => Number(c.high));
    const low = candles.map(c => Number(c.low));
    const open = candles.map(c => Number(c.open));

    // 1. Normalized Price
    const lowest100 = rollingMin(close, 100);
    const highest100 = rollingMax(close, 100);
    const normPrice = new Array(close.length).fill(50);
    for (let i = 0; i < close.length; i++) {
      if (!Number.isNaN(lowest100[i]) && !Number.isNaN(highest100[i]) && highest100[i] !== lowest100[i]) {
        normPrice[i] = ((close[i] - lowest100[i]) / (highest100[i] - lowest100[i])) * 100;
      }
    }

    // 2. RSI (14)
    const rsi14 = rsi(close, 14);
    for (let i = 0; i < rsi14.length; i++) {
      if (Number.isNaN(rsi14[i])) rsi14[i] = 50;
    }

    // 3. Banker Flow: RSI(close, 50)
    const rsi50 = rsi(close, 50);
    for (let i = 0; i < rsi50.length; i++) {
      if (Number.isNaN(rsi50[i])) rsi50[i] = 50;
    }

    // 4. Supertrend (10, 3.0)
    const stDir = supertrend(high, low, close, 10, 3.0);
    const stScore = stDir.map(d => d === 1 ? 100 : 0);

    // 5. ADX (14)
    const adx14 = adx(high, low, close, 14);
    for (let i = 0; i < adx14.length; i++) {
      if (Number.isNaN(adx14[i])) adx14[i] = 25;
    }

    // 6. Bollinger %B (20, 2.0)
    const bbPctB = bollingerPercentB(close, 20, 2.0);
    for (let i = 0; i < bbPctB.length; i++) {
      if (Number.isNaN(bbPctB[i])) {
        bbPctB[i] = 50;
      } else {
        bbPctB[i] = clamp(bbPctB[i], 0, 100);
      }
    }

    // 7. MA Spread
    const ema9 = ema(close, 9);
    const ema21 = ema(close, 21);
    const maSpread = new Array(close.length).fill(50);
    for (let i = 0; i < close.length; i++) {
      if (!Number.isNaN(ema9[i]) && !Number.isNaN(ema21[i]) && close[i] !== 0) {
        const spread = 50 + ((ema9[i] - ema21[i]) / close[i] * 100) * 5.0;
        maSpread[i] = clamp(spread, 0, 100);
      }
    }

    // 8. Slope Angle
    const ema20 = ema(close, 20);
    const slopeAngle = new Array(close.length).fill(50);
    for (let i = 5; i < close.length; i++) {
      if (!Number.isNaN(ema20[i]) && !Number.isNaN(ema20[i - 5]) && close[i] !== 0) {
        const slope = 50 + ((ema20[i] - ema20[i - 5]) / close[i] * 100) * 10.0;
        slopeAngle[i] = clamp(slope, 0, 100);
      }
    }

    // Composite Index
    const rawIndex = new Array(close.length).fill(NaN);
    for (let i = 0; i < close.length; i++) {
      rawIndex[i] = (
        normPrice[i] * WEIGHT_NORM_PRICE +
        rsi14[i] * WEIGHT_RSI +
        rsi50[i] * WEIGHT_BANKER +
        stScore[i] * WEIGHT_SUPERTREND +
        adx14[i] * WEIGHT_ADX +
        bbPctB[i] * WEIGHT_BB +
        maSpread[i] * WEIGHT_MA_SPREAD +
        slopeAngle[i] * WEIGHT_SLOPE
      ) / COMPOSITE_DIVISOR;
    }

    // Master Index & Adjusted
    const masterIndex = dynamicEma(rawIndex, 3);
    const masterIndexAdjusted = dynamicEma(masterIndex, 3);

    // Median Bar Move
    const movePct = new Array(close.length).fill(NaN);
    for (let i = 0; i < close.length; i++) {
      if (open[i] !== 0) {
        movePct[i] = Math.abs(close[i] - open[i]) / open[i] * 100;
      }
    }
    const medianMove = rollingMedian(movePct, 14);
    
    // ATR 14
    const atr14 = rma(trueRange(high, low, close), 14);

    return candles.map((c, i) => {
      // Create computed bar object, fallbacks to handle NaN from beginnings
      const computedBar: ComputedBar = {
        ...c,
        normPrice: normPrice[i],
        rsi: rsi14[i],
        bankerFlow: rsi50[i],
        supertrend: stScore[i],
        adx: adx14[i],
        bollingerPercentB: bbPctB[i],
        maSpread: maSpread[i],
        slopeAngle: slopeAngle[i],
        rawIndex: rawIndex[i],
        masterIndex: masterIndex[i] ?? rawIndex[i] ?? 0, // fallback if NaN
        masterIndexAdjusted: masterIndexAdjusted[i] ?? rawIndex[i] ?? 0,
        atr14: atr14[i] ?? 0,
        medianBarMove: medianMove[i] ?? 0,
        atr: atr14[i],
        medianMove: medianMove[i]
      };
      return computedBar;
    });

  } catch (err) {
    botLog.error('PSI_ENGINE', 'Error in computeIntradayPsiSeries', { error: String(err) });
    return [];
  }
}
