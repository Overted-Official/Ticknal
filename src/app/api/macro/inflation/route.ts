import { NextResponse } from 'next/server';
import { db } from '@/db';
import { macroInflationRates } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getHistoricalInflationSeries, scrapeLatestCbeInflation, getLatestInflationRate } from '@/lib/cbe-inflation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sync = searchParams.get('sync') === 'true';

  try {
    if (sync) {
      const scraped = await scrapeLatestCbeInflation();
      if (scraped) {
        await db
          .insert(macroInflationRates)
          .values({
            yearMonth: scraped.yearMonth,
            cbeHeadlineInflation: String(scraped.headlineYoY),
            cbeCoreInflation: String(scraped.coreYoY),
            notes: scraped.notes,
          })
          .onConflictDoUpdate({
            target: macroInflationRates.yearMonth,
            set: {
              cbeHeadlineInflation: String(scraped.headlineYoY),
              cbeCoreInflation: String(scraped.coreYoY),
              notes: scraped.notes,
              updatedAt: sql`now()`,
            },
          });
      }
    }

    const series = await getHistoricalInflationSeries();
    const latestRate = await getLatestInflationRate();

    return NextResponse.json({
      success: true,
      latestRate,
      series,
    });
  } catch (err) {
    console.error('API /api/macro/inflation error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch inflation data' }, { status: 500 });
  }
}
