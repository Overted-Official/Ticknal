import { type ComputationResult, type TimeSeriesFrame } from '../../../contracts';

export function computeTrueRange(frame: TimeSeriesFrame): ComputationResult {
  return {
    status: 'ok',
    outputs: {
      true_range: frame.bars.map((bar, index) => {
        if (index === 0) return bar.high - bar.low;
        const previousClose = frame.bars[index - 1].close;
        return Math.max(
          bar.high - bar.low,
          Math.abs(bar.high - previousClose),
          Math.abs(bar.low - previousClose),
        );
      }),
    },
  };
}
