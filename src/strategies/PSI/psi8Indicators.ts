import type { PriceBar } from './psiStrategy';

export function computeBankerScore(close: number[], high: number[], low: number[]): Array<number | null> {
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

export function computeBollingerScore(values: number[], length: number, mult: number): Array<number | null> {
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

export function computeMaScore(values: number[], fastLength: number, slowLength: number, normLength: number): Array<number | null> {
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

export function computeRsi(values: number[], length: number): Array<number | null> {
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

export function computeDmiScore(high: number[], low: number[], close: number[], length: number): Array<number | null> {
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

export function computeAtr(high: number[], low: number[], close: number[], length: number): Array<number | null> {
  return rma(computeTrueRange(high, low, close), length);
}

export function computeTrueRange(high: number[], low: number[], close: number[]): Array<number | null> {
  return high.map((value, i) => {
    if (i === 0) return value - low[i];
    return Math.max(value - low[i], Math.abs(value - close[i - 1]), Math.abs(low[i] - close[i - 1]));
  });
}

export function computeSupertrend(
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

export function simpleMovingAverage(values: Array<number | null>, length: number): Array<number | null> {
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

export function rma(values: Array<number | null>, length: number): Array<number | null> {
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

export function weightedSimpleAverage(values: Array<number | null>, length: number, weight: number): Array<number | null> {
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

export function dynamicEma(values: Array<number | null>, length: number): Array<number | null> {
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

export function rollingMax(values: Array<number | null>, length: number): Array<number | null> {
  return rollingExtreme(values, length, Math.max);
}

export function rollingMin(values: Array<number | null>, length: number): Array<number | null> {
  return rollingExtreme(values, length, Math.min);
}

export function rollingExtreme(
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

export function rollingMedian(values: Array<number | null>, length: number): Array<number | null> {
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

export function safeSub(left: number | null, right: number | null): number | null {
  return isFiniteNumber(left) && isFiniteNumber(right) ? Number(left) - Number(right) : null;
}

export function nullable(value: number | null): number | null {
  return isFiniteNumber(value) ? Number(value) : null;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computePsi8(close: number[], high: number[], low: number[]): { rawIndex: Array<number | null>, atr14: Array<number | null> } {
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
    return weighted / 99;
  });
  
  return { rawIndex, atr14 };
}
