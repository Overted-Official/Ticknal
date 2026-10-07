import type { ComputationResult, TimeSeriesFrame } from '../../../contracts';
import { getPriceSource } from '../../../core/series/price-source';

export function computeOpenPrice(frame: TimeSeriesFrame): ComputationResult {
  return {
    status: 'ok',
    outputs: {
      open: frame.bars.map((bar) => getPriceSource(bar, 'open')),
    },
  };
}
