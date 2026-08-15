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
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-[#0f0f0f] text-white pb-8">
      <div className="px-4 pt-5 pb-0 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="mt-0.5 text-xs text-white/50">Portfolio performance and fresh PSI trading signals</p>
          </div>
          <div className="flex items-center gap-2.5">
            <TestNotificationButton />
            <Link
              href="/charts"
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white/80 transition-all hover:bg-white/[0.08] hover:text-white shadow-sm"
            >
              Open Charts
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-1">
            <Metric
              label="Net Worth"
              value={formatMoney(orderStats.openMarketValue, false)}
              subtitle={`ROI ${orderStats.totalRoi >= 0 ? '+' : ''}${orderStats.totalRoi.toFixed(2)}%`}
              subtitleClass={orderStats.totalRoi >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}
            />
          </div>
          <Metric 
            label="Unrealized P/L" 
            value={formatMoney(orderStats.unrealized, true)} 
            valueClass={orderStats.unrealized >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'} 
          />
          <Metric 
            label="Realized P/L" 
            value={formatMoney(orderStats.realized, true)} 
            valueClass={orderStats.realized >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'} 
          />
          <Metric 
            label="Open Positions" 
            value={String(orderStats.openOrders.length)} 
            subtitle={`${orderStats.openWinning} Win · ${orderStats.openLosing} Loss`}
            subtitleClass="text-white/40"
          />
          <Metric 
            label="Closed Positions" 
            value={String(orderStats.closedCount)} 
            subtitle={`${orderStats.closedWinning} Win · ${orderStats.closedLosing} Loss`}
            subtitleClass="text-white/40"
          />
          <Metric label="Active Alerts" value={String(activeAlertCount)} />
        </div>

        {/* Extended Portfolio Stats */}
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl p-4 md:p-5 shadow-xl flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/[0.06] gap-4 md:gap-0">
          <div className="flex-1 md:px-5 first:pl-0 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1">Win Rate</div>
            <div className="text-xl font-bold font-mono text-white">{orderStats.winRate.toFixed(1)}%</div>
          </div>
          <div className="flex-1 md:px-5 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1">Avg. Bars / Trade</div>
            <div className="text-xl font-bold font-mono text-white">{Math.round(orderStats.avgBarsPerTrade)}</div>
          </div>
          <div className="flex-1 md:px-5 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1">Avg. Adverse Excursion</div>
            <div className="text-xl font-bold font-mono text-white/30">N/A</div>
          </div>
          <div className="flex-1 md:px-5 last:pr-0 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1">Max Trade Loss</div>
            <div className={`text-xl font-bold font-mono ${orderStats.maxDrawdownPct < 0 ? 'text-[#ff4d58]' : 'text-white'}`}>
              {orderStats.maxDrawdownPct < 0 ? '' : '+'}{orderStats.maxDrawdownPct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Left (Open Positions) / Right (Signals) */}
      <div className="mt-5 grid grid-cols-1 gap-5 px-4 md:px-6 xl:grid-cols-2">
        {/* Open Positions Card */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col">
          <div className="border-b border-white/[0.06] px-5 py-3.5 bg-white/[0.01] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-plt-orange shadow-[0_0_8px_rgba(255,100,13,0.4)]" />
                Active Positions
              </h2>
              <p className="text-[11px] text-white/40 mt-0.5">Summary of currently open portfolio holdings</p>
            </div>
            <Link 
              href="/positions" 
              className="text-[11px] font-semibold text-white/60 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all"
            >
              All Orders →
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {/* Desktop View */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase font-semibold text-white/40 tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Symbol</th>
                    <th className="px-4 py-2.5 text-right">Entry</th>
                    <th className="px-4 py-2.5 text-right">Current</th>
                    <th className="px-4 py-2.5 text-right">Position Value</th>
                    <th className="px-4 py-2.5 text-right">P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {orderStats.openOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-white/40 text-xs">No active open positions</td>
                    </tr>
                  ) : (
                    orderStats.openOrders.slice(0, 8).map((order) => (
                      <tr key={order.id} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden shrink-0 border border-white/[0.08]">
                              {order.logoUrl ? (
                                <img src={order.logoUrl} alt={order.tickerSymbol} className="w-full h-full object-contain bg-transparent" />
                              ) : (
                                <span className="text-[9px] font-bold text-white">
                                  {order.tickerSymbol.substring(0, 2)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-semibold text-xs text-white group-hover:text-plt-orange transition-colors">
                                {order.tickerSymbol}
                              </Link>
                              <span className="text-[10px] text-white/40 truncate max-w-[120px]">{order.companyName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          <div className="text-white text-xs">{formatPrice(order.entryPrice)}</div>
                          <div className="text-[10px] text-white/40">{order.entryDate}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          <div className="text-white text-xs">{formatPrice(order.currentPrice)}</div>
                          <div className="text-[10px] text-white/40">{order.quantity} shares</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-white text-xs">
                          {formatPrice(order.currentPrice * order.quantity)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${order.profitLoss >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
                          <div className="font-semibold">{formatMoney(order.profitLoss, true)}</div>
                          <div className="text-[10px] opacity-80">{order.profitLossPct >= 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col space-y-2 p-3">
              {orderStats.openOrders.length === 0 ? (
                <div className="p-6 text-center text-white/40 text-xs">No active open positions</div>
              ) : (
                orderStats.openOrders.slice(0, 6).map((order) => (
                  <div key={order.id} className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-3 flex justify-between items-center">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden shrink-0 border border-white/[0.08]">
                        {order.logoUrl ? (
                          <img src={order.logoUrl} alt={order.tickerSymbol} className="w-full h-full object-contain bg-transparent" />
                        ) : (
                          <span className="text-[9px] font-bold text-white">
                            {order.tickerSymbol.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-semibold text-xs text-white hover:text-plt-orange">
                          {order.tickerSymbol}
                        </Link>
                        <span className="text-[10px] text-white/40 truncate max-w-[120px]">{order.companyName}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs text-white">{formatPrice(order.currentPrice * order.quantity)}</div>
                      <div className={`text-[11px] font-semibold ${order.profitLoss >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
                        {formatMoney(order.profitLoss, true)} ({order.profitLossPct >= 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Opportunities Card */}
        <section className="space-y-4">
          {/* Buy Opportunities */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl shadow-xl overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5 bg-white/[0.01] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00e676] shadow-[0_0_8px_#00e676]" />
                  Buy Opportunities
                </h2>
                <p className="text-[11px] text-white/40 mt-0.5">Top buy signals triggered across the market</p>
              </div>
            </div>
            <div className="p-0">
              <OpportunityTable opportunities={buyOpportunities} emptyText="No buy opportunities in the last 5 bars" compact />
            </div>
          </div>

          {/* Exit Signals */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl shadow-xl overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5 bg-white/[0.01] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ff4d58] shadow-[0_0_8px_#ff4d58]" />
                  Exit & Stop Alerts
                </h2>
                <p className="text-[11px] text-white/40 mt-0.5">Exit notifications for your current positions</p>
              </div>
            </div>
            <div className="p-0">
              <OpportunityTable opportunities={exitSignals} emptyText="No exit signals in the last 5 bars" compact />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, valueClass = 'text-plt-text', subtitle, subtitleClass = 'text-plt-muted' }: { label: string; value: string; valueClass?: string; subtitle?: string; subtitleClass?: string }) {
  return (
    <div className="rounded-tv-lg border border-plt-border bg-plt-surface p-3">
      <div className="text-[11px] uppercase text-plt-muted">{label}</div>
      <div className={`mt-1 text-lg font-weight-medium ${valueClass}`}>{value}</div>
      {subtitle && <div className={`text-[11px] mt-0.5 font-weight-medium ${subtitleClass}`}>{subtitle}</div>}
    </div>
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
