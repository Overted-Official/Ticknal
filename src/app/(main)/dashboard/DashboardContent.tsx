import Link from 'next/link';
import { connection } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dailyPrices, positions, tickerAlerts, tickers } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar, type PsiSignal } from '@/strategies/PSI/psiStrategy';
import { getRecentOpportunities } from '@/lib/opportunities';
import { getCachedTickers, getCachedRecentPrices } from '@/lib/data-cache';
import OpportunityTable from '@/components/platform/OpportunityTable';
import TestNotificationButton from '@/components/platform/TestNotificationButton';
import DashboardCharts from '@/components/platform/DashboardCharts';
import DashboardMotionView from '@/components/platform/DashboardMotionView';
import { type SectorDataItem } from '@/components/platform/SectorDonutChart';
import { type MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';

type DashboardOrder = {
  id: number;
  tickerSymbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPct: number;
};

type Opportunity = {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  signal: PsiSignal;
};

const DASHBOARD_HISTORY_BARS = 320;

export default async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-auto bg-tv-base text-tv-text items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to QuantEGX</h2>
        <p className="text-tv-muted mb-6">Please sign in to view your personalized dashboard and portfolio.</p>
        <Link href="/" className="bg-tv-accent text-white px-6 py-2 rounded-tv-sm hover:bg-tv-accent/90 transition">
          Sign In
        </Link>
      </div>
    );
  }

  const [orderStats, opportunities, activeAlertCount] = await Promise.all([
    getOrderStats(user.id),
    getRecentOpportunities(),
    getActiveAlertCount(user.id),
  ]);
  const openPositionTickers = new Set(orderStats.openOrders.map(o => o.tickerSymbol));
  const buyOpportunities = opportunities.filter((item) => item.signal.signal === 'BUY').slice(0, 12);
  const exitSignals = opportunities.filter((item) => item.signal.signal !== 'BUY' && openPositionTickers.has(item.symbol)).slice(0, 8);

  return (
    <DashboardMotionView
      orderStats={orderStats}
      buyOpportunities={buyOpportunities}
      exitSignals={exitSignals}
      activeAlertCount={activeAlertCount}
    />
  );
}

