import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { db } from '@/db';
import { tickers, dailyPrices, systemLogs, priceAdjustments, signalNotifications, macroMoneySupply, egxInvestorFlows } from '@/db/schema';
import { sql, inArray, eq, and, lt, gt, gte, desc } from 'drizzle-orm';
import TradingView from '@mathieuc/tradingview';
import type { TradingViewClient, TradingViewPeriod } from '@mathieuc/tradingview';
import { verifyCronAuth } from '@/lib/cron-auth';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';
import { syncAllMacroInflation } from '@/lib/cbe-inflation';
import { invalidatePrecomputedMarketCache } from '@/lib/handlers/sectors-handlers';
import {
  detectExtremeGap,
  detectProviderAdjustment,
  toComparableBar,
  type ComparablePriceBar,
} from '@/lib/market/price-adjustments';
import { ALL_SNDUK_FUNDS, type SndukFund } from '@/lib/funds/snduk-funds-list';
import { syncDailyInvestorFlows } from '@/lib/investor-flows/sync-investor-flows';
import { syncDailySmartMoney } from '@/lib/smart-money/sync-smart-money';
import { syncOfficialMacroData } from '@/lib/macro/sync-official-macro';
import { syncExternalTradingViewNews } from '@/lib/news/news-sync';
import { generateTheTicknalTakePosts } from '@/lib/news/ticknal-take-generator';

// ----------------------------------------------------
// 1. UPDATE STOCKS
// ----------------------------------------------------
type ConfirmedAdjustment = {
  tickerSymbol: string;
  effectiveDate: string;
  factor: number;
  referencePriceBefore: number | null;
  referencePriceAfter: number | null;
  source: string;
  evidence: unknown;
  removeZeroVolumeAfterDate?: string | null;
};

function toDailyPriceInsert(tickerSymbol: string, bar: ComparablePriceBar) {
  return {
    tickerSymbol,
    date: bar.date,
    open: String(bar.open),
    high: String(bar.high),
    low: String(bar.low),
    close: String(bar.close),
    volume: String(bar.volume),
  };
}

async function upsertDailyPriceRows(
  tx: Pick<typeof db, 'insert'>,
  rows: ReturnType<typeof toDailyPriceInsert>[],
) {
  for (let index = 0; index < rows.length; index += 50) {
    await tx.insert(dailyPrices)
      .values(rows.slice(index, index + 50))
      .onConflictDoUpdate({
        target: [dailyPrices.tickerSymbol, dailyPrices.date],
        set: {
          open: sql`EXCLUDED.open`,
          high: sql`EXCLUDED.high`,
          low: sql`EXCLUDED.low`,
          close: sql`EXCLUDED.close`,
          volume: sql`EXCLUDED.volume`,
        },
      });
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function applyPriceAdjustment(
  adjustment: ConfirmedAdjustment,
  fetchedBars: ComparablePriceBar[],
): Promise<boolean> {
  if (!Number.isFinite(adjustment.factor) || adjustment.factor <= 0) {
    throw new Error(`Invalid price adjustment factor for ${adjustment.tickerSymbol}`);
  }

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ status: priceAdjustments.status, appliedAt: priceAdjustments.appliedAt })
      .from(priceAdjustments)
      .where(and(
        eq(priceAdjustments.tickerSymbol, adjustment.tickerSymbol),
        eq(priceAdjustments.effectiveDate, adjustment.effectiveDate),
      ))
      .limit(1);

    if (existing[0]?.status === 'APPLIED' || existing[0]?.appliedAt) {
      return false;
    }

    const factor = adjustment.factor;
    if (adjustment.removeZeroVolumeAfterDate) {
      await tx
        .delete(dailyPrices)
        .where(and(
          eq(dailyPrices.tickerSymbol, adjustment.tickerSymbol),
          gt(dailyPrices.date, adjustment.removeZeroVolumeAfterDate),
          lt(dailyPrices.date, adjustment.effectiveDate),
          eq(dailyPrices.volume, '0'),
        ));
    }

    await tx
      .update(dailyPrices)
      .set({
        open: sql`ROUND((${dailyPrices.open})::numeric * ${factor}::numeric, 4)`,
        high: sql`ROUND((${dailyPrices.high})::numeric * ${factor}::numeric, 4)`,
        low: sql`ROUND((${dailyPrices.low})::numeric * ${factor}::numeric, 4)`,
        close: sql`ROUND((${dailyPrices.close})::numeric * ${factor}::numeric, 4)`,
        volume: sql`ROUND((${dailyPrices.volume})::numeric / NULLIF(${factor}::numeric, 0), 2)`,
      })
      .where(and(
        eq(dailyPrices.tickerSymbol, adjustment.tickerSymbol),
        lt(dailyPrices.date, adjustment.effectiveDate),
      ));

    if (fetchedBars.length > 0) {
      await upsertDailyPriceRows(
        tx,
        fetchedBars.map((bar) => toDailyPriceInsert(adjustment.tickerSymbol, bar)),
      );
    }

    // Signals on or after the discontinuity were calculated from invalid
    // units. Remove them so the canonical processor can recreate only signals
    // that still exist on the normalized series.
    await tx
      .delete(signalNotifications)
      .where(and(
        eq(signalNotifications.tickerSymbol, adjustment.tickerSymbol),
        gte(signalNotifications.signalDate, adjustment.effectiveDate),
      ));

    await tx
      .insert(priceAdjustments)
      .values({
        tickerSymbol: adjustment.tickerSymbol,
        effectiveDate: adjustment.effectiveDate,
        factor: String(factor),
        referencePriceBefore: adjustment.referencePriceBefore == null ? null : String(adjustment.referencePriceBefore),
        referencePriceAfter: adjustment.referencePriceAfter == null ? null : String(adjustment.referencePriceAfter),
        source: adjustment.source,
        status: 'APPLIED',
        evidence: adjustment.evidence,
        appliedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [priceAdjustments.tickerSymbol, priceAdjustments.effectiveDate],
        set: {
          factor: String(factor),
          referencePriceBefore: adjustment.referencePriceBefore == null ? null : String(adjustment.referencePriceBefore),
          referencePriceAfter: adjustment.referencePriceAfter == null ? null : String(adjustment.referencePriceAfter),
          source: adjustment.source,
          status: 'APPLIED',
          evidence: adjustment.evidence,
          appliedAt: new Date(),
        },
      });

    return true;
  });
}

