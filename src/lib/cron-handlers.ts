import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tickers, dailyPrices, systemLogs, macroInflationRates } from '@/db/schema';
import { sql, inArray, desc } from 'drizzle-orm';
import TradingView from '@mathieuc/tradingview';
import type { TradingViewClient, TradingViewPeriod } from '@mathieuc/tradingview';
import { verifyCronAuth } from '@/lib/cron-auth';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';
import { syncAllMacroInflation } from '@/lib/cbe-inflation';

// ----------------------------------------------------
// 1. UPDATE STOCKS
// ----------------------------------------------------
function getTradingViewSymbol(symbol: string, exchange: string | null = 'EGX'): string {
  if (symbol === 'EGX70') return 'EGX:EGX70EWI';
  if (symbol === 'EGX100') return 'EGX:EGX100EWI';
  const ex = exchange || 'EGX';
  return `${ex}:${symbol.replace('.CA', '')}`;
}

function fetchStockSymbolPeriods(client: TradingViewClient, symbol: string, exchange: string | null = 'EGX', rangeBars: number = 30): Promise<TradingViewPeriod[]> {
  return new Promise((resolve) => {
    try {
      const tvSymbol = getTradingViewSymbol(symbol, exchange);
      const chart = new client.Session.Chart();
      
      chart.setMarket(tvSymbol, { timeframe: 'D', range: rangeBars });

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

export async function handleUpdateStocks(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const allTickers = await db.select().from(tickers);
    const stockTickers = allTickers.filter(t => t.sector !== 'Funds' && t.sector !== 'Macro');

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

    const client = new TradingView.Client();
    const batchSize = 10;
    let totalUpdated = 0;
    const errors: string[] = [];

    for (let i = 0; i < stockTickers.length; i += batchSize) {
      const batch = stockTickers.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (ticker) => {
          try {
            const periods = await fetchStockSymbolPeriods(client, ticker.symbol, ticker.exchange, 30);
            if (!periods || periods.length === 0) return;

            const lastDate = lastDateMap.get(ticker.symbol);
            const newPeriods = periods.filter((p) => {
              const dateStr = new Date(p.time * 1000).toISOString().split('T')[0];
              return !lastDate || dateStr > lastDate;
            });

            if (newPeriods.length === 0) return;

            for (const p of newPeriods) {
              const dateStr = new Date(p.time * 1000).toISOString().split('T')[0];
              await db
                .insert(dailyPrices)
                .values({
                  tickerSymbol: ticker.symbol,
                  date: dateStr,
                  open: sql`${p.open}`,
                  high: sql`${p.max}`,
                  low: sql`${p.min}`,
                  close: sql`${p.close}`,
                  volume: sql`${p.volume || 0}`,
                })
                .onConflictDoUpdate({
                  target: [dailyPrices.tickerSymbol, dailyPrices.date],
                  set: {
                    open: sql`${p.open}`,
                    high: sql`${p.max}`,
                    low: sql`${p.min}`,
                    close: sql`${p.close}`,
                    volume: sql`${p.volume || 0}`,
                  },
                });
            }

            totalUpdated += newPeriods.length;
          } catch (err: any) {
            errors.push(`${ticker.symbol}: ${err.message || err}`);
          }
        })
      );
    }

    client.end();

    try {
      (revalidateTag as any)('prices');
      (revalidateTag as any)('opportunities');
      revalidatePath('/dashboard');
      revalidatePath('/invest');
    } catch {}

    await db.insert(systemLogs).values({
      source: 'cron-stocks',
      level: 'INFO',
      message: `Updated stock prices. Total rows inserted/updated: ${totalUpdated}.`,
      metadata: { totalUpdated, errors: errors.length > 0 ? errors : undefined },
    });

    return NextResponse.json({ message: 'Stock update completed', totalUpdated, errors }, { status: 200 });
  } catch (error) {
    console.error('Error in handleUpdateStocks:', error);
    await db.insert(systemLogs).values({
      source: 'cron-stocks',
      level: 'ERROR',
      message: 'Failed to update stock prices',
      metadata: { error: (error as Error).message },
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

// ----------------------------------------------------
// 2. UPDATE FUNDS
// ----------------------------------------------------
export const SNDUK_FUNDS = [
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

async function updateSndukFund(fund: typeof SNDUK_FUNDS[0]) {
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return { symbol: fund.symbol, status: 'error', message: `Snduk HTTP ${res.status}` };
    }

    const data = await res.json();
    const history = data?.[0]?.result?.data?.json;
    if (!Array.isArray(history) || history.length === 0) {
      return { symbol: fund.symbol, status: 'no_data' };
    }

    const latest = history[history.length - 1];
    const dateStr = typeof latest.date === 'string' ? latest.date.split('T')[0] : new Date(latest.date).toISOString().split('T')[0];
    const priceVal = Number(latest.price);

    await db.insert(dailyPrices)
      .values({
        tickerSymbol: fund.symbol,
        date: dateStr,
        open: sql`${priceVal}`,
        high: sql`${priceVal}`,
        low: sql`${priceVal}`,
        close: sql`${priceVal}`,
        volume: sql`0`,
      })
      .onConflictDoUpdate({
        target: [dailyPrices.tickerSymbol, dailyPrices.date],
        set: {
          open: sql`${priceVal}`,
          high: sql`${priceVal}`,
          low: sql`${priceVal}`,
          close: sql`${priceVal}`,
          volume: sql`0`,
        },
      });

    return { symbol: fund.symbol, status: 'success', date: dateStr, price: priceVal };
  } catch (err: any) {
    return { symbol: fund.symbol, status: 'error', message: err.message };
  }
}

export async function handleUpdateFunds(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const results = await Promise.all(SNDUK_FUNDS.map(updateSndukFund));

    try {
      (revalidateTag as any)('prices');
      revalidatePath('/dashboard');
      revalidatePath('/invest');
    } catch {}

    await db.insert(systemLogs).values({
      source: 'cron-funds',
      level: 'INFO',
      message: 'Updated mutual funds prices from Snduk.',
      metadata: { results },
    });

    return NextResponse.json({ message: 'Funds update completed', results }, { status: 200 });
  } catch (error) {
    console.error('Error in handleUpdateFunds:', error);
    await db.insert(systemLogs).values({
      source: 'cron-funds',
      level: 'ERROR',
      message: 'Failed to update fund prices',
      metadata: { error: (error as Error).message },
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

// ----------------------------------------------------
// 3. UPDATE COMMODITIES
// ----------------------------------------------------
const GLOBAL_ASSETS = [
  { symbol: 'GC1!', tvSymbol: 'COMEX:GC1!', name: 'Gold Futures', exchange: 'COMEX', sector: 'Macro', industry: 'Precious Metals' },
  { symbol: 'SI1!', tvSymbol: 'COMEX:SI1!', name: 'Silver Futures', exchange: 'COMEX', sector: 'Macro', industry: 'Precious Metals' },
  { symbol: 'USDEGP', tvSymbol: 'FX_IDC:USDEGP', name: 'USD to EGP', exchange: 'FX_IDC', sector: 'Macro', industry: 'Forex' }
];

function fetchCommodityPeriods(client: TradingViewClient, tvSymbol: string, rangeBars: number = 30): Promise<TradingViewPeriod[]> {
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

export async function handleUpdateCommodities(req: Request) {
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

    const client = new TradingView.Client();
    let totalUpdated = 0;
    const errors: string[] = [];

    for (const asset of GLOBAL_ASSETS) {
      try {
        await db.insert(tickers)
          .values({
            symbol: asset.symbol,
            companyName: asset.name,
            exchange: asset.exchange,
            sector: asset.sector,
            industry: asset.industry,
          })
          .onConflictDoUpdate({
            target: tickers.symbol,
            set: {
              companyName: asset.name,
              exchange: asset.exchange,
              sector: asset.sector,
              industry: asset.industry,
            }
          });

        const periods = await fetchCommodityPeriods(client, asset.tvSymbol, 30);
        if (!periods || periods.length === 0) continue;

        const lastDate = lastDateMap.get(asset.symbol);
        const newPeriods = periods.filter((p) => {
          const dateStr = new Date(p.time * 1000).toISOString().split('T')[0];
          return !lastDate || dateStr > lastDate;
        });

        if (newPeriods.length === 0) continue;

        for (const p of newPeriods) {
          const dateStr = new Date(p.time * 1000).toISOString().split('T')[0];
          await db
            .insert(dailyPrices)
            .values({
              tickerSymbol: asset.symbol,
              date: dateStr,
              open: sql`${p.open}`,
              high: sql`${p.max}`,
              low: sql`${p.min}`,
              close: sql`${p.close}`,
              volume: sql`${p.volume || 0}`,
            })
            .onConflictDoUpdate({
              target: [dailyPrices.tickerSymbol, dailyPrices.date],
              set: {
                open: sql`${p.open}`,
                high: sql`${p.max}`,
                low: sql`${p.min}`,
                close: sql`${p.close}`,
                volume: sql`${p.volume || 0}`,
              },
            });
        }

        totalUpdated += newPeriods.length;
      } catch (err: any) {
        errors.push(`${asset.symbol}: ${err.message || err}`);
      }
    }

    client.end();

    try {
      (revalidateTag as any)('prices');
      revalidatePath('/invest');
      revalidatePath('/dashboard');
    } catch {}

    await db.insert(systemLogs).values({
      source: 'cron-commodities',
      level: 'INFO',
      message: `Updated Gold, Silver, and Forex prices. Total rows inserted/updated: ${totalUpdated}.`,
      metadata: { totalUpdated, errors: errors.length > 0 ? errors : undefined }
    });

    return NextResponse.json({ message: 'Commodities update completed', totalUpdated, errors }, { status: 200 });
  } catch (error) {
    console.error('Error in handleUpdateCommodities:', error);
    await db.insert(systemLogs).values({
      source: 'cron-commodities',
      level: 'ERROR',
      message: 'Failed to update commodity prices',
      metadata: { error: (error as Error).message }
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

// ----------------------------------------------------
// 4. UPDATE MACRO
// ----------------------------------------------------
export async function handleUpdateMacro(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    await syncAllMacroInflation();
    
    await db.insert(systemLogs).values({
      source: 'cron-macro',
      level: 'INFO',
      message: 'Successfully synced Macro Inflation Rates from CBE and FRED.',
    });

    return NextResponse.json({ message: 'Macro inflation sync completed' }, { status: 200 });
  } catch (error) {
    console.error('Error syncing macro inflation rates:', error);
    await db.insert(systemLogs).values({
      source: 'cron-macro',
      level: 'ERROR',
      message: 'Failed to sync Macro Inflation Rates',
      metadata: { error: (error as Error).message }
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

// ----------------------------------------------------
// 5. PROCESS SIGNALS
// ----------------------------------------------------
export async function handleProcessSignals(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const notificationResult = await dispatchSignalNotifications({ lookbackBars: 5 });
    
    await db.insert(systemLogs).values({
      source: 'cron-signals',
      level: 'INFO',
      message: 'Successfully processed and dispatched trade signals.',
      metadata: { notificationResult }
    });

    return NextResponse.json({ message: 'Signals processed successfully', notificationResult }, { status: 200 });
  } catch (error) {
    console.error('Error dispatching signal notifications:', error);
    await db.insert(systemLogs).values({
      source: 'cron-signals',
      level: 'ERROR',
      message: 'Failed to process and dispatch trade signals',
      metadata: { error: (error as Error).message }
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

export async function handleSignals(req: Request) {
  return handleProcessSignals(req);
}

// ----------------------------------------------------
// 6. WATCHDOG
// ----------------------------------------------------
const GLOBAL_COMMODITIES = new Set(['GC1!', 'SI1!', 'USDEGP']);
const FUNDS = new Set(['CI_QUANT', 'OSOUL']);

async function triggerEndpoint(endpoint: string, host: string, secret: string) {
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const url = `${protocol}://${host}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'authorization': `Bearer ${secret}` }
    });
    return res.ok;
  } catch (err) {
    console.error(`Failed to trigger ${endpoint}:`, err);
    return false;
  }
}

export async function handleWatchdog(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const cronSecret = process.env.CRON_SECRET!;
  const host = req.headers.get('host') || 'localhost:3000';
  
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();

    const isEgxTradingDay = dayOfWeek >= 0 && dayOfWeek <= 4;
    const isGlobalTradingDay = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (!isEgxTradingDay && !isGlobalTradingDay) {
      return NextResponse.json({ message: 'Saturday (full market close), watchdog skipping.' }, { status: 200 });
    }

    const maxDates = await db
      .select({
        tickerSymbol: dailyPrices.tickerSymbol,
        maxDate: sql<string>`MAX(${dailyPrices.date})`,
      })
      .from(dailyPrices)
      .groupBy(dailyPrices.tickerSymbol);

    let stocksMissing = false;
    let fundsMissing = false;
    let commoditiesMissing = false;

    for (const row of maxDates) {
      if (!row.tickerSymbol || !row.maxDate) continue;
      
      const isGlobal = GLOBAL_COMMODITIES.has(row.tickerSymbol);
      const isFund = FUNDS.has(row.tickerSymbol);
      const lastDate = new Date(row.maxDate);
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (isGlobal && isGlobalTradingDay && daysSince >= 2) commoditiesMissing = true;
      else if (isFund && isEgxTradingDay && daysSince >= 2) fundsMissing = true;
      else if (!isGlobal && !isFund && isEgxTradingDay && daysSince >= 2) stocksMissing = true;
    }

    const triggersTriggered: string[] = [];

    if (stocksMissing && isEgxTradingDay) {
      await triggerEndpoint('/api/cron/update-stocks', host, cronSecret);
      triggersTriggered.push('update-stocks');
    }
    if (fundsMissing && isEgxTradingDay) {
      await triggerEndpoint('/api/cron/update-funds', host, cronSecret);
      triggersTriggered.push('update-funds');
    }
    if (commoditiesMissing && isGlobalTradingDay) {
      await triggerEndpoint('/api/cron/update-commodities', host, cronSecret);
      triggersTriggered.push('update-commodities');
    }

    await db.insert(systemLogs).values({
      source: 'cron-watchdog',
      level: 'INFO',
      message: `Watchdog health check completed. Triggers triggered: ${triggersTriggered.join(', ') || 'None'}.`,
      metadata: { triggersTriggered, stocksMissing, fundsMissing, commoditiesMissing }
    });

    return NextResponse.json({ message: 'Watchdog check completed', triggersTriggered }, { status: 200 });
  } catch (error) {
    console.error('Error in handleWatchdog:', error);
    await db.insert(systemLogs).values({
      source: 'cron-watchdog',
      level: 'ERROR',
      message: 'Failed watchdog health check',
      metadata: { error: (error as Error).message }
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}
