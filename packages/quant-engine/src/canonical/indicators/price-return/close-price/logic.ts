import type { ComputationResult, TimeSeriesFrame } from '../../../contracts';
import { getPriceSource } from '../../../core/series/price-source';

export function computeClosePrice(frame: TimeSeriesFrame): ComputationResult {
  return {
    status: 'ok',
    outputs: {
      close: frame.bars.map((bar) => getPriceSource(bar, 'close')),
    },
  };
}
