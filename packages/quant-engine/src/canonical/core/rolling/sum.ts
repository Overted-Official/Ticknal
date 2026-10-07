function assertLookback(lookback: number): void {
  if (!Number.isSafeInteger(lookback) || lookback <= 0) {
    throw new RangeError('lookback must be a positive safe integer');
  }
}

export function rollingSum(
  values: readonly (number | null)[],
  lookback: number,
): readonly (number | null)[] {
  assertLookback(lookback);
  const result: (number | null)[] = Array(values.length).fill(null);

  for (let index = lookback - 1; index < values.length; index += 1) {
    const window = values.slice(index - lookback + 1, index + 1);
    if (window.some((value) => value === null)) continue;
    result[index] = (window as readonly number[]).reduce((total, value) => total + value, 0);
  }

  return result;
}
