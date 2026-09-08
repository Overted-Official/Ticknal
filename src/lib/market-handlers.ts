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

import { desc, eq } from 'drizzle-orm';
import { dailyPrices } from '@/db/schema';

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
      .select()
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

async function fallbackToDbQuote(cleanSym: string): Promise<Response> {
  const data = await getDbQuoteAndRanges(cleanSym);
  if (data) {
    return NextResponse.json(data);
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

  try {
    let tvSymbol = `EGX:${cleanSym}`;
    if (cleanSym === 'GC1!' || cleanSym === 'GC1' || cleanSym === 'GC' || cleanSym === 'GOLD' || cleanSym === 'XAUUSD') {
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

      const timeout = setTimeout(async () => {
        if (resolved) return;
        resolved = true;
        try {
          chart.delete();
          client.end();
        } catch {}
        const fallback = await fallbackToDbQuote(cleanSym);
        resolve(fallback);
      }, 3500);

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

        const currentPrice = current.close;
        const prevPrice = previous ? previous.close : current.open;
        const change = currentPrice - prevPrice;
        const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

        const dbRanges = await getDbQuoteAndRanges(cleanSym);

        try {
          chart.delete();
          client.end();
        } catch {}

        resolve(NextResponse.json({
          symbol: cleanSym,
          price: currentPrice,
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          open: current.open,
          high: current.max,
          low: current.min,
          dayHigh: current.max || dbRanges?.dayHigh || currentPrice,
          dayLow: current.min || dbRanges?.dayLow || currentPrice,
          yearHigh: dbRanges?.yearHigh || current.max || currentPrice,
          yearLow: dbRanges?.yearLow || current.min || currentPrice,
          volume: current.volume,
          updatedAt: new Date(current.time * 1000).toISOString()
        }));
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
    const allTickers = await db.select().from(tickers);
    return NextResponse.json(allTickers);
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

    return NextResponse.json({ opportunities }, { status: 200 });
  } catch (err: any) {
    console.error('API /api/opportunities error:', err);
    return NextResponse.json({ error: 'Failed to fetch opportunities', details: err?.message }, { status: 500 });
  }
}
