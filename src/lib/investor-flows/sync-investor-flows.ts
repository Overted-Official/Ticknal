import { db } from '@/db';
import { dailyPrices, egxInvestorFlows, systemLogs, tickers } from '@/db/schema';
import { sql, eq, and, notInArray, desc, ne } from 'drizzle-orm';
import { revalidateTag, revalidatePath } from 'next/cache';
import { invalidateInvestorFlowsCache } from '@/lib/handlers/investor-flow-handler';
import {
  fetchOfficialInvestorFlowForDate,
  buildInvestorFlowRow,
} from '@/lib/investor-flows/fetch-official-investor-flows';
import { fetchOfficialEgxMultiSegmentFlows } from '@/lib/investor-flows/fetch-egx-official-page';

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

  if (
    !options?.forceRefresh &&
    existingTotalRow &&
    existingBillsRow &&
    Number(existingTotalRow.totalTurnover) >= 100_000_000
  ) {
    const foreignNet = Number(existingTotalRow.foreignNet);
    const egyptianNet = Number(existingTotalRow.egyptianNet);
    const arabNet = Number(existingTotalRow.arabNet);
    const fVol = Number(existingTotalRow.foreignBuy) + Number(existingTotalRow.foreignSell);
    const totVol =
      fVol +
      Number(existingTotalRow.egyptianBuy) +
      Number(existingTotalRow.egyptianSell) +
      Number(existingTotalRow.arabBuy) +
      Number(existingTotalRow.arabSell);
    const foreignSharePct = totVol > 0 ? Math.round((fVol / totVol) * 1000) / 10 : 8.0;

    return {
      success: true,
      date: dateStr,
      totalTurnover: Number(existingTotalRow.totalTurnover),
      foreignNet,
      egyptianNet,
      arabNet,
      foreignSharePct,
      source: 'OFFICIAL_EGX_DIRECT',
      message: `Multi-segment official investor flows already recorded for session ${dateStr}.`,
    };
  }

  // 5. Primary Source: Scrape Official EGX Multi-Segment Page (TOTAL, STOCKS, BONDS, BILLS)
  // Only attempt direct live scrape if targetDate is the latest session (within 3 days of current date)
  const diffDays = Math.abs(Date.now() - targetDateObj.getTime()) / (1000 * 3600 * 24);
  if (diffDays <= 4) {
    const officialSegments = await fetchOfficialEgxMultiSegmentFlows();
    const scrapedTotal = officialSegments?.find((s) => s.marketSegment === 'TOTAL');

    if (officialSegments && officialSegments.length >= 2 && scrapedTotal) {
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
    }
  }

  // 6. Secondary Fallback Source: Verified Official Closing Bulletin via Al Borsa (STOCKS segment)
  const verifiedSession = await fetchOfficialInvestorFlowForDate(dateStr);
  if (!verifiedSession) {
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

  // Upsert STOCKS row only (never write a partial TOTAL row without BONDS and BILLS)
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
