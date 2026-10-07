import type { NullableNumber } from './statistics';

function assertPeriod(period: number): void {
  if (!Number.isSafeInteger(period) || period <= 0) {
    throw new RangeError('period must be a positive safe integer');
  }
}

function seedAverage(values: readonly NullableNumber[], end: number, period: number): number | null {
  if (end + 1 < period) return null;
  let total = 0;
  for (let index = end - period + 1; index <= end; index += 1) {
    const value = values[index];
    if (value === null || !Number.isFinite(value)) return null;
    total += value;
  }
  return total / period;
}

export function sma(values: readonly NullableNumber[], period: number): NullableNumber[] {
  assertPeriod(period);
  return values.map((_, index) => seedAverage(values, index, period));
}

export function wma(values: readonly NullableNumber[], period: number): NullableNumber[] {
  assertPeriod(period);
  const denominator = (period * (period + 1)) / 2;
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    let total = 0;
    for (let offset = 0; offset < period; offset += 1) {
      const value = values[index - period + 1 + offset];
      if (value === null || !Number.isFinite(value)) return null;
      total += value * (offset + 1);
    }
    return total / denominator;
  });
}

function recursiveAverage(
  values: readonly NullableNumber[],
  period: number,
  update: (previous: number, value: number) => number,
): NullableNumber[] {
  assertPeriod(period);
  const output: NullableNumber[] = Array(values.length).fill(null);
  let previous: number | null = null;
  let validRun = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === null || !Number.isFinite(value)) {
      previous = null;
      validRun = 0;
      continue;
    }
    validRun += 1;
    if (previous === null) {
      if (validRun < period) continue;
      previous = seedAverage(values, index, period);
    } else {
      previous = update(previous, value);
    }
    output[index] = previous;
  }
  return output;
}

export function ema(values: readonly NullableNumber[], period: number): NullableNumber[] {
  const alpha = 2 / (period + 1);
  return recursiveAverage(values, period, (previous, value) =>
    alpha * value + (1 - alpha) * previous,
  );
}

export function rma(values: readonly NullableNumber[], period: number): NullableNumber[] {
  return recursiveAverage(values, period, (previous, value) =>
    (previous * (period - 1) + value) / period,
  );
}

export function trueRange(
  high: readonly NullableNumber[],
  low: readonly NullableNumber[],
  close: readonly NullableNumber[],
): NullableNumber[] {
  if (high.length !== low.length || high.length !== close.length) {
    throw new RangeError('high, low, and close series must have the same length');
  }
  return high.map((highValue, index) => {
    const lowValue = low[index];
    if (highValue === null || lowValue === null) return null;
    const previousClose = index === 0 ? null : close[index - 1];
    if (index > 0 && previousClose === null) return null;
    return previousClose === null
      ? highValue - lowValue
      : Math.max(
          highValue - lowValue,
          Math.abs(highValue - previousClose),
          Math.abs(lowValue - previousClose),
        );
  });
}

export function atr(
  high: readonly NullableNumber[],
  low: readonly NullableNumber[],
  close: readonly NullableNumber[],
  period: number,
): NullableNumber[] {
  return rma(trueRange(high, low, close), period);
}

export function rsi(values: readonly NullableNumber[], period: number): NullableNumber[] {
  assertPeriod(period);
  const output: NullableNumber[] = Array(values.length).fill(null);
  let averageGain = 0;
  let averageLoss = 0;
  let changesInRun = 0;

  for (let index = 1; index < values.length; index += 1) {
    const current = values[index];
    const previous = values[index - 1];
    if (current === null || previous === null) {
      averageGain = 0;
      averageLoss = 0;
      changesInRun = 0;
      continue;
    }

    const change = current - previous;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    changesInRun += 1;

    if (changesInRun <= period) {
      averageGain += gain / period;
      averageLoss += loss / period;
      if (changesInRun < period) continue;
    } else {
      averageGain = (averageGain * (period - 1) + gain) / period;
      averageLoss = (averageLoss * (period - 1) + loss) / period;
    }

    output[index] = averageLoss === 0
      ? averageGain === 0 ? 50 : 100
      : 100 - 100 / (1 + averageGain / averageLoss);
  }
  return output;
}

function crossing(
  left: readonly NullableNumber[],
  right: readonly NullableNumber[],
  direction: 'up' | 'down',
): Array<boolean | null> {
  if (left.length !== right.length) throw new RangeError('crossing series must have the same length');
  return left.map((leftValue, index) => {
    if (index === 0) return null;
    const rightValue = right[index];
    const previousLeft = left[index - 1];
    const previousRight = right[index - 1];
    if (leftValue === null || rightValue === null || previousLeft === null || previousRight === null) {
      return null;
    }
    return direction === 'up'
      ? previousLeft <= previousRight && leftValue > rightValue
      : previousLeft >= previousRight && leftValue < rightValue;
  });
}

export function crossUp(
  left: readonly NullableNumber[],
  right: readonly NullableNumber[],
): Array<boolean | null> {
  return crossing(left, right, 'up');
}

export function crossDown(
  left: readonly NullableNumber[],
  right: readonly NullableNumber[],
): Array<boolean | null> {
  return crossing(left, right, 'down');
}
