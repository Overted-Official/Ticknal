import {
  createDiagnostic,
  type ComputationResult,
  type ObservationTime,
  type TimeSeriesFrame,
} from '../../../contracts';

export interface CumulativeReturnParameters {
  readonly anchor: 'first-observation' | ObservationTime;
}

export function computeCumulativeReturn(
  frame: TimeSeriesFrame,
  parameters: CumulativeReturnParameters,
): ComputationResult {
  if (frame.bars.length === 0) {
    return {
      status: 'unavailable',
      diagnostics: [
        createDiagnostic('HISTORY_INSUFFICIENT', 'indicator.history.empty'),
      ],
    };
  }

  const anchorIndex = parameters.anchor === 'first-observation'
    ? 0
    : frame.bars.findIndex((bar) => bar.time === parameters.anchor);
  if (anchorIndex < 0) {
    return {
      status: 'invalid',
      diagnostics: [
        createDiagnostic('PARAMETER_INVALID', 'indicator.parameter.anchorNotFound', {
          anchor: parameters.anchor,
        }),
      ],
    };
  }

  const anchorPrice = frame.bars[anchorIndex].close;
  if (anchorPrice <= 0) {
    return {
      status: 'invalid',
      diagnostics: [
        createDiagnostic('NUMERIC_DOMAIN_ERROR', 'indicator.numeric.positiveDivisorRequired', {
          index: anchorIndex,
          value: anchorPrice,
        }),
      ],
    };
  }

  return {
    status: 'ok',
    outputs: {
      cumulative_return: frame.bars.map((bar, index) =>
        index < anchorIndex ? null : (bar.close / anchorPrice - 1) * 100,
      ),
    },
  };
}
