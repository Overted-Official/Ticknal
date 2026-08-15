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
  const openRows = await db.select().from(positions).where(
    sql`${positions.status} = 'OPEN' AND ${positions.userId} = ${userId}`
  ).orderBy(desc(positions.createdAt));
  const closedRows = await db.select().from(positions).where(
    sql`${positions.status} = 'CLOSED' AND ${positions.userId} = ${userId}`
  ).orderBy(desc(positions.createdAt));
  const latestPrices = await getLatestPriceMap();
  const tickerMap = await getTickerMap();

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

  // --- Monthly Investment & P/L Snapshot (Cohort based) ---
  type MonthlyDataAgg = { invested: number; currentValue: number };
  const monthlyAggMap = new Map<string, MonthlyDataAgg>();

  const getLabel = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(month) - 1]} '${year.slice(2)}`;
  };

  const allOrders = [...openRows, ...closedRows];
  
  const getIsoDate = (d: any) => typeof d === 'string' ? d : new Date(d as unknown as string).toISOString().split('T')[0];
  
  if (allOrders.length > 0) {
    let minDateStr = getIsoDate(allOrders[0].entryDate);
    let maxDateStr = getIsoDate(allOrders[0].entryDate);
    
    for (const order of allOrders) {
      const dateStr = getIsoDate(order.entryDate);
      if (dateStr < minDateStr) minDateStr = dateStr;
      if (dateStr > maxDateStr) maxDateStr = dateStr;
    }
    
    let current = new Date(minDateStr);
    current.setDate(1);
    const end = new Date(maxDateStr);
    end.setDate(1);
    // Also include current month just in case we have no orders this month but want to show it
    const today = new Date();
    today.setDate(1);
    if (today > end) {
      end.setTime(today.getTime());
    }
    
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const label = getLabel(`${year}-${month}`);
      if (!monthlyAggMap.has(label)) {
        monthlyAggMap.set(label, { invested: 0, currentValue: 0 });
      }
      current.setMonth(current.getMonth() + 1);
    }
  }

  for (const order of allOrders) {
    const dateStr = getIsoDate(order.entryDate);
    const label = getLabel(dateStr);
    const cost = Number(order.entryPrice) * Number(order.quantity);
    
    // Determine the current value of this order cohort
    let value = 0;
    if (order.status === 'CLOSED') {
      value = Number(order.exitPrice ?? order.entryPrice) * Number(order.quantity);
    } else {
      const symbol = order.tickerSymbol.trim().toUpperCase();
      value = (latestPrices[symbol] ?? Number(order.entryPrice)) * Number(order.quantity);
    }
    
    if (!monthlyAggMap.has(label)) monthlyAggMap.set(label, { invested: 0, currentValue: 0 });
    monthlyAggMap.get(label)!.invested += cost;
    monthlyAggMap.get(label)!.currentValue += value;
  }

  const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData: MonthlyDataItem[] = Array.from(monthlyAggMap.entries())
    .sort((a, b) => {
      const [aM, aY] = [a[0].slice(0, 3), a[0].slice(-2)];
      const [bM, bY] = [b[0].slice(0, 3), b[0].slice(-2)];
      if (aY !== bY) return Number(aY) - Number(bY);
      return monthOrder.indexOf(aM) - monthOrder.indexOf(bM);
    })
    .map(([month, agg]) => {
      const pl = agg.currentValue - agg.invested;
      return {
        month,
        invested: agg.invested,
        pl,
        roi: agg.invested > 0 ? (pl / agg.invested) * 100 : 0
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
    // Net Worth = current market value of all open positions
    openMarketValue: totalMarketValue,
    unrealized,
    realized,
    totalRoi,
    sectorData,
    monthlyData,
    winRate,
    avgBarsPerTrade,
    maxDrawdownPct,
    openWinning: openOrders.filter(o => o.profitLoss > 0).length,
    openLosing: openOrders.filter(o => o.profitLoss < 0).length,
    closedWinning: winningTrades,
    closedLosing,
    closedCount,
  };
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
