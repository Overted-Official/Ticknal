import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tickers, dailyPrices, systemLogs } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { verifyCronAuth } from '@/lib/cron-auth';

type SndukFundConfig = {
  symbol: string;
  fundId: number;
  companyName: string;
  sector: string;
  industry: string;
  logoUrl: string;
};

export const SNDUK_FUNDS: SndukFundConfig[] = [
  {
    symbol: 'CI_QUANT',
    fundId: 123,
    companyName: 'CI The Quant Fund',
    sector: 'Funds',
    industry: 'Equity Funds',
    logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1780357545756-9yoqpms6r0o.jpeg',
  },
  {
    symbol: 'OSOUL',
    fundId: 16,
    companyName: 'CIB Osoul Money Market Fund',
    sector: 'Funds',
    industry: 'Money Market Funds',
    logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1777586064877-t780xncyncb.png',
  },
];

async function updateSndukFund(fund: SndukFundConfig): Promise<{ symbol: string; status: string; count?: number; date?: string; message?: string }> {
  try {
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

    const inputPayload = { '0': { json: { fundId: fund.fundId, period: 'ALL' } } };
    const url = `https://snduk.com/api/trpc/funds.getPriceHistory?batch=1&input=${encodeURIComponent(JSON.stringify(inputPayload))}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) return { symbol: fund.symbol, status: 'error', message: `Snduk HTTP ${res.status}` };

    const raw = await res.json();
    const history: Array<{ date: string; price: number; changePercent: number }> = raw[0]?.result?.data?.json || [];

    if (history.length === 0) return { symbol: fund.symbol, status: 'no_data' };

    const valuesArray = history.map(item => {
      const priceStr = item.price.toString();
      return {
        tickerSymbol: fund.symbol,
        date: item.date,
        open: priceStr,
        high: priceStr,
        low: priceStr,
        close: priceStr,
        volume: '0',
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
            },
          });
      }
    }

    const latest = history[history.length - 1];
    return { symbol: fund.symbol, status: 'updated', count: history.length, date: latest?.date };
  } catch (err) {
    console.error(`Error updating ${fund.symbol} fund:`, err);
    return { symbol: fund.symbol, status: 'error', message: (err as Error).message };
  }
}

export async function GET(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const results: Array<any> = [];
    for (const fund of SNDUK_FUNDS) {
      const fundResult = await updateSndukFund(fund);
      results.push(fundResult);
    }

    try {
      revalidateTag('recent-prices', 'max' as any);
      revalidateTag('prices', 'max' as any);
      revalidatePath('/api/positions');
      revalidatePath('/positions');
    } catch {}

    const totalUpdated = results.filter(r => r.status === 'updated').length;
    await db.insert(systemLogs).values({
      source: 'cron-funds',
      level: totalUpdated === SNDUK_FUNDS.length ? 'INFO' : 'WARNING',
      message: `Updated ${totalUpdated}/${SNDUK_FUNDS.length} Snduk Funds.`,
      metadata: { results }
    });

    return NextResponse.json({ message: 'Funds update completed', results }, { status: 200 });
  } catch (error) {
    console.error('Error updating funds:', error);
    await db.insert(systemLogs).values({
      source: 'cron-funds',
      level: 'ERROR',
      message: 'Failed to update Snduk funds',
      metadata: { error: (error as Error).message }
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}
