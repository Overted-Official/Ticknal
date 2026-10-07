import { createDiagnostic, type ComputationResult, type TimeSeriesFrame } from '../../../contracts';

export function computeIntrabarReturn(frame: TimeSeriesFrame): ComputationResult {
  const invalidIndex = frame.bars.findIndex((bar) => bar.open <= 0);
  if (invalidIndex >= 0) {
    return {
      status: 'invalid',
      diagnostics: [
        createDiagnostic('NUMERIC_DOMAIN_ERROR', 'indicator.numeric.positiveDivisorRequired', {
          index: invalidIndex,
          value: frame.bars[invalidIndex].open,
        }),
      ],
    };
  }

  return {
    status: 'ok',
    outputs: {
      body_return_pct: frame.bars.map((bar) => (bar.close / bar.open - 1) * 100),
    },
  };
}
