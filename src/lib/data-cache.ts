import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

/**
 * Fetches all tickers from the database.
 * Caches the result for 1 hour.
 */
export const getCachedTickers = unstable_cache(
  async () => {
    return await db.select().from(tickers);
  },
  ['all-tickers'],
  { tags: ['tickers'], revalidate: 3600 }
);

/**
 * Fetches the complete price history for a specific ticker.
 * Caches the result for 1 hour.
 */
export const getCachedDailyPrices = async (ticker: string) => {
  const cachedFn = unstable_cache(
    async () => {
      return await db
        .select()
        .from(dailyPrices)
        .where(eq(dailyPrices.tickerSymbol, ticker))
        .orderBy(asc(dailyPrices.date));
    },
    [`daily-prices-${ticker}`],
    { tags: [`prices-${ticker}`, 'prices'], revalidate: 3600 }
  );
  return cachedFn();
};

/**
 * Fetches the latest 2 prices for all tickers using a Window Function.
 * Caches the result for 15 minutes.
 */
export const getCachedRecentPrices = unstable_cache(
  async () => {
    const recentPricesQuery = sql`
      WITH RankedPrices AS (
        SELECT ticker_symbol, close,
               ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) as rn
        FROM daily_prices
      )
      SELECT ticker_symbol, close, rn
      FROM RankedPrices
      WHERE rn <= 2;
    `;
    return await db.execute(recentPricesQuery);
  },
  ['recent-prices-all'],
  { tags: ['recent-prices'], revalidate: 900 }
);
