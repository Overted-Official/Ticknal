import { NextResponse } from 'next/server';

import { loadLiveTimeSeriesFrame } from '@/lib/indicators/server/load-live-time-series-frame';
import {
  normalizeLiveTicker,
  parseLiveTimeframe,
} from '@/lib/indicators/server/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' } as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = normalizeLiveTicker(searchParams.get('ticker') ?? '');
  const timeframe = parseLiveTimeframe(searchParams.get('timeframe') ?? '');

  if (!symbol || !timeframe) {
    return NextResponse.json(
      {
        status: 'invalid',
        error: 'ticker and timeframe must be valid; supported timeframes are D, W, M, 1H, and 15M.',
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const result = await loadLiveTimeSeriesFrame({ symbol, timeframe });
    return NextResponse.json(result, {
      status: result.status === 'ok' ? 200 : 422,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error('[indicators/frame] Database frame load failed.', error);
    return NextResponse.json(
      { status: 'unavailable', error: 'Market data source is temporarily unavailable.' },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
