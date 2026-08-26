import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tickers, dailyPrices, systemLogs, macroInflationRates } from '@/db/schema';
import { sql, inArray, desc, eq } from 'drizzle-orm';
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

  const startTime = Date.now();

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

    // Prioritize active positions, alerts, and major EGX30/70 tickers
    const { positions: positionsTable, tickerAlerts: alertsTable } = await import('@/db/schema');
    const [openPositions, enabledAlerts] = await Promise.all([
      db.select({ ticker: positionsTable.tickerSymbol }).from(positionsTable).where(eq(positionsTable.status, 'OPEN')).catch(() => []),
      db.select({ ticker: alertsTable.tickerSymbol }).from(alertsTable).where(eq(alertsTable.enabled, true)).catch(() => []),
    ]);

    const prioritySet = new Set<string>([
      'COMI', 'COMI.CA', 'ETEL', 'ETEL.CA', 'EAST', 'EAST.CA', 'EGAL', 'EGAL.CA', 'PHDC', 'PHDC.CA',
      'HRHO', 'HRHO.CA', 'TMGH', 'TMGH.CA', 'SWDY', 'SWDY.CA', 'FWRY', 'FWRY.CA', 'MFPC', 'MFPC.CA',
      'EKHO', 'EKHO.CA', 'ORAS', 'ORAS.CA', 'ABUK', 'ABUK.CA', 'ESRS', 'ESRS.CA', 'AMOC', 'AMOC.CA',
      ...openPositions.map((p: any) => p.ticker),
      ...enabledAlerts.map((a: any) => a.ticker),
    ]);

    stockTickers.sort((a, b) => {
      const aPri = prioritySet.has(a.symbol) ? 1 : 0;
      const bPri = prioritySet.has(b.symbol) ? 1 : 0;
      return bPri - aPri;
    });

    const client = new TradingView.Client();
    let totalUpdated = 0;
    let updatedTickersCount = 0;
    const errors: string[] = [];

    const fetchSymbol = (ticker: typeof stockTickers[0]): Promise<any[]> => {
      return new Promise((resolve) => {
        try {
          const symbol = ticker.symbol.replace('.CA', '');
          const tvSymbol = symbol === 'EGX70' ? 'EGX:EGX70EWI' : symbol === 'EGX100' ? 'EGX:EGX100EWI' : `EGX:${symbol}`;
          const chart = new client.Session.Chart();
          chart.setMarket(tvSymbol, { timeframe: 'D', range: 15 });

          let done = false;
          const cleanup = () => {
            if (done) return;
            done = true;
            clearTimeout(timeout);
            try { chart.delete(); } catch {}
          };

          const timeout = setTimeout(() => {
            cleanup();
            resolve([]);
          }, 2000);

          chart.onUpdate(() => {
            const periods = chart.periods;
            cleanup();
            if (!periods || periods.length === 0) return resolve([]);

            const lastDate = lastDateMap.get(ticker.symbol);
            const sorted = [...periods].sort((a, b) => a.time - b.time);
            const newPeriods = sorted.filter((p) => {
              const dateStr = new Date(p.time * 1000).toISOString().split('T')[0];
              return !lastDate || dateStr > lastDate;
            });

            const rows = newPeriods.map((p) => ({
              tickerSymbol: ticker.symbol,
              date: new Date(p.time * 1000).toISOString().split('T')[0],
              open: sql`${p.open}`,
              high: sql`${p.max}`,
              low: sql`${p.min}`,
              close: sql`${p.close}`,
              volume: sql`${p.volume || 0}`,
            }));

            resolve(rows);
          });

          chart.onError((err: any) => {
            cleanup();
            errors.push(`${ticker.symbol}: ${err?.message || err}`);
            resolve([]);
          });
        } catch (err: any) {
          errors.push(`${ticker.symbol}: ${err?.message || err}`);
          resolve([]);
        }
      });
    };

    const BATCH_SIZE = 16;
    for (let i = 0; i < stockTickers.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > 52000) {
        console.warn(`handleUpdateStocks: Time budget reached at ticker index ${i}/${stockTickers.length}`);
        break;
      }

      const batch = stockTickers.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(fetchSymbol));

      const rowsToInsert: any[] = [];
      batchResults.forEach((rows) => {
        if (rows.length > 0) {
          updatedTickersCount++;
          totalUpdated += rows.length;
          rowsToInsert.push(...rows);
        }
      });

      if (rowsToInsert.length > 0) {
        for (let r = 0; r < rowsToInsert.length; r += 50) {
          const slice = rowsToInsert.slice(r, r + 50);
          await db.insert(dailyPrices)
            .values(slice)
            .onConflictDoUpdate({
              target: [dailyPrices.tickerSymbol, dailyPrices.date],
              set: {
                open: sql`EXCLUDED.open`,
                high: sql`EXCLUDED.high`,
                low: sql`EXCLUDED.low`,
                close: sql`EXCLUDED.close`,
                volume: sql`EXCLUDED.volume`,
              }
            });
        }
      }

      await new Promise((r) => setTimeout(r, 50));
    }

    client.end();

    try {
      (revalidateTag as any)('prices');
      (revalidateTag as any)('opportunities');
      revalidatePath('/dashboard');
      revalidatePath('/invest');
    } catch {}

    const elapsed = Date.now() - startTime;
    await db.insert(systemLogs).values({
      source: 'cron-stocks',
      level: 'INFO',
      message: `Stock sync complete: Updated ${updatedTickersCount} tickers with ${totalUpdated} new price bars in ${Math.round(elapsed / 1000)}s.`,
      metadata: { totalUpdated, updatedTickersCount, elapsedMs: elapsed, errors: errors.length > 0 ? errors.slice(0, 10) : undefined },
    });

    return NextResponse.json({ message: 'Stock update completed', totalUpdated, updatedTickersCount, elapsedMs: elapsed, errors }, { status: 200 });
  } catch (error) {
    console.error('Error in handleUpdateStocks:', error);
    await db.insert(systemLogs).values({
      source: 'cron-stocks',
      level: 'ERROR',
      message: `Stock sync failed: ${(error as Error).message}`,
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

  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const todayStr = now.toISOString().split('T')[0];

    const isEgxTradingDay = dayOfWeek >= 0 && dayOfWeek <= 4;
    const isGlobalTradingDay = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (!isEgxTradingDay && !isGlobalTradingDay) {
      return NextResponse.json({ message: 'Saturday (full market close), watchdog skipping.' }, { status: 200 });
    }

    // Determine expected latest date for EGX stocks (Market closes at 14:30 Cairo = 11:30 or 12:30 UTC)
    let expectedEgxDate = todayStr;
    if (now.getUTCHours() < 15) {
      // If before 15:00 UTC, expected date is the previous trading session
      const prevSession = new Date(now);
      if (dayOfWeek === 0) {
        prevSession.setDate(now.getDate() - 3); // Sunday morning -> expects Thursday
      } else {
        prevSession.setDate(now.getDate() - 1);
      }
      expectedEgxDate = prevSession.toISOString().split('T')[0];
    }

    const maxDates = await db
      .select({
        tickerSymbol: dailyPrices.tickerSymbol,
        maxDate: sql<string>`MAX(${dailyPrices.date})`,
      })
      .from(dailyPrices)
      .groupBy(dailyPrices.tickerSymbol);

    let stocksMissingCount = 0;
    let fundsMissing = false;
    let commoditiesMissing = false;

    for (const row of maxDates) {
      if (!row.tickerSymbol || !row.maxDate) continue;
      
      const isGlobal = GLOBAL_COMMODITIES.has(row.tickerSymbol);
      const isFund = FUNDS.has(row.tickerSymbol);
      const rowDateStr = typeof row.maxDate === 'string' ? row.maxDate.split('T')[0] : new Date(row.maxDate).toISOString().split('T')[0];

      if (isGlobal && isGlobalTradingDay && rowDateStr < todayStr) {
        commoditiesMissing = true;
      } else if (isFund && isEgxTradingDay && rowDateStr < expectedEgxDate) {
        fundsMissing = true;
      } else if (!isGlobal && !isFund && isEgxTradingDay && rowDateStr < expectedEgxDate) {
        stocksMissingCount++;
      }
    }

    const stocksMissing = stocksMissingCount > 10;
    const triggersTriggered: string[] = [];

    // Directly execute missing syncs in-process with zero network dependency
    if (stocksMissing && isEgxTradingDay) {
      try {
        await handleUpdateStocks(req);
        await handleProcessSignals(req);
        triggersTriggered.push('update-stocks', 'process-signals');
      } catch (e) {
        console.error('Watchdog failed to run handleUpdateStocks:', e);
      }
    }

    if (fundsMissing && isEgxTradingDay) {
      try {
        await handleUpdateFunds(req);
        triggersTriggered.push('update-funds');
      } catch (e) {
        console.error('Watchdog failed to run handleUpdateFunds:', e);
      }
    }

    if (commoditiesMissing && isGlobalTradingDay) {
      try {
        await handleUpdateCommodities(req);
        triggersTriggered.push('update-commodities');
      } catch (e) {
        console.error('Watchdog failed to run handleUpdateCommodities:', e);
      }
    }

    await db.insert(systemLogs).values({
      source: 'cron-watchdog',
      level: 'INFO',
      message: `Watchdog health check completed. Triggers triggered: ${triggersTriggered.join(', ') || 'None'}. (Missing stocks: ${stocksMissingCount})`,
      metadata: { triggersTriggered, stocksMissingCount, stocksMissing, fundsMissing, commoditiesMissing, expectedEgxDate }
    });

    return NextResponse.json({ message: 'Watchdog check completed', triggersTriggered, stocksMissingCount, expectedEgxDate }, { status: 200 });
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
