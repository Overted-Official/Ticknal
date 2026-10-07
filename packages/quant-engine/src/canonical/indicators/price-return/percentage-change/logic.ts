import { createDiagnostic, type ComputationResult, type TimeSeriesFrame } from '../../../contracts';
import { lagAligned } from '../../../core/series/lag';
import type { LookbackParameters } from '../shared/parse-lookback-parameters';

export function computePercentageChange(
  frame: TimeSeriesFrame,
  parameters: LookbackParameters,
): ComputationResult {
  const close = frame.bars.map((bar) => bar.close);
  const lagged = lagAligned(close, parameters.lookback);
  const invalidIndex = lagged.findIndex((value) => value !== null && value <= 0);
  if (invalidIndex >= 0) {
    return {
      status: 'invalid',
      diagnostics: [
        createDiagnostic('NUMERIC_DOMAIN_ERROR', 'indicator.numeric.positiveDivisorRequired', {
          index: invalidIndex,
          value: lagged[invalidIndex],
        }),
      ],
    };
  }

  return {
    status: 'ok',
    outputs: {
      return_pct: close.map((value, index) =>
        lagged[index] === null ? null : (value / lagged[index] - 1) * 100,
      ),
    },
  };
}
