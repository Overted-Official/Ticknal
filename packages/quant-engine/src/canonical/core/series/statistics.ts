export type NullableNumber = number | null;

function assertPeriod(period: number): void {
  if (!Number.isSafeInteger(period) || period <= 0) {
    throw new RangeError('period must be a positive safe integer');
  }
}

function fullWindow(
  values: readonly NullableNumber[],
  end: number,
  period: number,
): readonly number[] | null {
  if (end + 1 < period) return null;
  const window: number[] = [];
  for (let index = end - period + 1; index <= end; index += 1) {
    const value = values[index];
    if (value === null || !Number.isFinite(value)) return null;
    window.push(value);
  }
  return window;
}

function rollingStatistic(
  values: readonly NullableNumber[],
  period: number,
  calculate: (window: readonly number[]) => number,
): NullableNumber[] {
  assertPeriod(period);
  return values.map((_, index) => {
    const window = fullWindow(values, index, period);
    return window === null ? null : calculate(window);
  });
}

export function rollingMin(values: readonly NullableNumber[], period: number): NullableNumber[] {
  return rollingStatistic(values, period, (window) => Math.min(...window));
}

export function rollingMax(values: readonly NullableNumber[], period: number): NullableNumber[] {
  return rollingStatistic(values, period, (window) => Math.max(...window));
}

export function rollingStdDev(
  values: readonly NullableNumber[],
  period: number,
): NullableNumber[] {
  return rollingStatistic(values, period, (window) => {
    const mean = window.reduce((total, value) => total + value, 0) / window.length;
    const variance = window.reduce((total, value) => total + (value - mean) ** 2, 0) / window.length;
    return Math.sqrt(variance);
  });
}

export function linearRegressionEnd(
  values: readonly NullableNumber[],
  period: number,
): NullableNumber[] {
  return rollingStatistic(values, period, (window) => {
    if (window.length === 1) return window[0];
    const xMean = (window.length - 1) / 2;
    const yMean = window.reduce((total, value) => total + value, 0) / window.length;
    let numerator = 0;
    let denominator = 0;
    for (let index = 0; index < window.length; index += 1) {
      numerator += (index - xMean) * (window[index] - yMean);
      denominator += (index - xMean) ** 2;
    }
    return yMean + (numerator / denominator) * (window.length - 1 - xMean);
  });
}

export function percentileRank(
  values: readonly NullableNumber[],
  period: number,
): NullableNumber[] {
  return values.map((value, index) => {
    assertPeriod(period);
    if (value === null || !Number.isFinite(value)) return null;
    const window = fullWindow(values, index, period);
    if (window === null) return null;
    const less = window.filter((candidate) => candidate < value).length;
    const equal = window.filter((candidate) => candidate === value).length;
    return ((less + equal) / window.length) * 100;
  });
}
