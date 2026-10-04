import { db } from '@/db';
import { dailyPrices, egxTradeStatistics, systemLogs } from '@/db/schema';
import { sql, eq, notInArray, desc } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

/**
 * Strict Asset Isolation Guard.
 * Ensures that mutual funds, precious metals, forex pairs, and macro indices
 * are NEVER touched or altered by the Smart Money equity pipeline.
 */
export function isEligibleEquityTicker(symbol: string): boolean {
  if (!symbol) return false;
  const s = symbol.trim().toUpperCase().replace('.CA', '');
  return (
    !s.startsWith('SNDUK_') &&
    !['GC1!', 'SI1!', 'USDEGP', 'EUREGP', 'EGX30', 'EGX70', 'EGX100'].includes(s)
  );
}

export interface VerifiedTradeInput {
  tickerSymbol: string;
  trades: number;
  volume?: number;
  value?: number;
}

export interface SyncSmartMoneyResult {
  success: boolean;
  date: string;
  processedCount: number;
  totalTurnover: number;
  message: string;
}

/**
 * Synchronizes daily smart money and trade statistics for active EGX equities.
 * STRICT POLICY: Only inserts 100% verified, real trade counts.
 * Never inserts mock, synthetic, or estimated trade counts.
 */
export async function syncDailySmartMoney(options?: {
  targetDate?: string;
  verifiedTrades?: Record<string, number> | VerifiedTradeInput[];
}): Promise<SyncSmartMoneyResult> {
  // 1. Determine target date
  let dateStr = options?.targetDate;
  if (!dateStr) {
    const latestBar = await db
      .select({ date: dailyPrices.date })
      .from(dailyPrices)
      .where(
        notInArray(dailyPrices.tickerSymbol, [
          'EGX30',
          'EGX70',
          'EGX100',
          'USDEGP',
          'EUREGP',
          'GC1!',
          'SI1!',
        ])
      )
      .orderBy(desc(dailyPrices.date))
      .limit(1);

    if (!latestBar[0] || !latestBar[0].date) {
      return {
        success: false,
        date: '',
        processedCount: 0,
        totalTurnover: 0,
        message: 'No active trading session found to sync smart money.',
      };
    }
    dateStr =
      typeof latestBar[0].date === 'string'
        ? latestBar[0].date
        : new Date(latestBar[0].date).toISOString().split('T')[0];
  }

  // Build lookup of verified trade counts
  const verifiedMap = new Map<string, number>();
  if (options?.verifiedTrades) {
    if (Array.isArray(options.verifiedTrades)) {
      for (const item of options.verifiedTrades) {
        if (item.trades && item.trades > 0) {
          verifiedMap.set(
            item.tickerSymbol.toUpperCase().replace('.CA', ''),
            item.trades
          );
        }
      }
    } else {
      for (const [sym, count] of Object.entries(options.verifiedTrades)) {
        if (count && count > 0) {
          verifiedMap.set(sym.toUpperCase().replace('.CA', ''), count);
        }
      }
    }
  }

  // If no verified trade counts were supplied, do not write synthetic data
  if (verifiedMap.size === 0) {
    return {
      success: true,
      date: dateStr,
      processedCount: 0,
      totalTurnover: 0,
      message: `No verified trade counts provided for session ${dateStr}; skipped writing mock data.`,
    };
  }

  // 2. Fetch session bars for verified symbols
  const sessionBars = await db
    .select({
      tickerSymbol: dailyPrices.tickerSymbol,
      open: dailyPrices.open,
      high: dailyPrices.high,
      low: dailyPrices.low,
      close: dailyPrices.close,
      volume: dailyPrices.volume,
    })
    .from(dailyPrices)
    .where(eq(dailyPrices.date, dateStr));

  // 3. Filter strictly for eligible EGX equities that have verified trade counts
  const eligibleBars = sessionBars.filter(
    (b) =>
      isEligibleEquityTicker(b.tickerSymbol) &&
      verifiedMap.has(b.tickerSymbol.toUpperCase().replace('.CA', ''))
  );

  if (eligibleBars.length === 0) {
    return {
      success: true,
      date: dateStr,
      processedCount: 0,
      totalTurnover: 0,
      message: `No matching eligible equities with verified trades for session ${dateStr}.`,
    };
  }

  let totalTurnover = 0;
  const rowsToInsert = [];

  for (const bar of eligibleBars) {
    const sym = bar.tickerSymbol.toUpperCase().replace('.CA', '');
    const verifiedTradeCount = verifiedMap.get(sym)!;

    const close = Number(bar.close || 0);
    const high = Number(bar.high || close);
    const low = Number(bar.low || close);
    const volume = Number(bar.volume || 0);
    const turnover = close * volume;
    totalTurnover += turnover;

    const spread = Math.max(high - low, 0.0001);
    const clv = spread > 0 ? ((close - low) - (high - close)) / spread : 0;
    const ats = verifiedTradeCount > 0 ? turnover / verifiedTradeCount : 0;

    rowsToInsert.push({
      tickerSymbol: sym,
      date: dateStr,
      trades: verifiedTradeCount,
      volume: String(volume),
      value: String(Math.round(turnover * 100) / 100),
      averageTradeSize: String(Math.round(ats * 100) / 100),
      absorptionRatio: String(1.0),
      clv: String(Math.round(clv * 10000) / 10000),
    });
  }

  // 4. Batch upsert in chunks of 50
  for (let i = 0; i < rowsToInsert.length; i += 50) {
    const chunk = rowsToInsert.slice(i, i + 50);
    await db
      .insert(egxTradeStatistics)
      .values(chunk)
      .onConflictDoUpdate({
        target: [egxTradeStatistics.tickerSymbol, egxTradeStatistics.date],
        set: {
          trades: sql`EXCLUDED.trades`,
          volume: sql`EXCLUDED.volume`,
          value: sql`EXCLUDED.value`,
          averageTradeSize: sql`EXCLUDED.average_trade_size`,
          clv: sql`EXCLUDED.clv`,
          updatedAt: new Date(),
        },
      });
  }

  try {
    revalidateTag('smart-money', { expire: 0 });
  } catch {}

  await db.insert(systemLogs).values({
    source: 'cron-smart-money',
    level: 'INFO',
    message: `Synchronized verified trade statistics for ${eligibleBars.length} EGX equities on ${dateStr}.`,
    metadata: {
      date: dateStr,
      processedCount: eligibleBars.length,
      totalTurnover,
    },
  });

  return {
    success: true,
    date: dateStr,
    processedCount: eligibleBars.length,
    totalTurnover,
    message: `Recorded ${eligibleBars.length} verified trade records for session ${dateStr}.`,
  };
}
