import { createDiagnostic, type ComputationResult, type TimeSeriesFrame } from '../../../contracts';
import { rollingMinMax } from '../../../core/rolling/extrema';
import type { LookbackParameters } from '../shared/parse-lookback-parameters';

export function computeDistanceFromHighLow(
  frame: TimeSeriesFrame,
  parameters: LookbackParameters,
): ComputationResult {
  const highExtrema = rollingMinMax(frame.bars.map((bar) => bar.high), parameters.lookback);
  const lowExtrema = rollingMinMax(frame.bars.map((bar) => bar.low), parameters.lookback);
  const invalidIndex = highExtrema.maximum.findIndex(
    (highest, index) =>
      (highest !== null && highest <= 0)
      || (lowExtrema.minimum[index] !== null && lowExtrema.minimum[index] <= 0),
  );
  if (invalidIndex >= 0) {
    return {
      status: 'invalid',
      diagnostics: [
        createDiagnostic('NUMERIC_DOMAIN_ERROR', 'indicator.numeric.positiveDivisorRequired', {
          index: invalidIndex,
          highest: highExtrema.maximum[invalidIndex],
          lowest: lowExtrema.minimum[invalidIndex],
        }),
      ],
    };
  }

  const diagnostics = frame.bars.length < parameters.lookback
    ? [
        createDiagnostic(
          'HISTORY_INSUFFICIENT',
          'indicator.history.lookbackExceedsObservations',
          { lookback: parameters.lookback, observations: frame.bars.length },
          'warning',
        ),
      ]
    : [];
  return {
    status: 'ok',
    outputs: {
      distance_from_high_pct: frame.bars.map((bar, index) => {
        const highest = highExtrema.maximum[index];
        return highest === null ? null : (bar.close / highest - 1) * 100;
      }),
      distance_from_low_pct: frame.bars.map((bar, index) => {
        const lowest = lowExtrema.minimum[index];
        return lowest === null ? null : (bar.close / lowest - 1) * 100;
      }),
    },
    diagnostics,
  };
}
