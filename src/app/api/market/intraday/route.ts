import { NextRequest, NextResponse } from 'next/server';
import { getIntradayBar } from '@/lib/market/intraday-feed';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTicker = searchParams.get('ticker');

  if (!rawTicker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  const response = await getIntradayBar(rawTicker);

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
