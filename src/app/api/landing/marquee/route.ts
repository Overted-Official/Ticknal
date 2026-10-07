import { NextResponse } from 'next/server';
import { getLandingMarqueeTickers } from '@/lib/server/landing-queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tickers = await getLandingMarqueeTickers();
    return NextResponse.json(
      { count: tickers.length, tickers },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
