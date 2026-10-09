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

  const maxAge = response.active ? 180 : response.reason === 'funds_excluded' ? 86400 : 300;
  const swr = response.active ? 300 : response.reason === 'funds_excluded' ? 86400 : 600;

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
    },
  });
}
