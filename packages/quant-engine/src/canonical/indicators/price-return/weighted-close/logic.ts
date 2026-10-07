import type { ComputationResult, TimeSeriesFrame } from '../../../contracts';
import { getPriceSource } from '../../../core/series/price-source';

export function computeWeightedClose(frame: TimeSeriesFrame): ComputationResult {
  return {
    status: 'ok',
    outputs: {
      hlcc4: frame.bars.map((bar) => getPriceSource(bar, 'hlcc4')),
    },
  };
}
