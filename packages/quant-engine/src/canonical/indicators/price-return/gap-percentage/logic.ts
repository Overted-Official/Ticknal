import { createDiagnostic, type ComputationResult, type TimeSeriesFrame } from '../../../contracts';

export function computeGapPercentage(frame: TimeSeriesFrame): ComputationResult {
  const invalidIndex = frame.bars.findIndex(
    (bar, index) => index > 0 && frame.bars[index - 1].close <= 0,
  );
  if (invalidIndex >= 0) {
    return {
      status: 'invalid',
      diagnostics: [
        createDiagnostic('NUMERIC_DOMAIN_ERROR', 'indicator.numeric.positiveDivisorRequired', {
          index: invalidIndex,
          value: frame.bars[invalidIndex - 1].close,
        }),
      ],
    };
  }

  const gap = frame.bars.map((bar, index) =>
    index === 0 ? null : (bar.open / frame.bars[index - 1].close - 1) * 100,
  );
  return {
    status: 'ok',
    outputs: {
      gap_pct: gap,
      direction: gap.map((value) =>
        value === null ? null : value > 0 ? 'up' : value < 0 ? 'down' : 'flat',
      ),
    },
  };
}
