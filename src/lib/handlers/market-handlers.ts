import { NextResponse } from 'next/server';
import TradingView from '@mathieuc/tradingview';
import { db } from '@/db';
import { tickers } from '@/db/schema';
import { 
  getHistoricalInflationSeries, 
  getLatestInflationRate, 
  getLatestUsCpiRate,
  syncAllMacroInflation 
} from '@/lib/cbe-inflation';

import { desc, eq, sql } from 'drizzle-orm';
import { dailyPrices, macroMoneySupply } from '@/db/schema';
import { getCachedTickers, getCachedRecentPrices } from '@/lib/data-cache';

type TradingViewPeriod = {
  time: number;
  open: number;
  max: number;
  min: number;
  close: number;
  volume: number;
};

async function getDbQuoteAndRanges(cleanSym: string) {
  try {
    const rows = await db
      .select({
        tickerSymbol: dailyPrices.tickerSymbol,
        date: dailyPrices.date,
        open: dailyPrices.open,
        high: dailyPrices.high,
        low: dailyPrices.low,
        close: dailyPrices.close,
        volume: dailyPrices.volume,
      })
      .from(dailyPrices)
      .where(eq(dailyPrices.tickerSymbol, cleanSym))
      .orderBy(desc(dailyPrices.date))
      .limit(365);

    if (rows && rows.length > 0) {
      const current = rows[0];
      const previous = rows.length > 1 ? rows[1] : null;
      const currentPrice = Number(current.close);
      const prevPrice = previous ? Number(previous.close) : Number(current.open);
      const change = currentPrice - prevPrice;
      const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

      const dayHigh = Number(current.high);
      const dayLow = Number(current.low);
      const yearHigh = Math.max(...rows.map((r) => Number(r.high)));
      const yearLow = Math.min(...rows.map((r) => Number(r.low)));

      return {
        symbol: cleanSym,
        price: currentPrice,
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        open: Number(current.open),
        high: dayHigh,
        low: dayLow,
        dayHigh,
        dayLow,
        yearHigh,
        yearLow,
        volume: Number(current.volume || 0),
        updatedAt: typeof current.date === 'string' ? current.date : new Date(current.date as Date).toISOString(),
        source: 'database'
      };
    }
  } catch (err) {
    console.error('Database quote error:', err);
  }
  return null;
}

const QUOTE_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
};

const quoteMemoryCache = new Map<string, { data: any; timestamp: number }>();
const QUOTE_CACHE_TTL = 30 * 1000; // 30s in-memory cache per lambda

async function fallbackToDbQuote(cleanSym: string): Promise<Response> {
  const data = await getDbQuoteAndRanges(cleanSym);
  if (data) {
    quoteMemoryCache.set(cleanSym, { data, timestamp: Date.now() });
    return NextResponse.json(data, { headers: QUOTE_CACHE_HEADERS });
  }
  return NextResponse.json({ error: 'No quote data available' }, { status: 404 });
}