async function getOrderStats(userId: string) {
  const [openRows, closedRows, latestPrices, tickerMap, avgAdverseExcursion] = await Promise.all([
    db.select().from(positions).where(
      sql`${positions.status} = 'OPEN' AND ${positions.userId} = ${userId}`
    ).orderBy(desc(positions.createdAt)),
    db.select().from(positions).where(
      sql`${positions.status} = 'CLOSED' AND ${positions.userId} = ${userId}`
    ).orderBy(desc(positions.createdAt)),
    getLatestPriceMap(),
    getTickerMap(),
    getAvgAdverseExcursion(userId),
  ]);

  const openOrdersMap = new Map<string, DashboardOrder>();
  for (const order of openRows) {
    const symbol = order.tickerSymbol.trim().toUpperCase();
    const entryPrice = Number(order.entryPrice);
    const quantity = Number(order.quantity);
    const currentPrice = latestPrices[symbol] ?? entryPrice;
    const profitLoss = (currentPrice - entryPrice) * quantity;

    if (openOrdersMap.has(symbol)) {
      const existing = openOrdersMap.get(symbol)!;
      const totalCost = (existing.entryPrice * existing.quantity) + (entryPrice * quantity);
      const newQuantity = existing.quantity + quantity;
      const avgEntryPrice = totalCost / newQuantity;

      existing.quantity = newQuantity;
      existing.entryPrice = avgEntryPrice;
      existing.profitLoss += profitLoss;
      existing.profitLossPct = avgEntryPrice > 0 ? ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100 : 0;
    } else {
      openOrdersMap.set(symbol, {
        id: order.id,
        tickerSymbol: symbol,
        companyName: tickerMap[symbol]?.companyName ?? symbol,
        sector: tickerMap[symbol]?.sector ?? 'Unclassified',
        logoUrl: tickerMap[symbol]?.logoUrl ?? null,
        entryDate: order.entryDate,
        entryPrice,
        quantity,
        currentPrice,
        profitLoss,
        profitLossPct: entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0,
      });
    }
  }
  const openOrders = Array.from(openOrdersMap.values());

  // --- Sector Distribution ---
  const sectorMap = new Map<string, number>();
  for (const order of openOrders) {
    const sectorValue = order.currentPrice * order.quantity;
    sectorMap.set(order.sector, (sectorMap.get(order.sector) ?? 0) + sectorValue);
  }
  const totalMarketValue = openOrders.reduce((sum, o) => sum + o.currentPrice * o.quantity, 0);
  const sectorData: SectorDataItem[] = Array.from(sectorMap.entries())
    .map(([sector, value]) => ({
      sector,
      value,
      percentage: totalMarketValue > 0 ? (value / totalMarketValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // --- Monthly Investment & Realized P/L (Activity-based) ---
  type MonthlyBucket = { invested: number; realizedPL: number };
  const monthlyBucketMap = new Map<string, MonthlyBucket>();

  const getLabel = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(month) - 1]} '${year.slice(2)}`;
  };

  const allOrders = [...openRows, ...closedRows];
  const getIsoDate = (d: any) => typeof d === 'string' ? d : new Date(d as unknown as string).toISOString().split('T')[0];

  // 1. Determine the full date span across all entry and exit dates
  if (allOrders.length > 0) {
    let minDateStr = getIsoDate(allOrders[0].entryDate);
    let maxDateStr = getIsoDate(allOrders[0].entryDate);

    for (const order of allOrders) {
      const entryStr = getIsoDate(order.entryDate);
      if (entryStr < minDateStr) minDateStr = entryStr;
      if (entryStr > maxDateStr) maxDateStr = entryStr;
      if (order.exitDate) {
        const exitStr = getIsoDate(order.exitDate);
        if (exitStr > maxDateStr) maxDateStr = exitStr;
      }
    }

    // Generate empty monthly buckets from earliest date to today
    let current = new Date(minDateStr);
    current.setDate(1);
    const end = new Date(maxDateStr);
    end.setDate(1);
    const today = new Date();
    today.setDate(1);
    if (today > end) end.setTime(today.getTime());

    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const label = getLabel(`${year}-${month}`);
      if (!monthlyBucketMap.has(label)) {
        monthlyBucketMap.set(label, { invested: 0, realizedPL: 0 });
      }
      current.setMonth(current.getMonth() + 1);
    }
  }

  // 2. Invested: group by entryDate month (capital deployed)
  for (const order of allOrders) {
    const entryLabel = getLabel(getIsoDate(order.entryDate));
    const cost = Number(order.entryPrice) * Number(order.quantity);
    if (!monthlyBucketMap.has(entryLabel)) monthlyBucketMap.set(entryLabel, { invested: 0, realizedPL: 0 });
    monthlyBucketMap.get(entryLabel)!.invested += cost;
  }

  // 3. Realized P/L: group by exitDate month (gains/losses booked)
  for (const order of closedRows) {
    if (!order.exitDate) continue;
    const exitLabel = getLabel(getIsoDate(order.exitDate));
    const entryPrice = Number(order.entryPrice);
    const exitPrice = Number(order.exitPrice ?? entryPrice);
    const quantity = Number(order.quantity);
    const pl = (exitPrice - entryPrice) * quantity;
    if (!monthlyBucketMap.has(exitLabel)) monthlyBucketMap.set(exitLabel, { invested: 0, realizedPL: 0 });
    monthlyBucketMap.get(exitLabel)!.realizedPL += pl;
  }

  // 4. Sort chronologically and compute cumulative ROI line
  //    ROI includes both realized P/L and unrealized P/L (from open positions, attributed to current month)
  const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const sortedBuckets = Array.from(monthlyBucketMap.entries())
    .sort((a, b) => {
      const [aM, aY] = [a[0].slice(0, 3), a[0].slice(-2)];
      const [bM, bY] = [b[0].slice(0, 3), b[0].slice(-2)];
      if (aY !== bY) return Number(aY) - Number(bY);
      return monthOrder.indexOf(aM) - monthOrder.indexOf(bM);
    });

  // Compute total unrealized P/L from open positions using current market prices
  const totalUnrealizedPL = openRows.reduce((sum, order) => {
    const symbol = order.tickerSymbol.trim().toUpperCase();
    const entryPrice = Number(order.entryPrice);
    const currentPrice = latestPrices[symbol] ?? entryPrice;
    const quantity = Number(order.quantity);
    return sum + (currentPrice - entryPrice) * quantity;
  }, 0);

  let cumInvested = 0;
  let cumRealizedPL = 0;
  const monthlyData: MonthlyDataItem[] = sortedBuckets.map(([month, bucket], index) => {
    cumInvested += bucket.invested;
    cumRealizedPL += bucket.realizedPL;
    // For the last month (current), include unrealized P/L in the cumulative total
    const isLastMonth = index === sortedBuckets.length - 1;
    const totalPL = cumRealizedPL + (isLastMonth ? totalUnrealizedPL : 0);
    return {
      month,
      invested: bucket.invested,
      pl: bucket.realizedPL,
      roi: cumInvested > 0 ? (totalPL / cumInvested) * 100 : 0,
    };
  });

  let winningTrades = 0;
  let totalHoldDays = 0;
  let maxDrawdownPct = 0;

  let closedLosing = 0;

  const realized = closedRows.reduce((sum, order) => {
    const entryPrice = Number(order.entryPrice);
    const exitPrice = Number(order.exitPrice ?? entryPrice);
    const quantity = Number(order.quantity);
    
    if (exitPrice > entryPrice) {
      winningTrades++;
    } else if (exitPrice < entryPrice) {
      closedLosing++;
    }

    const tradePct = entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0;
    if (tradePct < maxDrawdownPct) maxDrawdownPct = tradePct;

    if (order.exitDate) {
      const t1 = new Date(order.entryDate).getTime();
      const t2 = new Date(order.exitDate).getTime();
      const days = (t2 - t1) / (1000 * 3600 * 24);
      totalHoldDays += Math.max(0, days);
    }

    return sum + (exitPrice - entryPrice) * quantity;
  }, 0);

  const closedCount = closedRows.length;
  const winRate = closedCount > 0 ? (winningTrades / closedCount) * 100 : 0;
  const avgBarsPerTrade = closedCount > 0 ? (totalHoldDays / closedCount) * (5/7) : 0;

  const totalCostBasis = openRows.reduce((sum, order) => sum + Number(order.entryPrice) * Number(order.quantity), 0);
  const unrealized = openOrders.reduce((sum, order) => sum + order.profitLoss, 0);
  const totalRoi = totalCostBasis > 0 ? ((unrealized + realized) / totalCostBasis) * 100 : 0;

  return {
    openOrders,
    openMarketValue: totalMarketValue,
    unrealized,
    realized,
    totalRoi,
    sectorData,
    monthlyData,
    winRate,
    avgBarsPerTrade,
    maxDrawdownPct,
    avgAdverseExcursion,
    openWinning: openOrders.filter(o => o.profitLoss > 0).length,
    openLosing: openOrders.filter(o => o.profitLoss < 0).length,
    closedWinning: winningTrades,
    closedLosing,
    closedCount,
  };
}



