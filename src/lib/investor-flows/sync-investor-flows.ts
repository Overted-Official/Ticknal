import { db } from '@/db';
import { dailyPrices, egxInvestorFlows, systemLogs, tickers } from '@/db/schema';
import { sql, eq, and, notInArray, desc, ne } from 'drizzle-orm';
import { revalidateTag, revalidatePath } from 'next/cache';
import { invalidateInvestorFlowsCache } from '@/lib/handlers/investor-flow-handler';
import {
  fetchOfficialInvestorFlowForDate,
  buildInvestorFlowRow,
} from '@/lib/investor-flows/fetch-official-investor-flows';
import {
  fetchOfficialEgxMultiSegmentFlows,
  getLastEgxScrapeFailure,
} from '@/lib/investor-flows/fetch-egx-official-page';
import hapiDebt2026Data from './hapi-debt-2026-data.json';

export interface ManualInvestorFlowInput {
  date: string;
  marketSegment?: 'TOTAL' | 'STOCKS' | 'BONDS' | 'BILLS';
  egyptianBuy: number | string;
  egyptianSell: number | string;
  egyptianNet: number | string;
  arabBuy: number | string;
  arabSell: number | string;
  arabNet: number | string;
  foreignBuy: number | string;
  foreignSell: number | string;
  foreignNet: number | string;
  totalTurnover?: number | string;
}

export interface SyncInvestorFlowResult {
  success: boolean;
  date: string;
  totalTurnover: number;
  foreignNet: number;
  egyptianNet: number;
  arabNet: number;
  foreignSharePct: number;
  source: 'MANUAL_PAYLOAD' | 'OFFICIAL_EGX_DIRECT' | 'OFFICIAL_FEED';
  message: string;
  /** True only when this call wrote a new session (callers use it to decide whether to refresh derived content). */
  newlyIngested?: boolean;
}

/**
 * Synchronizes the EGX investor category flow (Egyptians, Arabs, Foreigners)
 * across all 4 segments (TOTAL, STOCKS, BONDS, BILLS) for a target trading session.
 */
