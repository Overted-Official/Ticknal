import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tickers, dailyPrices, systemLogs } from '@/db/schema';
import { sql, inArray } from 'drizzle-orm';
import TradingView from '@mathieuc/tradingview';
import type { TradingViewClient, TradingViewPeriod } from '@mathieuc/tradingview';
import { verifyCronAuth } from '@/lib/cron-auth';

const GLOBAL_ASSETS = [
  { symbol: 'GC1!', tvSymbol: 'COMEX:GC1!', name: 'Gold Futures', exchange: 'COMEX', sector: 'Macro', industry: 'Precious Metals' },
  { symbol: 'SI1!', tvSymbol: 'COMEX:SI1!', name: 'Silver Futures', exchange: 'COMEX', sector: 'Macro', industry: 'Precious Metals' },
  { symbol: 'USDEGP', tvSymbol: 'FX_IDC:USDEGP', name: 'USD to EGP', exchange: 'FX_IDC', sector: 'Macro', industry: 'Forex' }
];

function fetchSymbolPeriods(client: TradingViewClient, tvSymbol: string, rangeBars: number = 30): Promise<TradingViewPeriod[]> {
  return new Promise((resolve) => {
    try {
      const chart = new client.Session.Chart();
      chart.setMarket(tvSymbol, { timeframe: 'D', range: rangeBars });

      const timeout = setTimeout(() => {
        chart.delete();
        resolve([]);
      }, 8000);

      chart.onUpdate(() => {
        clearTimeout(timeout);
        const data = chart.periods;
        if (data && data.length > 0) {
          data.sort((a, b) => a.time - b.time);
          chart.delete();
          resolve(data);
        } else {
          chart.delete();
          resolve([]);
        }
      });

      chart.onError((err: Error) => {
        clearTimeout(timeout);
        chart.delete();
        console.error(`Error for ${tvSymbol}:`, err.message || err);
        resolve([]);
      });
    } catch {
      resolve([]);
    }
  });
}

export async function GET(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const symbols = GLOBAL_ASSETS.map(a => a.symbol);
    const lastDates = await db
      .select({
        tickerSymbol: dailyPrices.tickerSymbol,
        maxDate: sql<string>`MAX(${dailyPrices.date})`,
      })
      .from(dailyPrices)
      .where(inArray(dailyPrices.tickerSymbol, symbols))
      .groupBy(dailyPrices.tickerSymbol);

    const lastDateMap = new Map<string, string>();
    for (const row of lastDates) {
      if (row.tickerSymbol && row.maxDate) {
        lastDateMap.set(row.tickerSymbol, row.maxDate);
      }
    }

    const results: Array<any> = [];
    const client = new TradingView.Client();
    const now = new Date();

    for (const asset of GLOBAL_ASSETS) {
      try {
        const lastDateStr = lastDateMap.get(asset.symbol);
        let requiredRange = 30;

        if (!lastDateStr) {
          requiredRange = 300;
        } else {
          const lastDate = new Date(lastDateStr);
          const diffDays = Math.ceil((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 20) {
            requiredRange = Math.min(300, Math.max(30, Math.ceil(diffDays * 0.75) + 15));
          }
        }

        const periods = await fetchSymbolPeriods(client, asset.tvSymbol, requiredRange);

        if (periods.length > 0) {
          let updatedCount = 0;
          let latestDateStr = '';

          const valuesArray = periods.map(quote => {
            const dateStr = new Date(quote.time * 1000).toISOString().split('T')[0];
            if (dateStr > latestDateStr) latestDateStr = dateStr;
            return {
              tickerSymbol: asset.symbol,
              date: dateStr,
              open: quote.open.toString(),
              high: quote.max.toString(),
              low: quote.min.toString(),
              close: quote.close.toString(),
              volume: (quote.volume || 0).toString()
            };
          });

          if (valuesArray.length > 0) {
            const chunkSize = 1000;
            for (let i = 0; i < valuesArray.length; i += chunkSize) {
              const chunk = valuesArray.slice(i, i + chunkSize);
              await db.insert(dailyPrices)
                .values(chunk)
                .onConflictDoUpdate({
                  target: [dailyPrices.tickerSymbol, dailyPrices.date],
                  set: {
                    open: sql`excluded.open`,
                    high: sql`excluded.high`,
                    low: sql`excluded.low`,
                    close: sql`excluded.close`,
                    volume: sql`excluded.volume`
                  }
                });
              updatedCount += chunk.length;
            }
          }

          results.push({ symbol: asset.symbol, status: 'updated', count: updatedCount, date: latestDateStr });
        } else {
          results.push({ symbol: asset.symbol, status: 'no_data' });
        }

        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        results.push({ symbol: asset.symbol, status: 'error', message: (err as Error).message });
      }
    }

    client.end();

    try {
      revalidateTag('recent-prices', 'max' as any);
      revalidateTag('tickers', 'max' as any);
      revalidateTag('prices', 'max' as any);
      revalidatePath('/api/positions');
      revalidatePath('/positions');
    } catch {}

    const updated = results.filter(r => r.status === 'updated').length;
    await db.insert(systemLogs).values({
      source: 'cron-commodities',
      level: updated > 0 ? 'INFO' : 'WARNING',
      message: `Updated ${updated}/${GLOBAL_ASSETS.length} Global Commodities & Forex (Gold, Silver, USDEGP).`,
      metadata: { results }
    });

    return NextResponse.json({ message: 'Commodities and global assets update completed', results }, { status: 200 });
  } catch (error) {
    console.error('Error updating commodities:', error);
    await db.insert(systemLogs).values({
      source: 'cron-commodities',
      level: 'ERROR',
      message: 'Failed to update Global Commodities & Forex',
      metadata: { error: (error as Error).message }
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}
