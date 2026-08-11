import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tickers, dailyPrices } from '@/db/schema';
import TradingView from '@mathieuc/tradingview';
import type { TradingViewClient, TradingViewPeriod } from '@mathieuc/tradingview';

// Helper to fetch data for one symbol using a promise
function fetchSymbolData(client: TradingViewClient, symbol: string): Promise<TradingViewPeriod | null> {
  return new Promise((resolve) => {
    try {
      const tvSymbol = `EGX:${symbol.replace('.CA', '')}`;
      const chart = new client.Session.Chart();
      
      chart.setMarket(tvSymbol, {
        timeframe: 'D',
        range: 2 // We just need today's close and maybe yesterday's
      });

      const timeout = setTimeout(() => {
        chart.delete();
        resolve(null);
      }, 5000);

      chart.onUpdate(() => {
        clearTimeout(timeout);
        const data = chart.periods;
        if (data && data.length > 0) {
          data.sort((a, b) => a.time - b.time);
          const current = data[data.length - 1];
          chart.delete();
          resolve(current);
        } else {
          chart.delete();
          resolve(null);
        }
      });

      chart.onError((err: Error) => {
        clearTimeout(timeout);
        chart.delete();
        console.error(`Error for ${symbol}:`, err.message || err);
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

export async function GET(req: Request) {
  // Ensure the cron is called with a secure secret in production
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allTickers = await db.select().from(tickers);

    if (allTickers.length === 0) {
      return NextResponse.json({ message: 'No tickers found to update.' }, { status: 200 });
    }

    const client = new TradingView.Client();
    const results: Array<{ symbol: string; status: string; date?: string; message?: string }> = [];

    for (const t of allTickers) {
      try {
        const quote = await fetchSymbolData(client, t.symbol);
        
        if (quote) {
          const dateStr = new Date(quote.time * 1000).toISOString().split('T')[0];

          await db.insert(dailyPrices)
            .values({
              tickerSymbol: t.symbol,
              date: dateStr,
              open: quote.open.toString(),
              high: quote.max.toString(),
              low: quote.min.toString(),
              close: quote.close.toString(),
              volume: quote.volume.toString()
            })
            .onConflictDoUpdate({
              target: [dailyPrices.tickerSymbol, dailyPrices.date],
              set: {
                open: quote.open.toString(),
                high: quote.max.toString(),
                low: quote.min.toString(),
                close: quote.close.toString(),
                volume: quote.volume.toString()
              }
            });
            
          results.push({ symbol: t.symbol, status: 'updated', date: dateStr });
        } else {
          results.push({ symbol: t.symbol, status: 'no_data' });
        }
        
        // Sleep to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        results.push({ symbol: t.symbol, status: 'error', message: (err as Error).message });
      }
    }
    
    client.end();
    return NextResponse.json({ message: 'Daily price update completed', results }, { status: 200 });

  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}