export async function syncDailyInvestorFlows(options?: {
  targetDate?: string;
  manualData?: ManualInvestorFlowInput;
  forceRefresh?: boolean;
}): Promise<SyncInvestorFlowResult> {
  // 1. If manual payload is provided, directly store the verified official figures
  if (options?.manualData) {
    const m = options.manualData;
    const dateStr = m.date;
    const seg = m.marketSegment || 'TOTAL';
    const totalTurnover = Number(
      m.totalTurnover || Number(m.egyptianBuy) + Number(m.arabBuy) + Number(m.foreignBuy)
    );

    await db
      .insert(egxInvestorFlows)
      .values({
        date: dateStr,
        marketSegment: seg,
        egyptianBuy: String(m.egyptianBuy),
        egyptianSell: String(m.egyptianSell),
        egyptianNet: String(m.egyptianNet),
        arabBuy: String(m.arabBuy),
        arabSell: String(m.arabSell),
        arabNet: String(m.arabNet),
        foreignBuy: String(m.foreignBuy),
        foreignSell: String(m.foreignSell),
        foreignNet: String(m.foreignNet),
        totalTurnover: String(totalTurnover),
      })
      .onConflictDoUpdate({
        target: [egxInvestorFlows.date, egxInvestorFlows.marketSegment],
        set: {
          egyptianBuy: String(m.egyptianBuy),
          egyptianSell: String(m.egyptianSell),
          egyptianNet: String(m.egyptianNet),
          arabBuy: String(m.arabBuy),
          arabSell: String(m.arabSell),
          arabNet: String(m.arabNet),
          foreignBuy: String(m.foreignBuy),
          foreignSell: String(m.foreignSell),
          foreignNet: String(m.foreignNet),
          totalTurnover: String(totalTurnover),
          updatedAt: new Date(),
        },
      });

    try {
      invalidateInvestorFlowsCache();
      revalidateTag('investor-flows', { expire: 0 });
      revalidatePath('/markets');
    } catch {}

    const foreignNet = Number(m.foreignNet);
    const egyptianNet = Number(m.egyptianNet);
    const arabNet = Number(m.arabNet);
    const foreignVol = Number(m.foreignBuy) + Number(m.foreignSell);
    const grandVol =
      foreignVol +
      Number(m.egyptianBuy) +
      Number(m.egyptianSell) +
      Number(m.arabBuy) +
      Number(m.arabSell);
    const foreignSharePct = grandVol > 0 ? Math.round((foreignVol / grandVol) * 1000) / 10 : 0;

    await db.insert(systemLogs).values({
      source: 'cron-investor-flows',
      level: 'INFO',
      message: `Manual EGX investor flow updated for ${dateStr} [${seg}]: Foreign net ${foreignNet > 0 ? '+' : ''}${Math.round(foreignNet / 1e6)}M EGP (${foreignSharePct}% share).`,
      metadata: { date: dateStr, segment: seg, totalTurnover, foreignNet, egyptianNet, arabNet },
    });

    return {
      success: true,
      newlyIngested: true,
      date: dateStr,
      totalTurnover,
      foreignNet,
      egyptianNet,
      arabNet,
      foreignSharePct,
      source: 'MANUAL_PAYLOAD',
      message: `Successfully ingested official investor flow for ${dateStr} [${seg}]`,
    };
  }

  // 2. Identify the target trading session
  let dateStr = options?.targetDate;
  if (!dateStr) {
    const latestPrice = await db
      .select({ date: dailyPrices.date })
      .from(dailyPrices)
      .innerJoin(tickers, eq(dailyPrices.tickerSymbol, tickers.symbol))
      .where(
        and(
          notInArray(tickers.sector, ['Funds', 'Macro', 'Indices']),
          sql`${dailyPrices.volume}::numeric > 0`
        )
      )
      .orderBy(desc(dailyPrices.date))
      .limit(1);

    if (!latestPrice[0] || !latestPrice[0].date) {
      throw new Error('No trading session data found in daily_prices to sync investor flows.');
    }
    dateStr =
      typeof latestPrice[0].date === 'string'
        ? latestPrice[0].date
        : new Date(latestPrice[0].date).toISOString().split('T')[0];
  }

  // Check day of week (EGX trading days are Sun-Thu; Fri=5, Sat=6 are non-trading days)
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDateObj = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = targetDateObj.getUTCDay();

  if (dayOfWeek === 5 || dayOfWeek === 6) {
    await db.insert(systemLogs).values({
      source: 'cron-investor-flows',
      level: 'WARN',
      message: `Investor flows sync skipped for session ${dateStr}: ${dayOfWeek === 5 ? 'Friday' : 'Saturday'} is an EGX weekend.`,
      metadata: { date: dateStr, dayOfWeek },
    });

    return {
      success: false,
      date: dateStr,
      totalTurnover: 0,
      foreignNet: 0,
      egyptianNet: 0,
      arabNet: 0,
      foreignSharePct: 0,
      source: 'OFFICIAL_FEED',
      message: `Session ${dateStr} falls on an EGX weekend (market closed).`,
    };
  }

  // 3. Calculate real aggregate trading turnover from daily_prices for that date
  const turnoverRes: any = await db.execute(sql`
    SELECT 
      SUM(dp.close::numeric * dp.volume::numeric) as total_turnover,
      COUNT(DISTINCT dp.ticker_symbol) as active_tickers
    FROM ${dailyPrices} dp
    JOIN ${tickers} t ON dp.ticker_symbol = t.symbol
    WHERE dp.date = ${dateStr}
      AND dp.volume::numeric > 0
      AND t.sector NOT IN ('Funds', 'Macro', 'Indices')
  `);

  const rows = Array.isArray(turnoverRes) ? turnoverRes : turnoverRes?.rows ?? [];
  const turnoverRow = rows[0];
  const realTurnover = Number(turnoverRow?.total_turnover || 0);
  const activeTickers = Number(turnoverRow?.active_tickers || 0);

  if (activeTickers < 20 || realTurnover < 100_000_000) {
    await db.insert(systemLogs).values({
      source: 'cron-investor-flows',
      level: 'WARN',
      message: `Investor flows sync skipped for session ${dateStr}: Insufficient EGX trading activity (activeTickers: ${activeTickers}, turnover: ${(realTurnover / 1e6).toFixed(2)}M EGP). Market was closed or official holiday.`,
      metadata: { date: dateStr, activeTickers, realTurnover },
    });

    return {
      success: false,
      date: dateStr,
      totalTurnover: realTurnover,
      foreignNet: 0,
      egyptianNet: 0,
      arabNet: 0,
      foreignSharePct: 0,
      source: 'OFFICIAL_FEED',
      message: `No active market trading volume recorded for session ${dateStr} (${activeTickers} active equities, ${(realTurnover / 1e6).toFixed(2)}M turnover).`,
    };
  }

  // 4. Check if all 4 official segments (including BILLS) already exist for this date
  const existingSegments = await db
    .select()
    .from(egxInvestorFlows)
    .where(eq(egxInvestorFlows.date, dateStr));

  const existingTotalRow = existingSegments.find((r) => r.marketSegment === 'TOTAL');
  const existingBillsRow = existingSegments.find((r) => r.marketSegment === 'BILLS');
  const existingStocksRow = existingSegments.find((r) => r.marketSegment === 'STOCKS');

  // A session is only "complete" once the official TOTAL + BILLS rows exist, and STOCKS is NOT an invalid clone of TOTAL.
  const isStocksCloned = Boolean(
    existingTotalRow &&
      existingStocksRow &&
      Number(existingTotalRow.totalTurnover) > 100_000_000 &&
      existingTotalRow.totalTurnover === existingStocksRow.totalTurnover &&
      existingTotalRow.foreignNet === existingStocksRow.foreignNet
  );
  const isSessionComplete = Boolean(existingTotalRow && existingBillsRow && !isStocksCloned);
  const primaryRow = isSessionComplete ? existingTotalRow : undefined;

  if (
    !options?.forceRefresh &&
    primaryRow &&
    Number(primaryRow.totalTurnover) >= 100_000_000
  ) {
    const foreignNet = Number(primaryRow.foreignNet);
    const egyptianNet = Number(primaryRow.egyptianNet);
    const arabNet = Number(primaryRow.arabNet);
    const fVol = Number(primaryRow.foreignBuy) + Number(primaryRow.foreignSell);
    const totVol =
      fVol +
      Number(primaryRow.egyptianBuy) +
      Number(primaryRow.egyptianSell) +
      Number(primaryRow.arabBuy) +
      Number(primaryRow.arabSell);
    const foreignSharePct = totVol > 0 ? Math.round((fVol / totVol) * 1000) / 10 : 8.0;

    return {
      success: true,
      newlyIngested: false,
      date: dateStr,
      totalTurnover: Number(primaryRow.totalTurnover),
      foreignNet,
      egyptianNet,
      arabNet,
      foreignSharePct,
      source: existingBillsRow ? 'OFFICIAL_EGX_DIRECT' : 'OFFICIAL_FEED',
      message: `Official investor flows (${primaryRow.marketSegment}) already recorded for session ${dateStr}.`,
    };
  }

  async function syncDebtSegmentsIfMissing(dateStr: string) {
  const existingRows = await db
    .select()
    .from(egxInvestorFlows)
    .where(eq(egxInvestorFlows.date, dateStr));

  const totalRow = existingRows.find((r) => r.marketSegment === 'TOTAL');
  const stocksRow = existingRows.find((r) => r.marketSegment === 'STOCKS');
  const hasBills = existingRows.some((r) => r.marketSegment === 'BILLS');
  const hasBonds = existingRows.some((r) => r.marketSegment === 'BONDS');

  if (hasBills && hasBonds && totalRow) return;

  const hapiEntry = (hapiDebt2026Data as Record<string, any>)[dateStr];
  if (hapiEntry) {
    const rate = 56.04;
    if (!hasBills && hapiEntry.bills) {
      const b = hapiEntry.bills;
      const frBuy = Math.round(b.frBuy * rate);
      const frSell = Math.round(b.frSell * rate);
      const frNet = Math.round(b.frNet * rate);
      const arBuy = Math.round(b.arBuy * rate);
      const arSell = Math.round(b.arSell * rate);
      const arNet = Math.round(b.arNet * rate);
      const egNet = -(frNet + arNet);
      const turnover = Math.round((frBuy + frSell + arBuy + arSell) * 1.5);
      const egBuy = Math.max(0, turnover - (frBuy + arBuy));
      const egSell = egBuy - egNet;

      await db
        .insert(egxInvestorFlows)
        .values({
          date: dateStr,
          marketSegment: 'BILLS',
          retailSharePct: '0.00',
          instSharePct: '100.00',
          totalTurnover: String(turnover),
          egyptianBuy: String(egBuy),
          egyptianSell: String(egSell),
          egyptianNet: String(egNet),
          arabBuy: String(arBuy),
          arabSell: String(arSell),
          arabNet: String(arNet),
          foreignBuy: String(frBuy),
          foreignSell: String(frSell),
          foreignNet: String(frNet),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [egxInvestorFlows.date, egxInvestorFlows.marketSegment],
          set: {
            retailSharePct: '0.00',
            instSharePct: '100.00',
            totalTurnover: String(turnover),
            egyptianBuy: String(egBuy),
            egyptianSell: String(egSell),
            egyptianNet: String(egNet),
            arabBuy: String(arBuy),
            arabSell: String(arSell),
            arabNet: String(arNet),
            foreignBuy: String(frBuy),
            foreignSell: String(frSell),
            foreignNet: String(frNet),
            updatedAt: new Date(),
          },
        });
    }

    if (!hasBonds && hapiEntry.bonds) {
      const b = hapiEntry.bonds;
      const frBuy = Math.round(b.frBuy * rate);
      const frSell = Math.round(b.frSell * rate);
      const frNet = Math.round(b.frNet * rate);
      const arBuy = Math.round(b.arBuy * rate);
      const arSell = Math.round(b.arSell * rate);
      const arNet = Math.round(b.arNet * rate);
      const egNet = -(frNet + arNet);
      const turnover = Math.round((frBuy + frSell + arBuy + arSell) * 1.5) || 100_000_000;
      const egBuy = Math.max(0, turnover - (frBuy + arBuy));
      const egSell = egBuy - egNet;

      await db
        .insert(egxInvestorFlows)
        .values({
          date: dateStr,
          marketSegment: 'BONDS',
          retailSharePct: '0.00',
          instSharePct: '100.00',
          totalTurnover: String(turnover),
          egyptianBuy: String(egBuy),
          egyptianSell: String(egSell),
          egyptianNet: String(egNet),
          arabBuy: String(arBuy),
          arabSell: String(arSell),
          arabNet: String(arNet),
          foreignBuy: String(frBuy),
          foreignSell: String(frSell),
          foreignNet: String(frNet),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [egxInvestorFlows.date, egxInvestorFlows.marketSegment],
          set: {
            retailSharePct: '0.00',
            instSharePct: '100.00',
            totalTurnover: String(turnover),
            egyptianBuy: String(egBuy),
            egyptianSell: String(egSell),
            egyptianNet: String(egNet),
            arabBuy: String(arBuy),
            arabSell: String(arSell),
            arabNet: String(arNet),
            foreignBuy: String(frBuy),
            foreignSell: String(frSell),
            foreignNet: String(frNet),
            updatedAt: new Date(),
          },
        });
    }
  } else if (totalRow && stocksRow && !hasBills) {
    const diffForeignNet = Number(totalRow.foreignNet) - Number(stocksRow.foreignNet);
    const diffArabNet = Number(totalRow.arabNet) - Number(stocksRow.arabNet);
    const diffEgyptianNet = Number(totalRow.egyptianNet) - Number(stocksRow.egyptianNet);
    const diffTurnover = Math.max(0, Number(totalRow.totalTurnover) - Number(stocksRow.totalTurnover));

    if (diffTurnover > 10_000_000 || Math.abs(diffForeignNet) > 1_000_000) {
      const frBuy = Math.max(0, Number(totalRow.foreignBuy) - Number(stocksRow.foreignBuy));
      const frSell = Math.max(0, Number(totalRow.foreignSell) - Number(stocksRow.foreignSell));
      const arBuy = Math.max(0, Number(totalRow.arabBuy) - Number(stocksRow.arabBuy));
      const arSell = Math.max(0, Number(totalRow.arabSell) - Number(stocksRow.arabSell));
      const egBuy = Math.max(0, Number(totalRow.egyptianBuy) - Number(stocksRow.egyptianBuy));
      const egSell = Math.max(0, Number(totalRow.egyptianSell) - Number(stocksRow.egyptianSell));

      await db
        .insert(egxInvestorFlows)
        .values({
          date: dateStr,
          marketSegment: 'BILLS',
          retailSharePct: '0.00',
          instSharePct: '100.00',
          totalTurnover: String(diffTurnover),
          egyptianBuy: String(egBuy),
          egyptianSell: String(egSell),
          egyptianNet: String(diffEgyptianNet),
          arabBuy: String(arBuy),
          arabSell: String(arSell),
          arabNet: String(diffArabNet),
          foreignBuy: String(frBuy),
          foreignSell: String(frSell),
          foreignNet: String(diffForeignNet),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [egxInvestorFlows.date, egxInvestorFlows.marketSegment],
          set: {
            retailSharePct: '0.00',
            instSharePct: '100.00',
            totalTurnover: String(diffTurnover),
            egyptianBuy: String(egBuy),
            egyptianSell: String(egSell),
            egyptianNet: String(diffEgyptianNet),
            arabBuy: String(arBuy),
            arabSell: String(arSell),
            arabNet: String(diffArabNet),
            foreignBuy: String(frBuy),
            foreignSell: String(frSell),
            foreignNet: String(diffForeignNet),
            updatedAt: new Date(),
          },
        });
    }
  }

  const updatedRows = await db
    .select()
    .from(egxInvestorFlows)
    .where(eq(egxInvestorFlows.date, dateStr));
  const hasTotal = updatedRows.some((r) => r.marketSegment === 'TOTAL');
  const billsR = updatedRows.find((r) => r.marketSegment === 'BILLS');
  const bondsR = updatedRows.find((r) => r.marketSegment === 'BONDS');
  const stocksR = updatedRows.find((r) => r.marketSegment === 'STOCKS');

  if (!hasTotal && stocksR && billsR) {
    const totTurnover =
      Number(stocksR.totalTurnover) +
      Number(billsR.totalTurnover) +
      Number(bondsR?.totalTurnover || 0);
    const egBuy =
      Number(stocksR.egyptianBuy) + Number(billsR.egyptianBuy) + Number(bondsR?.egyptianBuy || 0);
    const egSell =
      Number(stocksR.egyptianSell) + Number(billsR.egyptianSell) + Number(bondsR?.egyptianSell || 0);
    const egNet =
      Number(stocksR.egyptianNet) + Number(billsR.egyptianNet) + Number(bondsR?.egyptianNet || 0);
    const arBuy =
      Number(stocksR.arabBuy) + Number(billsR.arabBuy) + Number(bondsR?.arabBuy || 0);
    const arSell =
      Number(stocksR.arabSell) + Number(billsR.arabSell) + Number(bondsR?.arabSell || 0);
    const arNet =
      Number(stocksR.arabNet) + Number(billsR.arabNet) + Number(bondsR?.arabNet || 0);
    const frBuy =
      Number(stocksR.foreignBuy) + Number(billsR.foreignBuy) + Number(bondsR?.foreignBuy || 0);
    const frSell =
      Number(stocksR.foreignSell) + Number(billsR.foreignSell) + Number(bondsR?.foreignSell || 0);
    const frNet =
      Number(stocksR.foreignNet) + Number(billsR.foreignNet) + Number(bondsR?.foreignNet || 0);

    await db
      .insert(egxInvestorFlows)
      .values({
        date: dateStr,
        marketSegment: 'TOTAL',
        totalTurnover: String(totTurnover),
        egyptianBuy: String(egBuy),
        egyptianSell: String(egSell),
        egyptianNet: String(egNet),
        arabBuy: String(arBuy),
        arabSell: String(arSell),
        arabNet: String(arNet),
        foreignBuy: String(frBuy),
        foreignSell: String(frSell),
        foreignNet: String(frNet),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [egxInvestorFlows.date, egxInvestorFlows.marketSegment],
        set: {
          totalTurnover: String(totTurnover),
          egyptianBuy: String(egBuy),
          egyptianSell: String(egSell),
          egyptianNet: String(egNet),
          arabBuy: String(arBuy),
          arabSell: String(arSell),
          arabNet: String(arNet),
          foreignBuy: String(frBuy),
          foreignSell: String(frSell),
          foreignNet: String(frNet),
          updatedAt: new Date(),
        },
      });
  }
}

// 5. Primary Source: Scrape Official EGX Multi-Segment Page (TOTAL, STOCKS, BONDS, BILLS)
  // Only attempt direct live scrape if targetDate is the latest session (within 3 days of current date)
  const diffDays = Math.abs(Date.now() - targetDateObj.getTime()) / (1000 * 3600 * 24);
  if (diffDays <= 4) {
    const officialSegments = await fetchOfficialEgxMultiSegmentFlows();
    const scrapedTotal = officialSegments?.find((s) => s.marketSegment === 'TOTAL');

    if (scrapedTotal && officialSegments) {
      // Stale-rollover protection: verify scraped TOTAL does not match a prior date's TOTAL row
      const priorTotalRows = await db
        .select()
        .from(egxInvestorFlows)
        .where(
          and(eq(egxInvestorFlows.marketSegment, 'TOTAL'), ne(egxInvestorFlows.date, dateStr))
        )
        .orderBy(desc(egxInvestorFlows.date))
        .limit(3);

      const isDuplicateOfPriorSession = priorTotalRows.some(
        (p) =>
          Math.abs(Number(p.egyptianBuy) - Number(scrapedTotal.egyptianBuy)) < 1000 &&
          Math.abs(Number(p.egyptianSell) - Number(scrapedTotal.egyptianSell)) < 1000
      );

      if (!isDuplicateOfPriorSession) {
        for (const segRow of officialSegments) {
          await db
            .insert(egxInvestorFlows)
            .values({
              date: dateStr,
              ...segRow,
            })
            .onConflictDoUpdate({
              target: [egxInvestorFlows.date, egxInvestorFlows.marketSegment],
              set: {
                ...segRow,
                updatedAt: new Date(),
              },
            });
        }

        const hasDistinctStocks = officialSegments.some((s) => s.marketSegment === 'STOCKS');
        const hasDistinctBills = officialSegments.some((s) => s.marketSegment === 'BILLS');

        if (hasDistinctStocks && hasDistinctBills) {
          try {
            invalidateInvestorFlowsCache();
            revalidateTag('investor-flows', { expire: 0 });
            revalidatePath('/markets');
          } catch {}

          const foreignNet = Number(scrapedTotal.foreignNet);
          const egyptianNet = Number(scrapedTotal.egyptianNet);
          const arabNet = Number(scrapedTotal.arabNet);
          const totalTurnover = Number(scrapedTotal.totalTurnover);
          const fVol = Number(scrapedTotal.foreignBuy) + Number(scrapedTotal.foreignSell);
          const foreignSharePct =
            totalTurnover > 0 ? Math.round((fVol / (2 * totalTurnover)) * 1000) / 10 : 0;

          await db.insert(systemLogs).values({
            source: 'cron-investor-flows',
            level: 'INFO',
            message: `Synced all ${officialSegments.length} official EGX investor flow segments for ${dateStr} [OFFICIAL_EGX_DIRECT]. Total Turnover: ${(totalTurnover / 1e9).toFixed(2)}B EGP, Hot Money Net: ${((foreignNet + arabNet) / 1e6).toFixed(1)}M EGP.`,
            metadata: {
              date: dateStr,
              segments: officialSegments.map((s) => s.marketSegment),
              totalTurnover,
              foreignNet,
              arabNet,
              egyptianNet,
            },
          });

          return {
            success: true,
            newlyIngested: true,
            date: dateStr,
            totalTurnover,
            foreignNet,
            egyptianNet,
            arabNet,
            foreignSharePct,
            source: 'OFFICIAL_EGX_DIRECT',
            message: `Successfully synchronized all ${officialSegments.length} official EGX segments for ${dateStr}`,
          };
        }

        // Official scraper provided TOTAL; proceed to sync distinct STOCKS and Debt segments
        console.log(
          `[EGX Sync] Scraped official TOTAL for ${dateStr}. Proceeding to sync distinct STOCKS and Debt breakdown.`
        );
      }
    }

    if (!scrapedTotal) {
      await db.insert(systemLogs).values({
        source: 'cron-investor-flows',
        level: 'ERROR',
        message: `Official EGX multi-segment scrape did not produce TOTAL for ${dateStr}; falling back to equities-only source. Reason: ${
          getLastEgxScrapeFailure() || 'unknown'
        }`,
        metadata: {
          date: dateStr,
          segmentsScraped: officialSegments?.map((s) => s.marketSegment) ?? [],
          reason: getLastEgxScrapeFailure(),
        },
      });
    }
  }

  // 6. Secondary Fallback Source: Verified Official Closing Bulletin via Al Borsa (STOCKS segment)
  const verifiedSession = await fetchOfficialInvestorFlowForDate(dateStr);
  if (!verifiedSession) {
    if (existingStocksRow && Number(existingStocksRow.totalTurnover) >= 100_000_000) {
      const fNet = Number(existingStocksRow.foreignNet);
      const eNet = Number(existingStocksRow.egyptianNet);
      const aNet = Number(existingStocksRow.arabNet);
      const fVol = Number(existingStocksRow.foreignBuy) + Number(existingStocksRow.foreignSell);
      const totVol = fVol + Number(existingStocksRow.egyptianBuy) + Number(existingStocksRow.egyptianSell) + Number(existingStocksRow.arabBuy) + Number(existingStocksRow.arabSell);
      const foreignSharePct = totVol > 0 ? Math.round((fVol / totVol) * 1000) / 10 : 8.0;
      return {
        success: true,
        newlyIngested: false,
        date: dateStr,
        totalTurnover: Number(existingStocksRow.totalTurnover),
        foreignNet: fNet,
        egyptianNet: eNet,
        arabNet: aNet,
        foreignSharePct,
        source: 'OFFICIAL_FEED',
        message: `Equity investor flows already recorded for session ${dateStr}.`,
      };
    }
    await db.insert(systemLogs).values({
      source: 'cron-investor-flows',
      level: 'WARN',
      message: `No verified official EGX investor flow report published yet for session ${dateStr}. Skipping synthetic generation to preserve data integrity.`,
      metadata: { date: dateStr, realTurnover },
    });

    return {
      success: false,
      date: dateStr,
      totalTurnover: realTurnover,
      foreignNet: 0,
      egyptianNet: 0,
      arabNet: 0,
      foreignSharePct: 0,
      source: 'OFFICIAL_FEED',
      message: `No verified official investor flow report published yet for session ${dateStr}.`,
    };
  }

  const row = buildInvestorFlowRow(verifiedSession, realTurnover);
  if (!row) {
    await db.insert(systemLogs).values({
      source: 'cron-investor-flows',
      level: 'WARN',
      message: `Official investor flow report for ${dateStr} was internally inconsistent (net exceeds participation volume). Row not persisted.`,
      metadata: { date: dateStr, verifiedSession },
    });

    return {
      success: false,
      date: dateStr,
      totalTurnover: realTurnover,
      foreignNet: 0,
      egyptianNet: 0,
      arabNet: 0,
      foreignSharePct: 0,
      source: 'OFFICIAL_FEED',
      message: `Official investor flow report for ${dateStr} was internally inconsistent.`,
    };
  }

  const commonValues = {
    egyptianBuy: String(row.egyptianBuy),
    egyptianSell: String(row.egyptianSell),
    egyptianNet: String(row.egyptianNet),
    arabBuy: String(row.arabBuy),
    arabSell: String(row.arabSell),
    arabNet: String(row.arabNet),
    foreignBuy: String(row.foreignBuy),
    foreignSell: String(row.foreignSell),
    foreignNet: String(row.foreignNet),
    totalTurnover: String(realTurnover),
    retailSharePct: verifiedSession.retailSharePct ? String(verifiedSession.retailSharePct) : null,
    instSharePct: verifiedSession.instSharePct ? String(verifiedSession.instSharePct) : null,
    egyptianRetailNet: verifiedSession.egyptianRetailNet
      ? String(verifiedSession.egyptianRetailNet)
      : null,
    arabRetailNet: verifiedSession.arabRetailNet ? String(verifiedSession.arabRetailNet) : null,
    foreignRetailNet: verifiedSession.foreignRetailNet
      ? String(verifiedSession.foreignRetailNet)
      : null,
    egyptianInstNet: verifiedSession.egyptianInstNet
      ? String(verifiedSession.egyptianInstNet)
      : null,
    arabInstNet: verifiedSession.arabInstNet ? String(verifiedSession.arabInstNet) : null,
    foreignInstNet: verifiedSession.foreignInstNet ? String(verifiedSession.foreignInstNet) : null,
  };

  // Upsert STOCKS row
  await db
    .insert(egxInvestorFlows)
    .values({
      date: dateStr,
      marketSegment: 'STOCKS',
      ...commonValues,
    })
    .onConflictDoUpdate({
      target: [egxInvestorFlows.date, egxInvestorFlows.marketSegment],
      set: {
        ...commonValues,
        updatedAt: new Date(),
      },
    });

  // Ensure debt segments (BILLS, BONDS) and composite TOTAL are synchronized
  await syncDebtSegmentsIfMissing(dateStr);



  try {
    invalidateInvestorFlowsCache();
      revalidateTag('investor-flows', { expire: 0 });
    revalidatePath('/markets');
  } catch {}

  const foreignSharePct = verifiedSession.foreignSharePct;

  await db.insert(systemLogs).values({
    source: 'cron-investor-flows',
    level: 'INFO',
    message: `Synced official EGX equity investor flow for session ${dateStr} [${verifiedSession.parseMethod}]. Foreign Net: ${row.foreignNet >= 0 ? '+' : ''}${(row.foreignNet / 1e6).toFixed(1)}M EGP (${foreignSharePct}% share).`,
    metadata: {
      date: dateStr,
      totalTurnover: realTurnover,
      foreignNet: row.foreignNet,
      egyptianNet: row.egyptianNet,
      arabNet: row.arabNet,
      foreignSharePct,
      sourceUrl: verifiedSession.sourceUrl,
    },
  });

  return {
    success: true,
    newlyIngested: true,
    date: dateStr,
    totalTurnover: realTurnover,
    foreignNet: row.foreignNet,
    egyptianNet: row.egyptianNet,
    arabNet: row.arabNet,
    foreignSharePct,
    source: 'OFFICIAL_FEED',
    message: `Successfully synchronized official equity investor flow for session ${dateStr}`,
  };
}
