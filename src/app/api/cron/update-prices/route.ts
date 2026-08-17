import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tickers, dailyPrices } from '@/db/schema';
import { sql } from 'drizzle-orm';
import TradingView from '@mathieuc/tradingview';
import type { TradingViewClient, TradingViewPeriod } from '@mathieuc/tradingview';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';

// Helper to fetch multi-bar history for one symbol using a promise (fills gaps up to rangeBars)
function fetchSymbolPeriods(client: TradingViewClient, symbol: string, exchange: string | null = 'EGX', rangeBars: number = 30): Promise<TradingViewPeriod[]> {
  return new Promise((resolve) => {
    try {
      const ex = exchange || 'EGX';
      const tvSymbol = `${ex}:${symbol.replace('.CA', '')}`;
      const chart = new client.Session.Chart();
      
      chart.setMarket(tvSymbol, {
        timeframe: 'D',
        range: rangeBars
      });

      const timeout = setTimeout(() => {
        chart.delete();
        resolve([]);
      }, 7000);

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
        console.error(`Error for ${symbol}:`, err.message || err);
        resolve([]);
      });
    } catch {
      resolve([]);
    }
  });
}

type SndukFundConfig = {
  symbol: string;
  fundId: number;
  companyName: string;
  sector: string;
  industry: string;
  logoUrl: string;
};

const SNDUK_FUNDS: SndukFundConfig[] = [
  {
    symbol: 'CI_QUANT',
    fundId: 123,
    companyName: 'CI The Quant Fund',
    sector: 'Mutual Funds',
    industry: 'Equity Funds',
    logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1780357545756-9yoqpms6r0o.jpeg',
  },
  {
    symbol: 'OSOUL',
    fundId: 16,
    companyName: 'CIB Osoul Money Market Fund',
    sector: 'Mutual Funds',
    industry: 'Money Market Funds',
    logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1777586064877-t780xncyncb.png',
  },
];

/**
 * Fetch and upsert NAV history for mutual funds from Snduk
 */
