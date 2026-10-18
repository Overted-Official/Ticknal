import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { dailyPrices, marketNews } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { screenAndIngestWires } from '@/lib/news/wire-screener';
import { generateAllDailyTakes } from '@/lib/news/ticknal-take-generator';
import { generateDailyTickerSummaries, seedHistoricalTickerSummaries } from '@/lib/news/ticker-summary-service';
import { purgeLegacyNews, ensureMarketNewsTable } from '@/lib/news/news-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function handleNewsSync(request: NextRequest) {
  const url = new URL(request.url);
  const action = (url.searchParams.get('action') || 'wire').toLowerCase();

  try {
    let result: Record<string, unknown> = {};

    switch (action) {
      case 'purge': {
        const purgeResult = await purgeLegacyNews(false);
        result = { action: 'purge', ...purgeResult };
        break;
      }
      case 'takes': {
        const takesResult = await generateAllDailyTakes();
        result = { action: 'takes', ...takesResult };
        break;
      }
      case 'ticker_summaries': {
        const targetDate = url.searchParams.get('date') || undefined;
        const tickerResult = await generateDailyTickerSummaries({ targetDate });
        result = { action: 'ticker_summaries', ...tickerResult };
        break;
      }
      case 'reseed_historical_tickers': {
        const count = await seedHistoricalTickerSummaries();
        result = { action: 'reseed_historical_tickers', count };
        break;
      }
      case 'full':
      case 'full_pipeline': {
        const tickerResult = await generateDailyTickerSummaries();
        const takesResult = await generateAllDailyTakes();
        result = { action: 'full_pipeline', tickers: tickerResult, takes: takesResult };
        break;
      }
      case 'wire':
      default: {
        const tickerResult = await generateDailyTickerSummaries();
        let takesResult: unknown = undefined;
        try {
          await ensureMarketNewsTable();
          const latestEgxRow = await db
            .select({ date: dailyPrices.date })
            .from(dailyPrices)
            .where(eq(dailyPrices.tickerSymbol, 'EGX30'))
            .orderBy(desc(dailyPrices.date))
            .limit(1);
          const latestDate = latestEgxRow[0]?.date ? String(latestEgxRow[0].date).slice(0, 10) : null;
          if (latestDate) {
            const existingTakes = await db
              .select({ count: sql<number>`count(*)` })
              .from(marketNews)
              .where(sql`${marketNews.id} LIKE ${`take-${latestDate}-%`}`);
            if (Number(existingTakes[0]?.count || 0) < 5) {
              takesResult = await generateAllDailyTakes();
            }
          }
        } catch {}
        result = { action: 'wire', tickers: tickerResult, ...(takesResult ? { takes: takesResult } : {}) };
        break;
      }
    }

    try {
      revalidatePath('/news');
      revalidatePath('/home');
      revalidatePath('/markets');
    } catch {}

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[API /api/news/sync] Error processing news action:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process news pipeline' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleNewsSync(request);
}

export async function GET(request: NextRequest) {
  return handleNewsSync(request);
}

