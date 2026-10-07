import type { TimeSeriesIndicatorDefinition } from '../../contracts';
import { ABSOLUTE_CHANGE_DEFINITION } from './absolute-change';
import { CLOSE_PRICE_DEFINITION } from './close-price';
import { CUMULATIVE_RETURN_DEFINITION } from './cumulative-return';
import { DISTANCE_FROM_HIGH_LOW_DEFINITION } from './distance-from-high-low';
import { DRAWDOWN_SERIES_DEFINITION } from './drawdown-series';
import { GAP_PERCENTAGE_DEFINITION } from './gap-percentage';
import { HIGH_LOW_DEFINITION } from './high-low';
import { HIGH_LOW_RANGE_PERCENTAGE_DEFINITION } from './high-low-range-percentage';
import { HL2_MEDIAN_PRICE_DEFINITION } from './hl2-median-price';
import { HLC3_TYPICAL_PRICE_DEFINITION } from './hlc3-typical-price';
import { INTRABAR_RETURN_DEFINITION } from './intrabar-return';
import { LOG_RETURN_DEFINITION } from './log-return';
import { OHLC4_AVERAGE_PRICE_DEFINITION } from './ohlc4-average-price';
import { OPEN_PRICE_DEFINITION } from './open-price';
import { PERCENTAGE_CHANGE_DEFINITION } from './percentage-change';
import { PRICE_PERCENTILE_RANK_DEFINITION } from './price-percentile-rank';
import { ROLLING_HIGH_LOW_DEFINITION } from './rolling-high-low';
import { ROLLING_VWAP_SOURCE_DEFINITION } from './rolling-vwap-source';
import { TRUE_RANGE_DEFINITION } from './true-range';
import { WEIGHTED_CLOSE_DEFINITION } from './weighted-close';

export const PRICE_RETURN_DEFINITIONS: readonly TimeSeriesIndicatorDefinition<object>[] = Object.freeze([
  CLOSE_PRICE_DEFINITION,
  OPEN_PRICE_DEFINITION,
  HIGH_LOW_DEFINITION,
  HL2_MEDIAN_PRICE_DEFINITION,
  HLC3_TYPICAL_PRICE_DEFINITION,
  OHLC4_AVERAGE_PRICE_DEFINITION,
  WEIGHTED_CLOSE_DEFINITION,
  ABSOLUTE_CHANGE_DEFINITION,
  PERCENTAGE_CHANGE_DEFINITION,
  LOG_RETURN_DEFINITION,
  CUMULATIVE_RETURN_DEFINITION,
  GAP_PERCENTAGE_DEFINITION,
  INTRABAR_RETURN_DEFINITION,
  HIGH_LOW_RANGE_PERCENTAGE_DEFINITION,
  TRUE_RANGE_DEFINITION,
  ROLLING_HIGH_LOW_DEFINITION,
  DISTANCE_FROM_HIGH_LOW_DEFINITION,
  DRAWDOWN_SERIES_DEFINITION,
  PRICE_PERCENTILE_RANK_DEFINITION,
  ROLLING_VWAP_SOURCE_DEFINITION,
]);
