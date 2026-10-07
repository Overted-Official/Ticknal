import type { ComputationResult, TimeSeriesFrame } from '../../../contracts';

export function computeHighLow(frame: TimeSeriesFrame): ComputationResult {
  return {
    status: 'ok',
    outputs: {
      high: frame.bars.map((bar) => bar.high),
      low: frame.bars.map((bar) => bar.low),
      range: frame.bars.map((bar) => bar.high - bar.low),
    },
  };
}
