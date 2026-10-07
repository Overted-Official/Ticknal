import { NextResponse } from 'next/server';
import { getLandingCoverageCardsData } from '@/lib/server/landing-queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cards = await getLandingCoverageCardsData();
    return NextResponse.json(
      { cards },
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
