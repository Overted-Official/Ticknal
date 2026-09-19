import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPrices, intradayCandles } from '@/db/schema';
import { eq, and, gt, asc } from 'drizzle-orm';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';

export async function handleHistoryGet(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSymbol = searchParams.get('ticker') || searchParams.get('symbol');
    if (!rawSymbol) {
      return NextResponse.json({ error: 'Missing ticker query parameter' }, { status: 400 });
    }

    const symbol = normalizeTickerSymbol(rawSymbol);
    const timeframe = (searchParams.get('timeframe') || 'D').toUpperCase();
    const since = searchParams.get('since');
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

    const isIntraday = timeframe === '1H' || timeframe === '60' || timeframe === '15M';

    if (isIntraday) {
      const tf = timeframe === '15M' ? '15m' : '1h';
      const conditions = [
        eq(intradayCandles.tickerSymbol, symbol),
        eq(intradayCandles.timeframe, tf),
      ];

      if (since) {
        conditions.push(gt(intradayCandles.timestamp, new Date(since)));
      }

      let query = db
        .select()
        .from(intradayCandles)
        .where(and(...conditions))
        .orderBy(asc(intradayCandles.timestamp));

      if (limit && Number.isFinite(limit) && limit > 0) {
        query = query.limit(limit) as any;
      }

      const rows = await query;
      const bars = rows.map((r) => ({
        time: typeof r.timestamp === 'string' ? r.timestamp : new Date(r.timestamp).toISOString(),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        volume: Number(r.volume || 0),
      }));

      return NextResponse.json(
        { symbol, timeframe, count: bars.length, since: since || null, bars },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=86400',
          },
        }
      );
    }

    // Daily timeframe (default)
    const conditions = [eq(dailyPrices.tickerSymbol, symbol)];
    if (since) {
      conditions.push(gt(dailyPrices.date, since));
    }

    let query = db
      .select({
        date: dailyPrices.date,
        open: dailyPrices.open,
        high: dailyPrices.high,
        low: dailyPrices.low,
        close: dailyPrices.close,
        volume: dailyPrices.volume,
      })
      .from(dailyPrices)
      .where(and(...conditions))
      .orderBy(asc(dailyPrices.date));

    if (limit && Number.isFinite(limit) && limit > 0) {
      query = query.limit(limit) as any;
    }

    const rows = await query;
    const bars = rows.map((r) => ({
      time: r.date,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume || 0),
    }));

    return NextResponse.json(
      { symbol, timeframe: 'D', count: bars.length, since: since || null, bars },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in handleHistoryGet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
