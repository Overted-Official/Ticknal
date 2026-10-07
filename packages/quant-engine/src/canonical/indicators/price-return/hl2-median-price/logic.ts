import type { ComputationResult, TimeSeriesFrame } from '../../../contracts';
import { getPriceSource } from '../../../core/series/price-source';

export function computeHl2MedianPrice(frame: TimeSeriesFrame): ComputationResult {
  return {
    status: 'ok',
    outputs: {
      hl2: frame.bars.map((bar) => getPriceSource(bar, 'hl2')),
    },
  };
}
