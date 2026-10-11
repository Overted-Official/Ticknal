import TradingView from '@mathieuc/tradingview';
import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import {
  getAssetClass,
  isMarketOpen,
  getTradingViewSymbol,
  getCairoTime,
  type AssetClass,
} from '@/lib/market/market-schedules';

export interface IntradayBar {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IntradayResponse {
  active: boolean;
  ticker?: string;
  assetClass?: AssetClass;
  reason?: string;
  bar?: IntradayBar;
  updatedAt?: string;
}

// In-memory cache to deduplicate concurrent requests across serverless runs (3 minutes TTL)
const MEMORY_CACHE_TTL_MS = 180 * 1000;
const memoryCache = new Map<string, { response: IntradayResponse; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<IntradayResponse>>();

// Cached USDEGP exchange rate
let cachedUsdEgpRate = 50.0;
let lastUsdEgpFetchTime = 0;

export async function getUsdEgpRate(): Promise<number> {
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

export async function fetchTradingViewBar(tvSymbol: string): Promise<any | null> {
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

/**
 * Fetches today's live 15-minute delayed bar for a single instrument.
 * Returns null if the market is closed or the asset is excluded (e.g. Funds).
 */
export async function getIntradayBar(symbol: string, sectorOverride?: string | null): Promise<IntradayResponse> {
  const cleanTicker = symbol.replace('.CA', '').trim().toUpperCase();

  let sector = sectorOverride;
  if (sector === undefined) {
    try {
      const record = await db.query.tickers.findFirst({
        where: eq(tickers.symbol, cleanTicker),
        columns: { sector: true },
      });
      sector = record?.sector || null;
    } catch {
      sector = null;
    }
  }

  const assetClass = getAssetClass(cleanTicker, sector);

  // 1. Funds are strictly excluded from intraday streaming
  if (assetClass === 'FUNDS') {
    return { active: false, ticker: cleanTicker, assetClass, reason: 'funds_excluded' };
  }

  if (assetClass === 'EXCLUDED') {
    return { active: false, ticker: cleanTicker, assetClass, reason: 'asset_excluded' };
  }

  // 2. Gating by market operating schedule
  if (!isMarketOpen(assetClass)) {
    return { active: false, ticker: cleanTicker, assetClass, reason: 'market_closed' };
  }

  // 3. Check memory cache
  const cached = memoryCache.get(cleanTicker);
  const now = Date.now();
  if (cached && now - cached.timestamp < MEMORY_CACHE_TTL_MS) {
    return cached.response;
  }

  // 4. In-flight request deduplication
  if (inFlightRequests.has(cleanTicker)) {
    return inFlightRequests.get(cleanTicker)!;
  }

  const fetchPromise = (async (): Promise<IntradayResponse> => {
    try {
      const tvSymbol = getTradingViewSymbol(cleanTicker);
      const rawBar = await fetchTradingViewBar(tvSymbol);

      if (!rawBar) {
        return { active: false, ticker: cleanTicker, assetClass, reason: 'feed_unavailable' };
      }

      const dateObj = new Date(rawBar.time * 1000);
      const cairo = getCairoTime(dateObj);
      const timeStr = cairo.dateStr;

      let open = Number(rawBar.open);
      let high = Number(rawBar.max);
      let low = Number(rawBar.min);
      let close = Number(rawBar.close);
      const volume = Number(rawBar.volume || 0);

      // Commodity (Gold/Silver) conversion from USD/oz to EGP/gram
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
    } catch {
      return { active: false, ticker: cleanTicker, assetClass, reason: 'fetch_error' };
    } finally {
      inFlightRequests.delete(cleanTicker);
    }
  })();

  inFlightRequests.set(cleanTicker, fetchPromise);
  return fetchPromise;
}

/**
 * Returns a map of live 15-minute delayed prices for an arbitrary list of symbols.
 * Automatically gates by asset class and market schedule (e.g. skips funds and closed markets).
 */
export async function getIntradayPriceMap(symbols: string[]): Promise<Record<string, number>> {
  if (!symbols || symbols.length === 0) return {};

  const cleanSymbols = Array.from(
    new Set(symbols.map((s) => s.replace('.CA', '').trim().toUpperCase()))
  );

  // Look up sectors in batch
  const sectorMap = new Map<string, string>();
  try {
    const rows = await db
      .select({ symbol: tickers.symbol, sector: tickers.sector })
      .from(tickers)
      .where(inArray(tickers.symbol, cleanSymbols));
    for (const r of rows) {
      if (r.sector) sectorMap.set(r.symbol, r.sector);
    }
  } catch {}

  // Filter to symbols whose market is actually open right now
  const activeSymbols = cleanSymbols.filter((sym) => {
    const assetClass = getAssetClass(sym, sectorMap.get(sym));
    return isMarketOpen(assetClass);
  });

  if (activeSymbols.length === 0) {
    return {};
  }

  // Fetch in parallel (bounded to small position count)
  const results = await Promise.allSettled(
    activeSymbols.map((sym) => getIntradayBar(sym, sectorMap.get(sym)))
  );

  const priceMap: Record<string, number> = {};
  for (let i = 0; i < activeSymbols.length; i++) {
    const sym = activeSymbols[i];
    const res = results[i];
    if (res.status === 'fulfilled' && res.value.active && res.value.bar) {
      priceMap[sym] = res.value.bar.close;
      // Also map with .CA suffix if requested
      priceMap[`${sym}.CA`] = res.value.bar.close;
    }
  }

  return priceMap;
}
