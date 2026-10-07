import type { ComputationResult, TimeSeriesFrame } from '../../../contracts';
import { getPriceSource } from '../../../core/series/price-source';

export function computeHlc3TypicalPrice(frame: TimeSeriesFrame): ComputationResult {
  return {
    status: 'ok',
    outputs: {
      hlc3: frame.bars.map((bar) => getPriceSource(bar, 'hlc3')),
    },
  };
}