export async function handleUpdateStocks(req: Request, options?: { specificSymbols?: string[]; skipNotifications?: boolean }) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const startTime = Date.now();

  try {
    const allTickers = await db.select().from(tickers);
    let stockTickers = allTickers.filter(t => t.sector !== 'Funds' && t.sector !== 'Macro');

    if (options?.specificSymbols && options.specificSymbols.length > 0) {
      const specificSet = new Set(options.specificSymbols.map(s => s.toUpperCase()));
      stockTickers = stockTickers.filter(t => specificSet.has(t.symbol.toUpperCase()));
    }

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

    // Prioritize active positions, alerts, and major EGX30/70 tickers, then sort remaining by oldest updated date first
    const { positions: positionsTable, tickerAlerts: alertsTable } = await import('@/db/schema');
    const [openPositions, enabledAlerts] = await Promise.all([
      db.select({ ticker: positionsTable.tickerSymbol }).from(positionsTable).where(eq(positionsTable.status, 'OPEN')).catch(() => []),
      db.select({ ticker: alertsTable.tickerSymbol }).from(alertsTable).where(eq(alertsTable.enabled, true)).catch(() => []),
    ]);

    const prioritySet = new Set<string>([
      'EGX30', 'EGX70', 'EGX100',
      'COMI', 'COMI.CA', 'ETEL', 'ETEL.CA', 'EAST', 'EAST.CA', 'EGAL', 'EGAL.CA', 'PHDC', 'PHDC.CA',
      'HRHO', 'HRHO.CA', 'TMGH', 'TMGH.CA', 'SWDY', 'SWDY.CA', 'FWRY', 'FWRY.CA', 'MFPC', 'MFPC.CA',
      'EKHO', 'EKHO.CA', 'ORAS', 'ORAS.CA', 'ABUK', 'ABUK.CA', 'ESRS', 'ESRS.CA', 'AMOC', 'AMOC.CA',
      ...openPositions.map((p: any) => p.ticker),
      ...enabledAlerts.map((a: any) => a.ticker),
    ]);

    stockTickers.sort((a, b) => {
      const aPri = prioritySet.has(a.symbol) ? 1 : 0;
      const bPri = prioritySet.has(b.symbol) ? 1 : 0;
      if (bPri !== aPri) return bPri - aPri;

      // Secondary sort: Oldest last date first (ensures out-of-date stocks get processed immediately with zero starvation)
      const dateA = lastDateMap.get(a.symbol) || '1970-01-01';
      const dateB = lastDateMap.get(b.symbol) || '1970-01-01';
      return dateA.localeCompare(dateB);
    });

    let totalUpdated = 0;
    let updatedTickersCount = 0;
    let adjustmentsApplied = 0;
    let quarantinedTickersCount = 0;
    const errors: string[] = [];

    // Recycled client per batch (30 charts max per WebSocket session to avoid TradingView connection rate limits)
    const BATCH_SIZE = 30;
    for (let i = 0; i < stockTickers.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > 52000) {
        console.warn(`handleUpdateStocks: Time budget reached at ticker index ${i}/${stockTickers.length}`);
        break;
      }

      const batch = stockTickers.slice(i, i + BATCH_SIZE);
      const client = new TradingView.Client();

      const batchSymbols = batch.map((ticker) => ticker.symbol);
      type StoredWindowRow = {
        ticker_symbol: string;
        date: string | Date;
        open: string | number;
        high: string | number;
        low: string | number;
        close: string | number;
        volume: string | number | null;
      };
      const storedWindowRows = await db.execute(sql`
        WITH ranked_prices AS (
          SELECT ticker_symbol, date, open, high, low, close, volume,
                 ROW_NUMBER() OVER (PARTITION BY ticker_symbol ORDER BY date DESC) AS row_number
          FROM ${dailyPrices}
          WHERE ${inArray(dailyPrices.tickerSymbol, batchSymbols)}
        )
        SELECT ticker_symbol, date, open, high, low, close, volume
        FROM ranked_prices
        WHERE row_number <= 30
        ORDER BY ticker_symbol, date
      `) as unknown as StoredWindowRow[];
      const storedWindows = new Map<string, ComparablePriceBar[]>();
      for (const row of storedWindowRows) {
        const tickerSymbol = String(row.ticker_symbol);
        const bars = storedWindows.get(tickerSymbol) ?? [];
        bars.push({
          date: typeof row.date === 'string' ? row.date.slice(0, 10) : new Date(row.date).toISOString().slice(0, 10),
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: Number(row.volume || 0),
        });
        storedWindows.set(tickerSymbol, bars);
      }

      let confirmedAdjustments: ConfirmedAdjustment[] = [];
      const latestAppliedDateByTicker = new Map<string, string>();
      try {
        const adjustmentRows = await db
          .select()
          .from(priceAdjustments)
          .where(and(
            inArray(priceAdjustments.tickerSymbol, batchSymbols),
            inArray(priceAdjustments.status, ['CONFIRMED', 'APPLIED']),
          ));
        confirmedAdjustments = adjustmentRows
          .filter((row) => row.status === 'CONFIRMED')
          .map((row) => ({
            tickerSymbol: row.tickerSymbol,
            effectiveDate: String(row.effectiveDate).slice(0, 10),
            factor: Number(row.factor),
            referencePriceBefore: row.referencePriceBefore == null ? null : Number(row.referencePriceBefore),
            referencePriceAfter: row.referencePriceAfter == null ? null : Number(row.referencePriceAfter),
            source: row.source,
            evidence: row.evidence,
            removeZeroVolumeAfterDate:
              row.evidence && typeof row.evidence === 'object' && 'lastTradingDate' in row.evidence
                ? String((row.evidence as Record<string, unknown>).lastTradingDate)
                : null,
          }));
        for (const row of adjustmentRows) {
          if (row.status !== 'APPLIED') continue;
          const effectiveDate = String(row.effectiveDate).slice(0, 10);
          const current = latestAppliedDateByTicker.get(row.tickerSymbol);
          if (!current || effectiveDate > current) {
            latestAppliedDateByTicker.set(row.tickerSymbol, effectiveDate);
          }
        }
      } catch (error) {
        errors.push(`price_adjustments: ${getErrorMessage(error)}`);
      }
      const confirmedByTicker = new Map(confirmedAdjustments.map((item) => [item.tickerSymbol, item]));

      const fetchSymbol = (ticker: typeof stockTickers[0]): Promise<{ tickerSymbol: string; bars: ComparablePriceBar[] }> => {
        return new Promise((resolve) => {
          try {
            const symbol = ticker.symbol.replace('.CA', '');
            const tvSymbol =
              symbol === 'EGX30'
                ? 'EGX:EGX30CAPPED'
                : symbol === 'EGX70'
                ? 'EGX:EGX70EWI'
                : symbol === 'EGX100'
                ? 'EGX:EGX100EWI'
                : `EGX:${symbol}`;
            const chart = new client.Session.Chart();
            chart.setMarket(tvSymbol, { timeframe: 'D', range: 15, adjustment: 'splits' });

            let done = false;
            const cleanup = () => {
              if (done) return;
              done = true;
              clearTimeout(timeout);
              try { chart.delete(); } catch {}
            };

            const timeout = setTimeout(() => {
              cleanup();
              resolve({ tickerSymbol: ticker.symbol, bars: [] });
            }, 2500);

            chart.onUpdate(() => {
              const periods = chart.periods;
              cleanup();
              if (!periods || periods.length === 0) {
                return resolve({ tickerSymbol: ticker.symbol, bars: [] });
              }

              const bars = [...periods]
                .sort((a, b) => a.time - b.time)
                .map(toComparableBar);
              resolve({ tickerSymbol: ticker.symbol, bars });
            });

            chart.onError((err: Error) => {
              cleanup();
              errors.push(`${ticker.symbol}: ${getErrorMessage(err)}`);
              resolve({ tickerSymbol: ticker.symbol, bars: [] });
            });
          } catch (err: unknown) {
            errors.push(`${ticker.symbol}: ${getErrorMessage(err)}`);
            resolve({ tickerSymbol: ticker.symbol, bars: [] });
          }
        });
      };

      const batchResults = await Promise.all(batch.map(fetchSymbol));
      client.end();

      const rowsToInsert: ReturnType<typeof toDailyPriceInsert>[] = [];
      for (const result of batchResults) {
        const { tickerSymbol, bars } = result;
        if (bars.length === 0) continue;

        const storedBars = storedWindows.get(tickerSymbol) ?? [];
        const lastStored = storedBars[storedBars.length - 1];
        const lastDate = lastDateMap.get(tickerSymbol);
        const newBars = bars.filter((bar) => !lastDate || bar.date > lastDate);
        const confirmedAdjustment = confirmedByTicker.get(tickerSymbol);

        if (confirmedAdjustment) {
          const postActionBars = bars.filter((bar) => bar.date >= confirmedAdjustment.effectiveDate);
          const applied = await applyPriceAdjustment(confirmedAdjustment, postActionBars);
          if (applied) {
            adjustmentsApplied += 1;
            updatedTickersCount += 1;
            totalUpdated += Math.max(1, newBars.length);
          }
          continue;
        }

        const latestAppliedDate = latestAppliedDateByTicker.get(tickerSymbol);
        const comparableStoredBars = latestAppliedDate
          ? storedBars.filter((bar) => bar.date >= latestAppliedDate)
          : storedBars;
        const comparableIncomingBars = latestAppliedDate
          ? bars.filter((bar) => bar.date >= latestAppliedDate)
          : bars;
        const providerAdjustment = detectProviderAdjustment(comparableStoredBars, comparableIncomingBars);
        if (providerAdjustment && newBars.length > 0 && lastStored) {
          const firstNewBar = newBars[0];
          const replacementBars = latestAppliedDate
            ? bars.filter((bar) => bar.date >= latestAppliedDate)
            : bars;
          const applied = await applyPriceAdjustment({
            tickerSymbol,
            effectiveDate: firstNewBar.date,
            factor: providerAdjustment.factor,
            referencePriceBefore: lastStored.close,
            referencePriceAfter: lastStored.close * providerAdjustment.factor,
            source: 'TRADINGVIEW_OVERLAP_REBASE',
            evidence: providerAdjustment,
          }, replacementBars);
          if (applied) {
            adjustmentsApplied += 1;
            updatedTickersCount += 1;
            totalUpdated += Math.max(1, newBars.length);
          }
          continue;
        }

        if (newBars.length > 0 && lastStored) {
          const firstNewBar = newBars[0];
          const extremeGap = detectExtremeGap(lastStored.close, firstNewBar.open);
          if (extremeGap) {
            quarantinedTickersCount += 1;
            await db
              .insert(priceAdjustments)
              .values({
                tickerSymbol,
                effectiveDate: firstNewBar.date,
                factor: String(extremeGap.factor),
                referencePriceBefore: String(lastStored.close),
                referencePriceAfter: String(firstNewBar.open),
                source: 'EXTREME_GAP_GUARD',
                status: 'PENDING_REVIEW',
                evidence: {
                  ...extremeGap,
                  previousDate: lastStored.date,
                  incomingClose: firstNewBar.close,
                  message: 'Bar withheld from canonical history until the discontinuity is confirmed.',
                },
              })
              .onConflictDoUpdate({
                target: [priceAdjustments.tickerSymbol, priceAdjustments.effectiveDate],
                set: {
                  factor: String(extremeGap.factor),
                  referencePriceBefore: String(lastStored.close),
                  referencePriceAfter: String(firstNewBar.open),
                  evidence: {
                    ...extremeGap,
                    previousDate: lastStored.date,
                    incomingClose: firstNewBar.close,
                    message: 'Bar withheld from canonical history until the discontinuity is confirmed.',
                  },
                },
              });
            errors.push(`${tickerSymbol}: quarantined ${extremeGap.gapPct.toFixed(1)}% opening discontinuity on ${firstNewBar.date}`);
            continue;
          }
        }

        if (newBars.length > 0) {
          updatedTickersCount += 1;
          totalUpdated += newBars.length;
          rowsToInsert.push(...newBars.map((bar) => toDailyPriceInsert(tickerSymbol, bar)));
        }
      }

      if (rowsToInsert.length > 0) {
        await upsertDailyPriceRows(db, rowsToInsert);
      }

      await new Promise((r) => setTimeout(r, 20));
    }

    invalidatePrecomputedMarketCache();
    try {
      revalidateTag('prices', { expire: 0 });
      revalidateTag('opportunities', { expire: 0 });
      revalidatePath('/home');
      revalidatePath('/charts');
      revalidatePath('/markets');
      revalidatePath('/strategies');
    } catch {}

    const elapsed = Date.now() - startTime;

    // Direct Signal Pipeline: If new price data was inserted and budget permits (< 42s), immediately process signals and push notifications
    let notificationResult: any = null;
    if (!options?.skipNotifications && totalUpdated > 0 && Date.now() - startTime < 42000) {
      try {
        notificationResult = await dispatchSignalNotifications({ lookbackBars: 1 });
        await db.insert(systemLogs).values({
          source: 'cron-stocks-signals',
          level: 'INFO',
          message: `Post-update signals processed: ${notificationResult.sent} notifications sent, ${notificationResult.checkedSymbols} symbols analyzed.`,
          metadata: { notificationResult },
        });
      } catch (sigErr: any) {
        console.error('Post-update signal processing error:', sigErr);
      }
    }

    // Automatically sync daily investor flows for the completed trading session
    let investorFlowResult: any = null;
    if (Date.now() - startTime < 55000) {
      try {
        investorFlowResult = await syncDailyInvestorFlows();
      } catch (flowErr: any) {
        console.error('Post-update investor flow sync error:', flowErr);
      }
    }

    // Automatically sync daily Smart Money statistics for all 293 EGX equities
    let smartMoneyResult: any = null;
    if (totalUpdated > 0 && Date.now() - startTime < 55000) {
      try {
        smartMoneyResult = await syncDailySmartMoney();
      } catch (smErr: any) {
        console.error('Post-update smart money sync error:', smErr);
      }
    }

    await db.insert(systemLogs).values({
      source: 'cron-stocks',
      level: 'INFO',
      message: `Stock sync complete: Updated ${updatedTickersCount} tickers with ${totalUpdated} new price bars, applied ${adjustmentsApplied} price adjustments, and quarantined ${quarantinedTickersCount} suspicious discontinuities in ${Math.round(elapsed / 1000)}s.`,
      metadata: { totalUpdated, updatedTickersCount, adjustmentsApplied, quarantinedTickersCount, elapsedMs: elapsed, notificationResult, errors: errors.length > 0 ? errors.slice(0, 10) : undefined },
    });

    return NextResponse.json({ message: 'Stock update completed', totalUpdated, updatedTickersCount, adjustmentsApplied, quarantinedTickersCount, elapsedMs: elapsed, notificationResult, errors }, { status: 200 });
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
export const SNDUK_FUNDS: SndukFund[] = ALL_SNDUK_FUNDS;

