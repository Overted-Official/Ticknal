import { unstable_cache } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { db } from '@/db';
import { dailyPrices, intradayCandles, tickers } from '@/db/schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';

// Fast in-memory cache to guarantee sub-millisecond responses on warm routes
let tickersMemCache: { data: any[]; timestamp: number } | null = null;
let tickersInFlight: Promise<any[]> | null = null;

let recentPricesMemCache: { data: any[]; timestamp: number } | null = null;
let recentPricesInFlight: Promise<any[]> | null = null;

/**
 * Fetches all tickers from the database.
 * Caches in memory for 1 hour (3600 seconds).
 */
export async function getCachedTickers(): Promise<any[]> {
  const now = Date.now();
  if (tickersMemCache && now - tickersMemCache.timestamp < 3600 * 1000) {
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
 * Fetches the complete or delta price history for a specific ticker.
 * Caches the result for 24 hours (86,400s) on the server.
 */
export const getCachedDailyPrices = async (ticker: string, limitBars?: number, sinceDate?: string) => {
  const cleanTicker = ticker.trim().toUpperCase().replace('.CA', '');
  const fetchPrices = async () => {
    const conditions = [eq(dailyPrices.tickerSymbol, cleanTicker)];
    if (sinceDate) {
      conditions.push(sql`${dailyPrices.date} >= ${sinceDate}`);
    }

    if (limitBars) {
      const rows = await db
        .select()
        .from(dailyPrices)
        .where(and(...conditions))
        .orderBy(desc(dailyPrices.date))
        .limit(limitBars);
      return rows.reverse();
    } else {
      return await db
        .select()
        .from(dailyPrices)
        .where(and(...conditions))
        .orderBy(asc(dailyPrices.date));
    }
  };

  try {
    const cacheKey = `daily-prices-${cleanTicker}-${limitBars ?? 'all'}-${sinceDate ?? 'all'}`;
    const cachedFn = unstable_cache(
      fetchPrices,
      [cacheKey],
      { tags: [`prices-${cleanTicker}`, 'prices'], revalidate: 86400 }
    );
    return await cachedFn();
  } catch (error) {
    // Fallback directly to DB query when running outside Next.js request lifecycle
    return await fetchPrices();
  }
};

/**
 * Fetches the 1-Hour intraday price history for a specific ticker.
 * Checks DB intraday_candles first, with fallback to local 1H CSV dataset.
 */
export const getCachedHourlyPrices = async (ticker: string, limitBars?: number) => {
  const fetchHourly = async () => {
    try {
      // 1. Try DB
      const query = db
        .select()
        .from(intradayCandles)
        .where(sql`${intradayCandles.tickerSymbol} = ${ticker} AND ${intradayCandles.timeframe} = '1h'`)
        .orderBy(asc(intradayCandles.timestamp));
      
      const rows = await query;
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          date: typeof r.timestamp === 'string' ? r.timestamp : (r.timestamp as Date).toISOString(),
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
        }));
      }
    } catch {}

    // 2. Fallback to local 1H CSV file
    try {
      const csvPath = path.resolve(process.cwd(), `_playground/QE-V1-Upgrade/_dataset/Intraday/1h/${ticker}.csv`);
      if (fs.existsSync(csvPath)) {
        const raw = fs.readFileSync(csvPath, 'utf8');
        const lines = raw.trim().split('\n');
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
          const dateIdx = headers.findIndex((h) => h === 'datetime' || h === 'date' || h === 'time');
          const openIdx = headers.indexOf('open');
          const highIdx = headers.indexOf('high');
          const lowIdx = headers.indexOf('low');
          const closeIdx = headers.indexOf('close');
          const volIdx = headers.indexOf('volume');

          const bars: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',').map((p) => p.trim());
            if (parts.length < 5) continue;
            const d = parts[dateIdx];
            const o = parseFloat(parts[openIdx]);
            const h = parseFloat(parts[highIdx]);
            const l = parseFloat(parts[lowIdx]);
            const c = parseFloat(parts[closeIdx]);
            const v = volIdx >= 0 ? parseFloat(parts[volIdx]) || 0 : 0;
            if (!isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c) && c > 0) {
              bars.push({
                date: d,
                open: String(o),
                high: String(h),
                low: String(l),
                close: String(c),
                volume: String(v),
              });
            }
          }
          return limitBars ? bars.slice(-limitBars) : bars;
        }
      }
    } catch {}

    // 3. Fallback to daily prices if 1H completely unavailable
    const dailyRows = await getCachedDailyPrices(ticker, limitBars);
    return dailyRows;
  };

  try {
    const cachedFn = unstable_cache(
      fetchHourly,
      [`hourly-prices-${ticker}-${limitBars ?? 'all'}`],
      { tags: [`prices-${ticker}-1h`, 'prices'], revalidate: 300 }
    );
    return await cachedFn();
  } catch {
    return await fetchHourly();
  }
};

/**
 * Fetches the latest 2 prices for all tickers using a Window Function.
 * Caches in memory for 5 minutes (300 seconds).
 */
export async function getCachedRecentPrices(): Promise<any[]> {
  const now = Date.now();
  if (recentPricesMemCache && now - recentPricesMemCache.timestamp < 300 * 1000) {
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
          WHERE date >= CURRENT_DATE - INTERVAL '45 days'
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
