import { NextResponse } from 'next/server';
import TradingView from '@mathieuc/tradingview';

type TradingViewPeriod = {
  time: number;
  open: number;
  max: number;
  min: number;
  close: number;
  volume: number;
};

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const tvSymbol = `EGX:${symbol.replace('.CA', '')}`;

    return await new Promise<Response>((resolve) => {
      const client = new TradingView.Client();
      const chart = new client.Session.Chart();
      
      chart.setMarket(tvSymbol, {
        timeframe: 'D',
        range: 2 // Get last 2 days to get current and previous close
      });

      // Safety timeout
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

        // Sort ascending to get the newest at the end
        data.sort((a: TradingViewPeriod, b: TradingViewPeriod) => a.time - b.time);
        const current = data[data.length - 1];
        const previous = data.length > 1 ? data[data.length - 2] : current;

        const dateStr = new Date(current.time * 1000).toISOString().split('T')[0];

        chart.delete();
        client.end();

        resolve(NextResponse.json({
          symbol,
          date: dateStr,
          open: current.open,
          high: current.max,
          low: current.min,
          close: current.close,
          volume: current.volume,
          previousClose: previous.close
        }, { status: 200 }));
      });
      
      chart.onError((err: Error) => {
        clearTimeout(timeout);
        chart.delete();
        client.end();
        console.error('TradingView Error:', err);
        resolve(NextResponse.json({ error: 'TradingView error', details: err.message }, { status: 500 }));
      });
    });

  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
