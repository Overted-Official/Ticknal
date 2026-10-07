function assertLookback(lookback: number): void {
  if (!Number.isSafeInteger(lookback) || lookback <= 0) {
    throw new RangeError('lookback must be a positive safe integer');
  }
}

export interface RollingMinMaxResult {
  readonly minimum: readonly (number | null)[];
  readonly maximum: readonly (number | null)[];
}

export function rollingMinMax(
  values: readonly (number | null)[],
  lookback: number,
): RollingMinMaxResult {
  assertLookback(lookback);
  const minimum: (number | null)[] = Array(values.length).fill(null);
  const maximum: (number | null)[] = Array(values.length).fill(null);

  for (let index = lookback - 1; index < values.length; index += 1) {
    const window = values.slice(index - lookback + 1, index + 1);
    if (window.some((value) => value === null)) continue;
    const observed = window as readonly number[];
    minimum[index] = Math.min(...observed);
    maximum[index] = Math.max(...observed);
  }

  return { minimum, maximum };
}
