import { createDiagnostic, type ComputationResult, type TimeSeriesFrame } from '../../../contracts';
import { lagAligned } from '../../../core/series/lag';
import type { LookbackParameters } from '../shared/parse-lookback-parameters';

export function computeLogReturn(
  frame: TimeSeriesFrame,
  parameters: LookbackParameters,
): ComputationResult {
  const close = frame.bars.map((bar) => bar.close);
  const lagged = lagAligned(close, parameters.lookback);
  const invalidIndex = close.findIndex(
    (value, index) => lagged[index] !== null && (value <= 0 || lagged[index] <= 0),
  );
  if (invalidIndex >= 0) {
    return {
      status: 'invalid',
      diagnostics: [
        createDiagnostic('NUMERIC_DOMAIN_ERROR', 'indicator.numeric.positiveLogInputsRequired', {
          index: invalidIndex,
          current: close[invalidIndex],
          previous: lagged[invalidIndex],
        }),
      ],
    };
  }

  return {
    status: 'ok',
    outputs: {
      log_return: close.map((value, index) =>
        lagged[index] === null ? null : Math.log(value / lagged[index]),
      ),
    },
  };
}
