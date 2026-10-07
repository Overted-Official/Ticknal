import { createDiagnostic, type ComputationResult, type TimeSeriesFrame } from '../../../contracts';
import { rollingMinMax } from '../../../core/rolling/extrema';
import type { LookbackParameters } from '../shared/parse-lookback-parameters';

export function computeRollingHighLow(
  frame: TimeSeriesFrame,
  parameters: LookbackParameters,
): ComputationResult {
  const highExtrema = rollingMinMax(frame.bars.map((bar) => bar.high), parameters.lookback);
  const lowExtrema = rollingMinMax(frame.bars.map((bar) => bar.low), parameters.lookback);
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
      highest: highExtrema.maximum,
      lowest: lowExtrema.minimum,
    },
    diagnostics,
  };
}
