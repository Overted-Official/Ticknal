import { type ComputationResult, type TimeSeriesFrame } from '../../../contracts';
import { lagAligned } from '../../../core/series/lag';
import type { LookbackParameters } from '../shared/parse-lookback-parameters';

export function computeAbsoluteChange(
  frame: TimeSeriesFrame,
  parameters: LookbackParameters,
): ComputationResult {
  const close = frame.bars.map((bar) => bar.close);
  const lagged = lagAligned(close, parameters.lookback);
  return {
    status: 'ok',
    outputs: {
      change: close.map((value, index) =>
        lagged[index] === null ? null : value - lagged[index],
      ),
    },
  };
}