async function updateSndukFund(fund: SndukFund) {
  try {
    await db.insert(tickers)
      .values({
        symbol: fund.symbol,
        companyName: fund.companyName,
        exchange: 'EGX',
        sector: fund.sector,
        industryGroup: fund.industryGroup ?? 'Investment Funds',
        industry: fund.industry,
        subIndustry: fund.subIndustry ?? null,
        logoUrl: fund.logoUrl ?? null,
        currency: fund.currency,
      })
      .onConflictDoUpdate({
        target: tickers.symbol,
        set: {
          companyName: fund.companyName,
          sector: fund.sector,
          industryGroup: fund.industryGroup ?? 'Investment Funds',
          industry: fund.industry,
          subIndustry: fund.subIndustry ?? null,
          logoUrl: fund.logoUrl ?? null,
          currency: fund.currency,
        },
      });

    const inputPayload = { '0': { json: { fundId: fund.fundId, period: '1M' } } };
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

    if (dateStr && !isNaN(priceVal) && priceVal > 0) {
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
    }

    return { symbol: fund.symbol, status: 'success', date: dateStr, price: priceVal };
  } catch (err: any) {
    return { symbol: fund.symbol, status: 'error', message: err.message };
  }
}

export async function handleUpdateFunds(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const results: any[] = [];
    const CONCURRENCY = 5;
    for (let i = 0; i < SNDUK_FUNDS.length; i += CONCURRENCY) {
      const chunk = SNDUK_FUNDS.slice(i, i + CONCURRENCY);
      const chunkRes = await Promise.all(chunk.map(updateSndukFund));
      results.push(...chunkRes);
    }

    invalidatePrecomputedMarketCache();
    try {
      revalidateTag('prices', { expire: 0 });
      revalidatePath('/home');
      revalidatePath('/charts');
      revalidatePath('/markets');
    } catch {}

    await db.insert(systemLogs).values({
      source: 'cron-funds',
      level: 'INFO',
      message: `Updated mutual funds prices from Snduk. Total: ${results.length}.`,
      metadata: {
        total: results.length,
        successCount: results.filter((r) => r.status === 'success').length,
      },
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
  { symbol: 'GC1!', tvSymbol: 'COMEX:GC1!', name: 'Gold (EGP/g)', exchange: 'COMEX', sector: 'Macro', industry: 'Precious Metals', currency: 'EGP', logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg' },
  { symbol: 'SI1!', tvSymbol: 'COMEX:SI1!', name: 'Silver (EGP/g)', exchange: 'COMEX', sector: 'Macro', industry: 'Precious Metals', currency: 'EGP', logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg' },
  { symbol: 'USDEGP', tvSymbol: 'FX_IDC:USDEGP', name: 'USD to EGP', exchange: 'FX_IDC', sector: 'Macro', industry: 'Forex', currency: 'EGP', logoUrl: 'https://s3-symbol-logo.tradingview.com/country/US.svg' },
  { symbol: 'EUREGP', tvSymbol: 'FX_IDC:EUREGP', name: 'EUR to EGP', exchange: 'FX_IDC', sector: 'Macro', industry: 'Forex', currency: 'EGP', logoUrl: 'https://s3-symbol-logo.tradingview.com/country/EU.svg' }
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
            currency: asset.currency,
            logoUrl: asset.logoUrl,
          })
          .onConflictDoUpdate({
            target: tickers.symbol,
            set: {
              companyName: asset.name,
              exchange: asset.exchange,
              sector: asset.sector,
              industry: asset.industry,
              currency: asset.currency,
              logoUrl: asset.logoUrl,
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

        // If updating Gold (GC1!) or Silver (SI1!), fetch latest USDEGP rate to convert USD/oz to EGP/g
        let usdEgpRate = 52.0;
        if (asset.symbol === 'GC1!' || asset.symbol === 'SI1!') {
          const latestUsdRow = await db.query.dailyPrices.findFirst({
            where: eq(dailyPrices.tickerSymbol, 'USDEGP'),
            orderBy: [desc(dailyPrices.date)],
          });
          if (latestUsdRow && Number(latestUsdRow.close) > 0) {
            usdEgpRate = Number(latestUsdRow.close);
          }
        }

        const OZ_TO_GRAMS = 31.1034768;

        for (const p of newPeriods) {
          const dateStr = new Date(p.time * 1000).toISOString().split('T')[0];

          let openVal = p.open;
          let highVal = p.max;
          let lowVal = p.min;
          let closeVal = p.close;

          if (asset.symbol === 'GC1!' || asset.symbol === 'SI1!') {
            openVal = Number(((p.open * usdEgpRate) / OZ_TO_GRAMS).toFixed(4));
            highVal = Number(((p.max * usdEgpRate) / OZ_TO_GRAMS).toFixed(4));
            lowVal = Number(((p.min * usdEgpRate) / OZ_TO_GRAMS).toFixed(4));
            closeVal = Number(((p.close * usdEgpRate) / OZ_TO_GRAMS).toFixed(4));
          }

          await db
            .insert(dailyPrices)
            .values({
              tickerSymbol: asset.symbol,
              date: dateStr,
              open: sql`${openVal}`,
              high: sql`${highVal}`,
              low: sql`${lowVal}`,
              close: sql`${closeVal}`,
              volume: sql`${p.volume || 0}`,
            })
            .onConflictDoUpdate({
              target: [dailyPrices.tickerSymbol, dailyPrices.date],
              set: {
                open: sql`${openVal}`,
                high: sql`${highVal}`,
                low: sql`${lowVal}`,
                close: sql`${closeVal}`,
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
      revalidateTag('prices', { expire: 0 });
      revalidatePath('/home');
      revalidatePath('/charts');
      revalidatePath('/markets');
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
// 4. UPDATE MACRO & MONEY SUPPLY
// ----------------------------------------------------
export async function syncTradingViewMoneySupply(): Promise<{ updated: number; errors: string[] }> {
  const targets = [
    { indicator: 'M2', tvSymbol: 'ECONOMICS:EGM2' },
    { indicator: 'M1', tvSymbol: 'ECONOMICS:EGM1' },
    { indicator: 'M0', tvSymbol: 'ECONOMICS:EGM0' },
  ];

  const client = new TradingView.Client();
  let updated = 0;
  const errors: string[] = [];

  for (const target of targets) {
    try {
      const periods: TradingViewPeriod[] = await new Promise((resolve) => {
        const chart = new client.Session.Chart();
        chart.setMarket(target.tvSymbol, { timeframe: '1M', range: 36 });
        const timeout = setTimeout(() => {
          chart.delete();
          resolve([]);
        }, 12000);

        chart.onUpdate(() => {
          clearTimeout(timeout);
          const p = chart.periods;
          chart.delete();
          resolve(p || []);
        });

        chart.onError((err: any) => {
          clearTimeout(timeout);
          chart.delete();
          console.error(`Error for ${target.tvSymbol}:`, err.message || err);
          resolve([]);
        });
      });

      if (!periods || periods.length === 0) continue;
      periods.sort((a, b) => a.time - b.time);

      for (let i = 0; i < periods.length; i++) {
        const curr = periods[i];
        const prev = i > 0 ? periods[i - 1] : null;
        const dateStr = new Date(curr.time * 1000).toISOString().split('T')[0];
        const val = Number(curr.close);
        const chg = prev ? val - Number(prev.close) : 0;
        const chgPct = prev && Number(prev.close) > 0 ? (chg / Number(prev.close)) * 100 : 0;

        await db
          .insert(macroMoneySupply)
          .values({
            date: dateStr,
            indicator: target.indicator,
            value: sql`${val}`,
            change: sql`${chg}`,
            changePercent: sql`${chgPct}`,
          })
          .onConflictDoUpdate({
            target: [macroMoneySupply.date, macroMoneySupply.indicator],
            set: {
              value: sql`${val}`,
              change: sql`${chg}`,
              changePercent: sql`${chgPct}`,
              updatedAt: new Date(),
            },
          });
        updated++;
      }
    } catch (err: any) {
      errors.push(`${target.indicator}: ${err.message || err}`);
    }
  }

  client.end();
  return { updated, errors };
}

export async function handleUpdateMacro(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const [inflationResult, moneySupplyResult, officialMacroResult] = await Promise.allSettled([
      syncAllMacroInflation(),
      syncTradingViewMoneySupply(),
      syncOfficialMacroData(),
    ]);

    const moneySupplyData = moneySupplyResult.status === 'fulfilled' ? moneySupplyResult.value : { updated: 0, errors: [] };

    invalidatePrecomputedMarketCache();
    try {
      revalidateTag('prices', { expire: 0 });
      revalidatePath('/markets');
    } catch {}

    await db.insert(systemLogs).values({
      source: 'cron-macro',
      level: 'INFO',
      message: `Synced Macro Inflation Rates and Money Supply (M2/M1/M0). Money supply rows updated: ${moneySupplyData.updated}.`,
      metadata: {
        inflationStatus: inflationResult.status,
        moneySupplyUpdated: moneySupplyData.updated,
        moneySupplyErrors: moneySupplyData.errors,
        officialMacro: officialMacroResult.status === 'fulfilled' ? officialMacroResult.value : { error: String(officialMacroResult.reason) },
      },
    });

    return NextResponse.json({
      message: 'Macro sync completed',
      inflation: inflationResult.status,
      moneySupply: moneySupplyData,
      officialMacro: officialMacroResult.status === 'fulfilled' ? officialMacroResult.value : { status: 'failed', error: String(officialMacroResult.reason) },
    }, { status: 200 });
  } catch (error) {
    console.error('Error syncing macro data:', error);
    await db.insert(systemLogs).values({
      source: 'cron-macro',
      level: 'ERROR',
      message: 'Failed to sync Macro Data',
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
    const notificationResult = await dispatchSignalNotifications({ lookbackBars: 1 });
    
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
const FUNDS = new Set(ALL_SNDUK_FUNDS.map((f) => f.symbol));

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
    if (now.getUTCHours() < 13) {
      // If before 13:00 UTC (4:00 PM Cairo), expected date is the previous trading session
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

    const missingStockSymbols: string[] = [];
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
        missingStockSymbols.push(row.tickerSymbol);
      }
    }

    const stocksMissingCount = missingStockSymbols.length;
    const stocksMissing = stocksMissingCount > 0;
    const triggersTriggered: string[] = [];

    // Directly execute missing syncs in-process with zero network dependency
    if (stocksMissing && isEgxTradingDay) {
      try {
        await handleUpdateStocks(req, { specificSymbols: missingStockSymbols });
        await handleProcessSignals(req);
        triggersTriggered.push(`update-stocks (${stocksMissingCount} missing)`, 'process-signals');
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

    // Verify and repair EGX investor flows for completed sessions
    let investorFlowsMissing = false;
    if (isEgxTradingDay) {
      try {
        const existingFlow = await db
          .select({ id: egxInvestorFlows.id })
          .from(egxInvestorFlows)
          .where(eq(egxInvestorFlows.date, expectedEgxDate))
          .limit(1);

        if (!existingFlow[0]) {
          investorFlowsMissing = true;
          const flowResult = await syncDailyInvestorFlows({ targetDate: expectedEgxDate });
          if (flowResult.success) {
            triggersTriggered.push(`update-investor-flows (${expectedEgxDate})`);
          }
        }
      } catch (e) {
        console.error('Watchdog failed to verify/sync investor flows:', e);
      }
    }

    await db.insert(systemLogs).values({
      source: 'cron-watchdog',
      level: 'INFO',
      message: `Watchdog health check completed. Triggers triggered: ${triggersTriggered.join(', ') || 'None'}. (Missing stocks: ${stocksMissingCount}, investor flows missing: ${investorFlowsMissing})`,
      metadata: { triggersTriggered, stocksMissingCount, stocksMissing, fundsMissing, commoditiesMissing, investorFlowsMissing, expectedEgxDate }
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

// ----------------------------------------------------
// 7. UPDATE INVESTOR FLOWS
// ----------------------------------------------------
export async function handleUpdateInvestorFlows(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const url = new URL(req.url);
    const targetDate = url.searchParams.get('date') || undefined;

    let manualData;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body?.date && body?.foreignBuy !== undefined) {
          manualData = body;
        }
      } catch {}
    }

    const result = await syncDailyInvestorFlows({ targetDate, manualData });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('Error in handleUpdateInvestorFlows:', error);
    await db.insert(systemLogs).values({
      source: 'cron-investor-flows',
      level: 'ERROR',
      message: `Failed to update EGX investor flows: ${(error as Error).message}`,
      metadata: { error: (error as Error).message },
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

// ----------------------------------------------------
// 10. UPDATE EXTERNAL NEWS
// ----------------------------------------------------
export async function handleUpdateNews(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const result = await syncExternalTradingViewNews();

    try {
      revalidatePath('/news');
      revalidatePath('/home');
      revalidatePath('/markets');
    } catch {}

    await db.insert(systemLogs).values({
      source: 'cron-update-news',
      level: result.success ? 'INFO' : 'ERROR',
      message: `External news sync completed: ${result.inserted} inserted, ${result.updated} updated (${result.totalPolled} polled)`,
      metadata: result,
    });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Error in handleUpdateNews:', error);
    await db.insert(systemLogs).values({
      source: 'cron-update-news',
      level: 'ERROR',
      message: `Failed to sync external news: ${(error as Error).message}`,
      metadata: { error: (error as Error).message },
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

// ----------------------------------------------------
// 11. GENERATE THE TICKNAL TAKE (DAILY AI BRIEFINGS)
// ----------------------------------------------------
export async function handleGenerateTicknalTake(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const result = await generateTheTicknalTakePosts();

    try {
      revalidatePath('/news');
      revalidatePath('/home');
      revalidatePath('/markets');
    } catch {}

    await db.insert(systemLogs).values({
      source: 'cron-ticknal-take',
      level: result.success ? 'INFO' : 'ERROR',
      message: `The Ticknal Take briefing generation completed: ${result.postsCreated} posts published for date ${result.date}.`,
      metadata: result,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in handleGenerateTicknalTake:', error);
    await db.insert(systemLogs).values({
      source: 'cron-ticknal-take',
      level: 'ERROR',
      message: `Failed to generate The Ticknal Take: ${(error as Error).message}`,
      metadata: { error: (error as Error).message },
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}