export async function handleQuoteGet(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const cleanSym = symbol.trim().toUpperCase().replace('.CA', '');

  // 1. Fast in-memory cache check (sub-millisecond, zero CPU & zero network)
  const now = Date.now();
  const cached = quoteMemoryCache.get(cleanSym);
  if (cached && now - cached.timestamp < QUOTE_CACHE_TTL) {
    return NextResponse.json(cached.data, { headers: QUOTE_CACHE_HEADERS });
  }

  try {
    let tvSymbol = `EGX:${cleanSym}`;
    if (cleanSym === 'EGX30') {
      tvSymbol = 'EGX:EGX30CAPPED';
    } else if (cleanSym === 'EGX70') {
      tvSymbol = 'EGX:EGX70EWI';
    } else if (cleanSym === 'EGX100') {
      tvSymbol = 'EGX:EGX100EWI';
    } else if (cleanSym === 'GC1!' || cleanSym === 'GC1' || cleanSym === 'GC' || cleanSym === 'GOLD' || cleanSym === 'XAUUSD') {
      tvSymbol = 'COMEX:GC1!';
    } else if (cleanSym === 'SI1!' || cleanSym === 'SI1' || cleanSym === 'SI' || cleanSym === 'SILVER' || cleanSym === 'XAGUSD') {
      tvSymbol = 'COMEX:SI1!';
    } else if (cleanSym === 'USDEGP' || cleanSym === 'USD/EGP' || cleanSym === 'USD-EGP') {
      tvSymbol = 'FX_IDC:USDEGP';
    }

    return await new Promise<Response>((resolve) => {
      let resolved = false;
      const client = new TradingView.Client();
      const chart = new client.Session.Chart();
      
      chart.setMarket(tvSymbol, {
        timeframe: 'D',
        range: 2
      });

      // Cap timeout at 1800ms to avoid burning expensive lambda execution duration
      const timeout = setTimeout(async () => {
        if (resolved) return;
        resolved = true;
        try {
          chart.delete();
          client.end();
        } catch {}
        const fallback = await fallbackToDbQuote(cleanSym);
        resolve(fallback);
      }, 3000);

      chart.onUpdate(async () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        const data = chart.periods;
        
        if (!data || data.length === 0) {
          try {
            chart.delete();
            client.end();
          } catch {}
          return fallbackToDbQuote(cleanSym).then(resolve);
        }

        data.sort((a: TradingViewPeriod, b: TradingViewPeriod) => a.time - b.time);
        const current = data[data.length - 1];
        const previous = data.length > 1 ? data[data.length - 2] : null;

        let currentPrice = current.close;
        let prevPrice = previous ? previous.close : current.open;
        let openPrice = current.open;
        let highPrice = current.max;
        let lowPrice = current.min;

        if (cleanSym === 'GC1!' || cleanSym === 'GOLD' || cleanSym === 'SI1!' || cleanSym === 'SILVER') {
          const latestUsd = await db.query.dailyPrices.findFirst({
            where: eq(dailyPrices.tickerSymbol, 'USDEGP'),
            orderBy: [desc(dailyPrices.date)],
          });
          const rate = latestUsd ? Number(latestUsd.close) : 52.0;
          const OZ_TO_GRAMS = 31.1034768;
          currentPrice = Number(((currentPrice * rate) / OZ_TO_GRAMS).toFixed(2));
          prevPrice = Number(((prevPrice * rate) / OZ_TO_GRAMS).toFixed(2));
          openPrice = Number(((openPrice * rate) / OZ_TO_GRAMS).toFixed(2));
          highPrice = Number(((highPrice * rate) / OZ_TO_GRAMS).toFixed(2));
          lowPrice = Number(((lowPrice * rate) / OZ_TO_GRAMS).toFixed(2));
        }

        const change = currentPrice - prevPrice;
        const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

        const dbRanges = await getDbQuoteAndRanges(cleanSym);

        try {
          chart.delete();
          client.end();
        } catch {}

        const payload = {
          symbol: cleanSym,
          price: currentPrice,
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          open: openPrice,
          high: highPrice,
          low: lowPrice,
          dayHigh: highPrice || dbRanges?.dayHigh || currentPrice,
          dayLow: lowPrice || dbRanges?.dayLow || currentPrice,
          yearHigh: dbRanges?.yearHigh || highPrice || currentPrice,
          yearLow: dbRanges?.yearLow || lowPrice || currentPrice,
          volume: current.volume,
          updatedAt: new Date(current.time * 1000).toISOString()
        };

        quoteMemoryCache.set(cleanSym, { data: payload, timestamp: Date.now() });
        resolve(NextResponse.json(payload, { headers: QUOTE_CACHE_HEADERS }));
      });

      chart.onError(async (err: Error) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        try {
          chart.delete();
          client.end();
        } catch {}
        console.warn('TradingView quote error, using DB fallback:', err.message);
        const fallback = await fallbackToDbQuote(cleanSym);
        resolve(fallback);
      });
    });
  } catch (error) {
    console.warn('Quote handler error, falling back to DB:', error);
    return fallbackToDbQuote(cleanSym);
  }
}

