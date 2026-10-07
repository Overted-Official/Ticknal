import { createDiagnostic, type ComputationResult, type TimeSeriesFrame } from '../../../contracts';

export function computeHighLowRangePercentage(frame: TimeSeriesFrame): ComputationResult {
  const invalidIndex = frame.bars.findIndex((bar) => bar.close <= 0);
  if (invalidIndex >= 0) {
    return {
      status: 'invalid',
      diagnostics: [
        createDiagnostic('NUMERIC_DOMAIN_ERROR', 'indicator.numeric.positiveDivisorRequired', {
          index: invalidIndex,
          value: frame.bars[invalidIndex].close,
        }),
      ],
    };
  }

  return {
    status: 'ok',
    outputs: {
      range_pct: frame.bars.map((bar) => ((bar.high - bar.low) / bar.close) * 100),
    },
  };
}
