import { NextResponse } from 'next/server';
import { 
  getHistoricalInflationSeries, 
  getLatestInflationRate, 
  getLatestUsCpiRate,
  syncAllMacroInflation 
} from '@/lib/cbe-inflation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sync = searchParams.get('sync') === 'true';

  try {
    if (sync) {
      await syncAllMacroInflation();
    }

    const series = await getHistoricalInflationSeries();
    const latestCbeRate = await getLatestInflationRate();
    const latestUsCpiRate = await getLatestUsCpiRate();

    return NextResponse.json({
      success: true,
      latestCbeRate,
      latestUsCpiRate,
      series,
    });
  } catch (err) {
    console.error('API /api/macro/inflation error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch inflation data' }, { status: 500 });
  }
}