export async function handleTickersGet() {
  try {
    const [allTickers, recentPricesRows] = await Promise.all([
      getCachedTickers(),
      getCachedRecentPrices().catch(() => []),
    ]);

    const priceMap: Record<string, { lastPrice: number; prevPrice: number }> = {};
    for (const row of (recentPricesRows || [])) {
      const sym = (row.ticker_symbol as string)?.toUpperCase();
      const close = Number(row.close);
      const rn = Number(row.rn);
      if (!priceMap[sym]) priceMap[sym] = { lastPrice: 0, prevPrice: 0 };
      if (rn === 1) priceMap[sym].lastPrice = close;
      if (rn === 2) priceMap[sym].prevPrice = close;
    }

    const enrichedTickers = allTickers.map((t) => {
      const cleanSym = (t.symbol || '').replace('.CA', '').toUpperCase();
      const p = priceMap[cleanSym] || { lastPrice: 0, prevPrice: 0 };
      const price = p.lastPrice || 0;
      const change = p.prevPrice && price ? price - p.prevPrice : 0;
      const changePct = p.prevPrice && p.prevPrice > 0 && price ? (change / p.prevPrice) * 100 : 0;
      return {
        ...t,
        price,
        change,
        changePct,
      };
    });

    return NextResponse.json(enrichedTickers, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching tickers:', error);
    return NextResponse.json({ error: 'Failed to fetch tickers' }, { status: 500 });
  }
}

export async function handleInflationGet(request: Request) {
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
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('API /api/market/inflation error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch inflation data' }, { status: 500 });
  }
}

export async function handleOpportunitiesGet(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const requestedBars = parseInt(searchParams.get('bars') || searchParams.get('limitBars') || '5', 10);
    const limitBars = Math.min(20, Math.max(1, Number.isFinite(requestedBars) ? requestedBars : 5));
    const strategyScope = searchParams.get('strategy') || searchParams.get('scope') || 'all';

    const { getRecentOpportunities } = await import('@/lib/opportunities');
    const opportunities = await getRecentOpportunities(limitBars, strategyScope);

    return NextResponse.json({ opportunities }, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' },
    });
  } catch (err: any) {
    console.error('API /api/opportunities error:', err);
    return NextResponse.json({ error: 'Failed to fetch opportunities', details: err?.message }, { status: 500 });
  }
}

export async function handleMoneySupplyGet(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const indicator = searchParams.get('indicator');

    let query = sql`
      SELECT 
        date,
        indicator,
        value::numeric as value,
        change::numeric as change,
        change_percent::numeric as change_percent
      FROM macro_money_supply
    `;
    if (indicator) {
      query = sql`${query} WHERE indicator = ${indicator.toUpperCase()}`;
    }
    query = sql`${query} ORDER BY date ASC;`;

    const result: any = await db.execute(query);
    const rows = Array.isArray(result) ? result : result?.rows ?? [];

    const data: Record<string, {
      indicator: string;
      latest: {
        date: string;
        value: number;
        change: number;
        changePercent: number;
      } | null;
      history: Array<{
        date: string;
        value: number;
        change: number;
        changePercent: number;
      }>;
    }> = {};

    for (const r of rows) {
      const ind = String(r.indicator);
      if (!data[ind]) {
        data[ind] = { indicator: ind, latest: null, history: [] };
      }
      const entry = {
        date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0],
        value: Number(r.value),
        change: Number(r.change || 0),
        changePercent: Number(r.change_percent || 0),
      };
      data[ind].history.push(entry);
      data[ind].latest = entry;
    }

    return NextResponse.json({
      success: true,
      data,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err: any) {
    console.error('API /api/macro/money-supply error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch money supply data' }, { status: 500 });
  }
}
