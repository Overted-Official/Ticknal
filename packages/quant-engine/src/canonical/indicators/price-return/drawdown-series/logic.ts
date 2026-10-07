import { createDiagnostic, type ComputationResult, type TimeSeriesFrame } from '../../../contracts';

export function computeDrawdownSeries(frame: TimeSeriesFrame): ComputationResult {
  const invalidIndex = frame.bars.findIndex((bar) => bar.close <= 0);
  if (invalidIndex >= 0) {
    return {
      status: 'invalid',
      diagnostics: [
        createDiagnostic('NUMERIC_DOMAIN_ERROR', 'indicator.numeric.positivePriceRequired', {
          index: invalidIndex,
          value: frame.bars[invalidIndex].close,
        }),
      ],
    };
  }

  let runningPeak = Number.NEGATIVE_INFINITY;
  const peak = frame.bars.map((bar) => {
    runningPeak = Math.max(runningPeak, bar.close);
    return runningPeak;
  });
  return {
    status: 'ok',
    outputs: {
      peak,
      drawdown_pct: frame.bars.map((bar, index) => (bar.close / peak[index] - 1) * 100),
    },
  };
}