async function updateSndukFund(fund: SndukFundConfig): Promise<{ symbol: string; status: string; count?: number; date?: string; message?: string }> {
  try {
    // 1. Ensure ticker exists in tickers table
    await db.insert(tickers)
      .values({
        symbol: fund.symbol,
        companyName: fund.companyName,
        exchange: 'EGX',
        sector: fund.sector,
        industry: fund.industry,
        logoUrl: fund.logoUrl,
      })
      .onConflictDoUpdate({
        target: tickers.symbol,
        set: {
          companyName: fund.companyName,
          sector: fund.sector,
          industry: fund.industry,
          logoUrl: fund.logoUrl,
        },
      });

    // 2. Fetch history from Snduk tRPC endpoint
    const inputPayload = {
      '0': {
        json: {
          fundId: fund.fundId,
          period: 'ALL',
        },
      },
    };

    const url = `https://snduk.com/api/trpc/funds.getPriceHistory?batch=1&input=${encodeURIComponent(
      JSON.stringify(inputPayload)
    )}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return { symbol: fund.symbol, status: 'error', message: `Snduk HTTP ${res.status}` };
    }

    const raw = await res.json();
    const history: Array<{ date: string; price: number; changePercent: number }> = raw[0]?.result?.data?.json || [];

    if (history.length === 0) {
      return { symbol: fund.symbol, status: 'no_data' };
    }

    // 3. Upsert historical points into dailyPrices
    for (const item of history) {
      const priceStr = item.price.toString();
      await db.insert(dailyPrices)
        .values({
          tickerSymbol: fund.symbol,
          date: item.date,
          open: priceStr,
          high: priceStr,
          low: priceStr,
          close: priceStr,
          volume: '0',
        })
        .onConflictDoUpdate({
          target: [dailyPrices.tickerSymbol, dailyPrices.date],
          set: {
            open: priceStr,
            high: priceStr,
            low: priceStr,
            close: priceStr,
          },
        });
    }

    const latest = history[history.length - 1];
    return {
      symbol: fund.symbol,
      status: 'updated',
      count: history.length,
      date: latest?.date,
    };
  } catch (err) {
    console.error(`Error updating ${fund.symbol} fund:`, err);
    return { symbol: fund.symbol, status: 'error', message: (err as Error).message };
  }
}

export async function GET(req: Request) {
  // Ensure the cron is called with a secure secret in production
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allTickers = await db.select().from(tickers);

    const results: Array<{ symbol: string; status: string; count?: number; date?: string; message?: string }> = [];
    const updatedSymbols: string[] = [];

    // 1. Sync Snduk Mutual Funds (CI_QUANT, OSOUL)
    for (const fund of SNDUK_FUNDS) {
      const fundResult = await updateSndukFund(fund);
      results.push(fundResult);
      if (fundResult.status === 'updated') {
        updatedSymbols.push(fund.symbol);
      }
    }

    // 2. Query last recorded date per ticker to compute dynamic gap lookback
    const lastDates = await db
      .select({
        tickerSymbol: dailyPrices.tickerSymbol,
        maxDate: sql<string>`MAX(${dailyPrices.date})`,
      })
      .from(dailyPrices)
      .groupBy(dailyPrices.tickerSymbol);

    const lastDateMap = new Map<string, string>();
    for (const row of lastDates) {
      if (row.tickerSymbol && row.maxDate) {
        lastDateMap.set(row.tickerSymbol, row.maxDate);
      }
    }

    // 3. Sync EGX Stock Tickers via TradingView with dynamic gap-aware lookback
    const stockTickers = allTickers.filter((t) => t.symbol !== 'CI_QUANT');

    if (stockTickers.length > 0) {
      const client = new TradingView.Client();
      const now = new Date();

      for (const t of stockTickers) {
        try {
          const lastDateStr = lastDateMap.get(t.symbol);
          let requiredRange = 30; // Default lookback window

          if (!lastDateStr) {
            // New ticker with no existing history in DB: fetch 300 bars
            requiredRange = 300;
          } else {
            const lastDate = new Date(lastDateStr);
            const diffDays = Math.ceil((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 20) {
              // Ticker fell behind: calculate exact bars needed to bridge the full gap
              requiredRange = Math.min(300, Math.max(30, Math.ceil(diffDays * 0.75) + 15));
            }
          }

          const periods = await fetchSymbolPeriods(client, t.symbol, t.exchange, requiredRange);
          
          if (periods.length > 0) {
            let updatedCount = 0;
            let latestDateStr = '';

            for (const quote of periods) {
              const dateStr = new Date(quote.time * 1000).toISOString().split('T')[0];
              latestDateStr = dateStr;

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
              updatedCount++;
            }
              
            results.push({ symbol: t.symbol, status: 'updated', count: updatedCount, date: latestDateStr });
            updatedSymbols.push(t.symbol);
          } else {
            results.push({ symbol: t.symbol, status: 'no_data' });
          }
          
          // Sleep to avoid rate limits
          await new Promise(r => setTimeout(r, 800));
        } catch (err) {
          results.push({ symbol: t.symbol, status: 'error', message: (err as Error).message });
        }
      }
      
      client.end();
    }

    let notificationResult = null;
    try {
      notificationResult = await dispatchSignalNotifications({ symbols: updatedSymbols, lookbackBars: 1 });
    } catch (notificationError) {
      console.error('Error dispatching signal notifications:', notificationError);
    }

    try {
      revalidateTag('recent-prices', 'max');
      revalidateTag('tickers', 'max');
      revalidateTag('prices', 'max');
      revalidatePath('/api/positions');
      revalidatePath('/positions');
    } catch {
      // Ignore in non-request contexts
    }

    return NextResponse.json({ message: 'Daily price update completed', results, notificationResult }, { status: 200 });

  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

