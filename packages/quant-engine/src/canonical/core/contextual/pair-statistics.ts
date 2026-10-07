type NullableNumber = number | null;

export interface LinearFit {
  readonly slope: number;
  readonly intercept: number;
  readonly rSquared: number;
}

export function simpleReturns(values: readonly NullableNumber[]): NullableNumber[] {
  return values.map((value, index) => {
    if (index === 0 || value === null || !Number.isFinite(value)) return null;
    const previous = values[index - 1];
    if (previous === null || !Number.isFinite(previous) || previous === 0) return null;
    const result = (value - previous) / previous;
    return Number.isFinite(result) ? result : null;
  });
}

export function rollingPairStatistic(
  left: readonly NullableNumber[],
  right: readonly NullableNumber[],
  period: number,
  calculate: (leftWindow: readonly number[], rightWindow: readonly number[]) => number | null,
): NullableNumber[] {
  if (!Number.isSafeInteger(period) || period <= 0) {
    throw new RangeError('period must be a positive safe integer');
  }
  if (left.length !== right.length) {
    throw new RangeError('paired series must have equal lengths');
  }

  return left.map((_, index) => {
    if (index + 1 < period) return null;
    const leftWindow: number[] = [];
    const rightWindow: number[] = [];
    for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
      const leftValue = left[cursor];
      const rightValue = right[cursor];
      if (
        leftValue === null
        || rightValue === null
        || !Number.isFinite(leftValue)
        || !Number.isFinite(rightValue)
      ) return null;
      leftWindow.push(leftValue);
      rightWindow.push(rightValue);
    }
    const result = calculate(leftWindow, rightWindow);
    return result !== null && Number.isFinite(result) ? result : null;
  });
}

export function linearFit(
  dependent: readonly number[],
  independent: readonly number[],
): LinearFit | null {
  if (
    dependent.length !== independent.length
    || dependent.length < 2
    || dependent.some((value) => !Number.isFinite(value))
    || independent.some((value) => !Number.isFinite(value))
  ) return null;

  const count = dependent.length;
  const xMean = independent.reduce((sum, value) => sum + value, 0) / count;
  const yMean = dependent.reduce((sum, value) => sum + value, 0) / count;
  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;
  for (let index = 0; index < count; index += 1) {
    const xDelta = independent[index]! - xMean;
    const yDelta = dependent[index]! - yMean;
    covariance += xDelta * yDelta;
    xVariance += xDelta ** 2;
    yVariance += yDelta ** 2;
  }
  if (xVariance === 0) return null;

  const slope = covariance / xVariance;
  const intercept = yMean - slope * xMean;
  const rSquared = yVariance === 0 ? 1 : (covariance ** 2) / (xVariance * yVariance);
  return Number.isFinite(slope) && Number.isFinite(intercept) && Number.isFinite(rSquared)
    ? { slope, intercept, rSquared: Math.max(0, Math.min(1, rSquared)) }
    : null;
}

export function populationCovariance(
  left: readonly number[],
  right: readonly number[],
): number | null {
  if (left.length !== right.length || left.length === 0) return null;
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  const covariance = left.reduce(
    (sum, value, index) => sum + (value - leftMean) * (right[index]! - rightMean),
    0,
  ) / left.length;
  return Number.isFinite(covariance) ? covariance : null;
}

export function populationVariance(values: readonly number[]): number | null {
  return populationCovariance(values, values);
}
