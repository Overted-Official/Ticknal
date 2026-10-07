function assertLookback(lookback: number): void {
  if (!Number.isSafeInteger(lookback) || lookback <= 0) {
    throw new RangeError('lookback must be a positive safe integer');
  }
}

export function lagAligned<T>(values: readonly T[], lookback: number): readonly (T | null)[] {
  assertLookback(lookback);
  return values.map((_, index) => (index < lookback ? null : values[index - lookback]));
}
