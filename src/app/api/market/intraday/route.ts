import { NextRequest, NextResponse } from 'next/server';
import TradingView from '@mathieuc/tradingview';
import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  getAssetClass,
  isMarketOpen,
  getTradingViewSymbol,
  getCairoTime,
  type AssetClass,
} from '@/lib/market/market-schedules';

export const dynamic = 'force-dynamic';

interface IntradayBar {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IntradayResponse {
  active: boolean;
  ticker?: string;
  assetClass?: AssetClass;
  reason?: string;
  bar?: IntradayBar;
  updatedAt?: string;
}

// In-memory cache to deduplicate concurrent requests on warm serverless instances (3 minutes TTL)
const MEMORY_CACHE_TTL_MS = 180 * 1000;
const memoryCache = new Map<string, { response: IntradayResponse; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<IntradayResponse>>();

// Cached USDEGP exchange rate
let cachedUsdEgpRate = 50.0;
let lastUsdEgpFetchTime = 0;

async function getUsdEgpRate(): Promise<number> {
  const now = Date.now();
  if (now - lastUsdEgpFetchTime < 10 * 60 * 1000) {
    return cachedUsdEgpRate;
  }

  try {
    const usdRow = await db.query.dailyPrices.findFirst({
      where: eq(dailyPrices.tickerSymbol, 'USDEGP'),
      orderBy: desc(dailyPrices.date),
    });
    if (usdRow && usdRow.close) {
      cachedUsdEgpRate = Number(usdRow.close);
      lastUsdEgpFetchTime = now;
    }
  } catch {
    // Keep fallback
  }

  return cachedUsdEgpRate;
}

async function fetchTradingViewBar(tvSymbol: string): Promise<any | null> {
  return new Promise((resolve) => {
    let client: any = null;
    let chart: any = null;
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { chart?.delete(); } catch {}
      try { client?.end(); } catch {}
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);

    try {
      client = new TradingView.Client();
      chart = new client.Session.Chart();
      chart.setMarket(tvSymbol, { timeframe: 'D', range: 5, adjustment: 'splits' });

      chart.onUpdate(() => {
        const periods = chart.periods;
        cleanup();
        if (periods && periods.length > 0) {
          const last = periods[periods.length - 1];
          resolve(last);
        } else {
          resolve(null);
        }
      });

      chart.onError(() => {
        cleanup();
        resolve(null);
      });
    } catch {
      cleanup();
      resolve(null);
    }
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTicker = searchParams.get('ticker');

  if (!rawTicker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  const cleanTicker = rawTicker.replace('.CA', '').trim().toUpperCase();

  // 1. Identify asset class & sector
  let sector: string | null = null;
  try {
    const tickerRecord = await db.query.tickers.findFirst({
      where: eq(tickers.symbol, cleanTicker),
      columns: { sector: true },
    });
    sector = tickerRecord?.sector || null;
  } catch {
    // Fallback if DB lookup fails
  }

  const assetClass = getAssetClass(cleanTicker, sector);

  // 2. Funds are strictly excluded from intraday streaming
  if (assetClass === 'FUNDS') {
    return NextResponse.json(
      { active: false, ticker: cleanTicker, assetClass, reason: 'funds_excluded' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
        },
      }
    );
  }

  if (assetClass === 'EXCLUDED') {
    return NextResponse.json(
      { active: false, ticker: cleanTicker, assetClass, reason: 'asset_excluded' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
        },
      }
    );
  }

  // 3. Verify if market is currently active
  const isLive = isMarketOpen(assetClass);
  if (!isLive) {
    return NextResponse.json(
      { active: false, ticker: cleanTicker, assetClass, reason: 'market_closed' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
        },
      }
    );
  }

  // 4. Check warm memory cache
  const cached = memoryCache.get(cleanTicker);
  const now = Date.now();
  if (cached && now - cached.timestamp < MEMORY_CACHE_TTL_MS) {
    return NextResponse.json(cached.response, {
      headers: {
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
      },
    });
  }

  // 5. In-flight request deduplication
  if (inFlightRequests.has(cleanTicker)) {
    const response = await inFlightRequests.get(cleanTicker)!;
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
      },
    });
  }

  const fetchPromise = (async (): Promise<IntradayResponse> => {
    try {
      const tvSymbol = getTradingViewSymbol(cleanTicker);
      const rawBar = await fetchTradingViewBar(tvSymbol);

      if (!rawBar) {
        return { active: false, ticker: cleanTicker, assetClass, reason: 'feed_unavailable' };
      }

      // Format ISO date (YYYY-MM-DD in Cairo)
      const dateObj = new Date(rawBar.time * 1000);
      const cairo = getCairoTime(dateObj);
      const timeStr = cairo.dateStr;

      let open = Number(rawBar.open);
      let high = Number(rawBar.max);
      let low = Number(rawBar.min);
      let close = Number(rawBar.close);
      const volume = Number(rawBar.volume || 0);

      // Precious metals (COMEX GC1! / SI1!) conversion: USD/oz -> EGP/gram
      if (cleanTicker === 'GC1!' || cleanTicker === 'SI1!') {
        const usdRate = await getUsdEgpRate();
        const ozToGrams = 31.1034768;
        const convert = (usdVal: number) => Number(((usdVal * usdRate) / ozToGrams).toFixed(2));

        open = convert(open);
        high = convert(high);
        low = convert(low);
        close = convert(close);
      }

      const bar: IntradayBar = {
        time: timeStr,
        open,
        high,
        low,
        close,
        volume,
      };

      const response: IntradayResponse = {
        active: true,
        ticker: cleanTicker,
        assetClass,
        bar,
        updatedAt: new Date().toISOString(),
      };

      memoryCache.set(cleanTicker, { response, timestamp: Date.now() });
      return response;
    } catch (err) {
      return { active: false, ticker: cleanTicker, assetClass, reason: 'fetch_error' };
    } finally {
      inFlightRequests.delete(cleanTicker);
    }
  })();

  inFlightRequests.set(cleanTicker, fetchPromise);
  const responseData = await fetchPromise;

  return NextResponse.json(responseData, {
    headers: {
      'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
    },
  });
}
