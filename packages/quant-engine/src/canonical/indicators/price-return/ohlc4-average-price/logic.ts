import type { ComputationResult, TimeSeriesFrame } from '../../../contracts';
import { getPriceSource } from '../../../core/series/price-source';

export function computeOhlc4AveragePrice(frame: TimeSeriesFrame): ComputationResult {
  return {
    status: 'ok',
    outputs: {
      ohlc4: frame.bars.map((bar) => getPriceSource(bar, 'ohlc4')),
    },
  };
}
