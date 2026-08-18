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

type TradingViewPeriod = {
  time: number;
  open: number;
  max: number;
  min: number;
  close: number;
  volume: number;
};

export async function handleQuoteGet(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const cleanSym = symbol.trim().toUpperCase().replace('.CA', '');
    let tvSymbol = `EGX:${cleanSym}`;
    if (cleanSym === 'GC1!' || cleanSym === 'GC1' || cleanSym === 'GC' || cleanSym === 'GOLD' || cleanSym === 'XAUUSD') {
      tvSymbol = 'COMEX:GC1!';
    } else if (cleanSym === 'SI1!' || cleanSym === 'SI1' || cleanSym === 'SI' || cleanSym === 'SILVER' || cleanSym === 'XAGUSD') {
      tvSymbol = 'COMEX:SI1!';
    } else if (cleanSym === 'USDEGP' || cleanSym === 'USD/EGP' || cleanSym === 'USD-EGP') {
      tvSymbol = 'FX_IDC:USDEGP';
    }

    return await new Promise<Response>((resolve) => {
      const client = new TradingView.Client();
      const chart = new client.Session.Chart();
      
      chart.setMarket(tvSymbol, {
        timeframe: 'D',
        range: 2
      });

      const timeout = setTimeout(() => {
        chart.delete();
        client.end();
        resolve(NextResponse.json({ error: 'Timeout fetching data from TradingView' }, { status: 504 }));
      }, 5000);

      chart.onUpdate(() => {
        clearTimeout(timeout);
        const data = chart.periods;
        
        if (!data || data.length === 0) {
          chart.delete();
          client.end();
          return resolve(NextResponse.json({ error: 'No data found' }, { status: 404 }));
        }

        data.sort((a: TradingViewPeriod, b: TradingViewPeriod) => a.time - b.time);
        const current = data[data.length - 1];
        const previous = data.length > 1 ? data[data.length - 2] : null;

        const currentPrice = current.close;
        const prevPrice = previous ? previous.close : current.open;
        const change = currentPrice - prevPrice;
        const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

        chart.delete();
        client.end();

        resolve(NextResponse.json({
          symbol: cleanSym,
          price: currentPrice,
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          open: current.open,
          high: current.max,
          low: current.min,
          volume: current.volume,
          updatedAt: new Date(current.time * 1000).toISOString()
        }));
      });

      chart.onError((err: Error) => {
        clearTimeout(timeout);
        chart.delete();
        client.end();
        console.error('TradingView quote error:', err);
        resolve(NextResponse.json({ error: 'Failed to fetch quote data' }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error('Quote handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
