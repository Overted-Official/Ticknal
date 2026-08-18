import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { eq, asc, desc, sql } from 'drizzle-orm';

// Fast in-memory cache to guarantee sub-millisecond responses on warm routes
let tickersMemCache: { data: any[]; timestamp: number } | null = null;
let tickersInFlight: Promise<any[]> | null = null;

let recentPricesMemCache: { data: any[]; timestamp: number } | null = null;
let recentPricesInFlight: Promise<any[]> | null = null;

/**
 * Fetches all tickers from the database.
 * Caches in memory for 15 minutes, Next.js cache for 1 hour.
 */
export async function getCachedTickers(): Promise<any[]> {
  const now = Date.now();
  if (tickersMemCache && now - tickersMemCache.timestamp < 15 * 60 * 1000) {
    return tickersMemCache.data;
  }
  if (tickersInFlight) return tickersInFlight;

  tickersInFlight = (async () => {
    try {
      const data = await db.select().from(tickers);
      tickersMemCache = { data, timestamp: Date.now() };
      return data;
    } finally {
      tickersInFlight = null;
    }
  })();

  return tickersInFlight;
}

/**
 * Fetches the complete price history for a specific ticker.
 * Caches the result for 1 hour.
 */
export const getCachedDailyPrices = async (ticker: string, limitBars?: number) => {
  const fetchPrices = async () => {
    if (limitBars) {
      const rows = await db
        .select()
        .from(dailyPrices)
        .where(eq(dailyPrices.tickerSymbol, ticker))
        .orderBy(desc(dailyPrices.date))
        .limit(limitBars);
      return rows.reverse();
    } else {
      return await db
        .select()
        .from(dailyPrices)
        .where(eq(dailyPrices.tickerSymbol, ticker))
        .orderBy(asc(dailyPrices.date));
    }
  };

  try {
    const cachedFn = unstable_cache(
      fetchPrices,
      [`daily-prices-${ticker}-${limitBars ?? 'all'}`],
      { tags: [`prices-${ticker}`, 'prices'], revalidate: 3600 }
    );
    return await cachedFn();
  } catch (error) {
    // Fallback directly to DB query when running outside Next.js request lifecycle
    return await fetchPrices();
  }
};

/**
 * Fetches the latest 2 prices for all tickers using a Window Function.
 * Caches in memory for 30 seconds.
 */
export async function getCachedRecentPrices(): Promise<any[]> {
  const now = Date.now();
  if (recentPricesMemCache && now - recentPricesMemCache.timestamp < 30 * 1000) {
    return recentPricesMemCache.data;
  }
  if (recentPricesInFlight) return recentPricesInFlight;

  recentPricesInFlight = (async () => {
    try {
      const recentPricesQuery = sql`
        WITH RankedPrices AS (
          SELECT ticker_symbol, close, volume,
                 ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) as rn
          FROM daily_prices
        )
        SELECT ticker_symbol, close, volume, rn
        FROM RankedPrices
        WHERE rn <= 2;
      `;
      const data = await db.execute(recentPricesQuery);
      recentPricesMemCache = { data: data as any[], timestamp: Date.now() };
      return data as any[];
    } finally {
      recentPricesInFlight = null;
    }
  })();

  return recentPricesInFlight;
}