async function getAvgAdverseExcursion(userId: string): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT AVG(mae) AS avg_mae FROM (
        SELECT (MIN(dp.low) - p.entry_price) / NULLIF(p.entry_price, 0) * 100 AS mae
        FROM ${positions} p
        JOIN ${dailyPrices} dp
          ON dp.ticker_symbol = p.ticker_symbol
          AND dp.date >= p.entry_date
          AND dp.date <= p.exit_date
        WHERE p.user_id = ${userId} AND p.status = 'CLOSED'
        GROUP BY p.id, p.entry_price
      ) sub
    `);
    const row = result[0] as Record<string, unknown> | undefined;
    const avgMae = Number(row?.avg_mae ?? 0);
    return isNaN(avgMae) ? 0 : avgMae;
  } catch {
    return 0;
  }
}

async function getActiveAlertCount(userId: string) {
  const rows = await db.select({ id: tickerAlerts.id })
    .from(tickerAlerts)
    .where(
      sql`${tickerAlerts.enabled} = true AND ${tickerAlerts.userId} = ${userId}`
    );
  return rows.length;
}

async function getLatestPriceMap(): Promise<Record<string, number>> {
  const rows = await getCachedRecentPrices();
  const priceMap: Record<string, number> = {};
  for (const row of rows) {
    if (Number(row.rn) === 1) {
      priceMap[String(row.ticker_symbol)] = Number(row.close);
    }
  }
  return priceMap;
}

async function getTickerMap(): Promise<Record<string, { companyName: string; sector: string; logoUrl: string | null }>> {
  const rows = await getCachedTickers();
  const tickerMap: Record<string, { companyName: string; sector: string; logoUrl: string | null }> = {};
  for (const ticker of rows) {
    tickerMap[ticker.symbol] = {
      companyName: ticker.companyName ?? ticker.symbol,
      sector: ticker.sector ?? 'Unclassified',
      logoUrl: ticker.logoUrl,
    };
  }
  return tickerMap;
}

function formatMoney(value: number, showSign: boolean): string {
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatted} EGP`;
}

function formatPrice(value: number): string {
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

function formatSignal(signal: string): string {
  if (signal === 'BUY') return 'BUY';
  if (signal === 'SELL_TP') return 'TP';
  if (signal === 'SELL_TRAIL') return 'TRAIL';
  if (signal === 'SELL_SL') return 'STOP';
  return 'EXIT';
}
