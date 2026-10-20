import { db } from '@/db';
import { dailyPrices, egxInvestorFlows, systemLogs, tickers } from '@/db/schema';
import { sql, eq, and, notInArray, desc } from 'drizzle-orm';
import { revalidateTag, revalidatePath } from 'next/cache';
import {
  fetchOfficialInvestorFlowForDate,
  buildInvestorFlowRow,
} from '@/lib/investor-flows/fetch-official-investor-flows';

export interface ManualInvestorFlowInput {
  date: string;
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
  source: 'MANUAL_PAYLOAD' | 'OFFICIAL_FEED';
  message: string;
}

/**
 * Synchronizes the EGX investor category flow (Egyptians, Arabs, Foreigners)
 * for a target trading session.
 */
export async function syncDailyInvestorFlows(options?: {
  targetDate?: string;
  manualData?: ManualInvestorFlowInput;
}): Promise<SyncInvestorFlowResult> {
  // 1. If manual payload is provided, directly store the verified official figures
  if (options?.manualData) {
    const m = options.manualData;
    const dateStr = m.date;
    const totalTurnover = Number(m.totalTurnover || (Number(m.egyptianBuy) + Number(m.arabBuy) + Number(m.foreignBuy)));

    await db
      .insert(egxInvestorFlows)
      .values({
        date: dateStr,
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
        target: egxInvestorFlows.date,
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
      revalidateTag('investor-flows', { expire: 0 });
      revalidatePath('/markets');
    } catch {}

    const foreignNet = Number(m.foreignNet);
    const egyptianNet = Number(m.egyptianNet);
    const arabNet = Number(m.arabNet);
    const foreignVol = Number(m.foreignBuy) + Number(m.foreignSell);
    const grandVol = foreignVol + Number(m.egyptianBuy) + Number(m.egyptianSell) + Number(m.arabBuy) + Number(m.arabSell);
    const foreignSharePct = grandVol > 0 ? Math.round((foreignVol / grandVol) * 1000) / 10 : 0;

    await db.insert(systemLogs).values({
      source: 'cron-investor-flows',
      level: 'INFO',
      message: `Manual EGX investor flow updated for ${dateStr}: Foreign net ${foreignNet > 0 ? '+' : ''}${Math.round(foreignNet / 1e6)}M EGP (${foreignSharePct}% share).`,
      metadata: { date: dateStr, totalTurnover, foreignNet, egyptianNet, arabNet },
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
      message: `Successfully ingested official investor flow for ${dateStr}`,
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
    dateStr = typeof latestPrice[0].date === 'string' ? latestPrice[0].date : new Date(latestPrice[0].date).toISOString().split('T')[0];
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

  // EGX regular sessions have 200+ traded equities and billions in turnover.
  // Holidays or closed sessions have 0 active equities (or rare isolated anomalies).
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

  // 4. Check if we already have an existing entry for this date
  const existingRows = await db
    .select()
    .from(egxInvestorFlows)
    .where(eq(egxInvestorFlows.date, dateStr))
    .limit(1);
  const existingFlow = existingRows[0];

  // If already present with valid non-zero values, preserve it unless explicitly forced
  if (existingFlow && Number(existingFlow.totalTurnover) >= 100_000_000) {
    const foreignNet = Number(existingFlow.foreignNet);
    const egyptianNet = Number(existingFlow.egyptianNet);
    const arabNet = Number(existingFlow.arabNet);
    const fVol = Number(existingFlow.foreignBuy) + Number(existingFlow.foreignSell);
    const totVol = fVol + Number(existingFlow.egyptianBuy) + Number(existingFlow.egyptianSell) + Number(existingFlow.arabBuy) + Number(existingFlow.arabSell);
    const foreignSharePct = totVol > 0 ? Math.round((fVol / totVol) * 1000) / 10 : 8.0;

    return {
      success: true,
      date: dateStr,
      totalTurnover: Number(existingFlow.totalTurnover),
      foreignNet,
      egyptianNet,
      arabNet,
      foreignSharePct,
      source: 'OFFICIAL_FEED',
      message: `Investor flow already recorded for session ${dateStr}.`,
    };
  }

  // 5. Fetch and verify official EGX investor flow report
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

  await db
    .insert(egxInvestorFlows)
    .values({
      date: dateStr,
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
    })
    .onConflictDoUpdate({
      target: egxInvestorFlows.date,
      set: {
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
        updatedAt: new Date(),
      },
    });

  try {
    revalidateTag('investor-flows', { expire: 0 });
    revalidatePath('/markets');
  } catch {}

  const foreignSharePct = verifiedSession.foreignSharePct;

  await db.insert(systemLogs).values({
    source: 'cron-investor-flows',
    level: 'INFO',
    message: `Synced official EGX investor flow for session ${dateStr} [${verifiedSession.parseMethod}]. Foreign Net: ${row.foreignNet >= 0 ? '+' : ''}${(row.foreignNet / 1e6).toFixed(1)}M EGP (${foreignSharePct}% share).`,
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
    message: `Successfully synchronized official investor flow for session ${dateStr}`,
  };
}
