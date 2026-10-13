import { unstable_cache } from 'next/cache';

import { loadLiveTimeSeriesFrame } from '../../indicators/server/load-live-time-series-frame';
import { createSingleFlightDailyFrameLoader } from './single-flight-daily-frame';

const readSharedDailyFrame = unstable_cache(
  (symbol: string) => loadLiveTimeSeriesFrame({ symbol, timeframe: 'D' }),
  ['strategy-daily-frame-v1'],
  { tags: ['prices', 'strategy-daily-frames'], revalidate: 86_400 },
);

// The shared Next data cache is keyed by symbol, never by user or strategy edit.
// Single-flight also prevents simultaneous reads from duplicating a cold load
// within one server process. The existing price-sync jobs invalidate `prices`.
export const loadStrategyDailyFrame = createSingleFlightDailyFrameLoader(readSharedDailyFrame);
