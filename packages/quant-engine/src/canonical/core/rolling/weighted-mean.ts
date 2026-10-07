import { createDiagnostic, type Diagnostic } from '../../contracts';

export interface RollingWeightedMeanResult {
  readonly values: readonly (number | null)[];
  readonly diagnostics: readonly Diagnostic[];
}

function assertLookback(lookback: number): void {
  if (!Number.isSafeInteger(lookback) || lookback <= 0) {
    throw new RangeError('lookback must be a positive safe integer');
  }
}

export function rollingWeightedMean(
  values: readonly (number | null)[],
  weights: readonly (number | null)[],
  lookback: number,
): RollingWeightedMeanResult {
  assertLookback(lookback);
  if (values.length !== weights.length) {
    throw new RangeError('values and weights must have the same length');
  }

  const result: (number | null)[] = Array(values.length).fill(null);
  const diagnostics: Diagnostic[] = [];

  for (let index = lookback - 1; index < values.length; index += 1) {
    const start = index - lookback + 1;
    let weightedTotal = 0;
    let weightTotal = 0;
    let missing = false;

    for (let windowIndex = start; windowIndex <= index; windowIndex += 1) {
      const value = values[windowIndex];
      const weight = weights[windowIndex];
      if (value === null || weight === null) {
        missing = true;
        break;
      }
      weightedTotal += value * weight;
      weightTotal += weight;
    }

    if (missing) {
      diagnostics.push(
        createDiagnostic(
          'DATA_FIELD_MISSING',
          'indicator.numeric.weightedMeanMissingObservation',
          { index, lookback },
        ),
      );
      continue;
    }

    if (weightTotal === 0) {
      diagnostics.push(
        createDiagnostic(
          'NUMERIC_DIVIDE_BY_ZERO',
          'indicator.numeric.zeroWeightWindow',
          { index, lookback },
          'warning',
        ),
      );
      continue;
    }

    result[index] = weightedTotal / weightTotal;
  }

  return { values: result, diagnostics };
}
