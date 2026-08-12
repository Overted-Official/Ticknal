import Link from 'next/link';
import { connection } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dailyPrices, orders, tickerAlerts, tickers } from '@/db/schema';
import { resolvePsiParamsFromStore } from '@/lib/psiParameterStore';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar, type PsiSignal } from '@/lib/psiStrategy';
import { getRecentOpportunities } from '@/lib/opportunities';
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

  const [orderStats, opportunities, activeAlertCount] = await Promise.all([
    getOrderStats(),
    getRecentOpportunities(),
    getActiveAlertCount(),
  ]);
  const openPositionTickers = new Set(orderStats.openOrders.map(o => o.tickerSymbol));
  const buyOpportunities = opportunities.filter((item) => item.signal.signal === 'BUY').slice(0, 12);
  const exitSignals = opportunities.filter((item) => item.signal.signal !== 'BUY' && openPositionTickers.has(item.symbol)).slice(0, 8);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-tv-base text-tv-text pb-6">
      <div className="px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-weight-medium">Dashboard</h1>
            <p className="mt-1 text-xs text-tv-muted">Portfolio performance and fresh PSI opportunities</p>
          </div>
          <div className="flex items-center gap-3">
            <TestNotificationButton />
            <Link
              href="/charts"
              className="rounded-tv-sm border border-tv-border px-3 py-2 text-xs text-tv-muted transition-colors hover:border-tv-border-highlight hover:text-tv-text"
            >
              Open Charts
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <Metric
              label="Net Worth"
              value={formatMoney(orderStats.openMarketValue, false)}
              subtitle={`Total ROI ${orderStats.totalRoi >= 0 ? '+' : ''}${orderStats.totalRoi.toFixed(2)}%`}
              subtitleClass={orderStats.totalRoi >= 0 ? 'text-tv-up' : 'text-tv-down'}
            />
          </div>
          <Metric label="Unrealized P/L" value={formatMoney(orderStats.unrealized, true)} valueClass={orderStats.unrealized >= 0 ? 'text-tv-up' : 'text-tv-down'} />
          <Metric label="Realized P/L" value={formatMoney(orderStats.realized, true)} valueClass={orderStats.realized >= 0 ? 'text-tv-up' : 'text-tv-down'} />
          <Metric label="Open Positions" value={String(orderStats.openOrders.length)} />
          <Metric label="Active Alerts" value={String(activeAlertCount)} />
        </div>

        {/* Extended Portfolio Stats */}
        <div className="mt-4 rounded-tv-lg border border-tv-border bg-tv-surface p-4 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-tv-border gap-4 md:gap-0">
          <div className="flex-1 md:px-4 first:px-0 flex flex-col justify-center">
            <div className="text-[11px] uppercase text-tv-muted mb-1">Win Rate</div>
            <div className="text-lg font-weight-medium text-tv-text">{orderStats.winRate.toFixed(1)}%</div>
          </div>
          <div className="flex-1 md:px-4 flex flex-col justify-center">
            <div className="text-[11px] uppercase text-tv-muted mb-1">Avg. Bars / Trade</div>
            <div className="text-lg font-weight-medium text-tv-text">{Math.round(orderStats.avgBarsPerTrade)}</div>
          </div>
          <div className="flex-1 md:px-4 flex flex-col justify-center">
            <div className="text-[11px] uppercase text-tv-muted mb-1">Avg. Adverse Excursion</div>
            <div className="text-lg font-weight-medium text-tv-muted">N/A</div>
          </div>
          <div className="flex-1 md:px-4 last:pr-0 flex flex-col justify-center">
            <div className="text-[11px] uppercase text-tv-muted mb-1">Max Trade Loss</div>
            <div className={`text-lg font-weight-medium ${orderStats.maxDrawdownPct < 0 ? 'text-tv-down' : 'text-tv-text'}`}>
              {orderStats.maxDrawdownPct < 0 ? '' : '+'}{orderStats.maxDrawdownPct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="border-b border-tv-border pb-5">
        <DashboardCharts sectorData={orderStats.sectorData} monthlyData={orderStats.monthlyData} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 px-4 md:px-6 xl:grid-cols-2">
        {/* Open Positions */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-weight-medium">Open Positions</h2>
            <Link href="/orders" className="text-[11px] text-tv-muted hover:text-tv-text">Orders</Link>
          </div>
          <div className="overflow-hidden rounded-tv-lg border border-tv-border">
            {/* Mobile View (Cards) */}
            <div className="md:hidden flex flex-col space-y-2 p-2">
              {orderStats.openOrders.length === 0 ? (
                <div className="p-4 text-center text-tv-muted text-[12px] font-normal">No open positions</div>
              ) : (
                orderStats.openOrders.slice(0, 10).map((order) => (
                  <div key={order.id} className="bg-tv-base rounded-tv-lg border border-tv-border p-3 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-tv-surface flex items-center justify-center overflow-hidden shrink-0 border border-tv-border">
                        {order.logoUrl ? (
                          <img src={order.logoUrl} alt={order.tickerSymbol} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[12px] font-medium text-tv-muted">
                            {order.tickerSymbol.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-medium text-[12px] text-tv-text hover:text-tv-accent">
                          {order.tickerSymbol}
                        </Link>
                        <div className="max-w-40 truncate text-[12px] font-light text-tv-muted">{order.companyName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-medium">{formatPrice(order.currentPrice * order.quantity)}</div>
                      <div className={`flex items-center justify-end text-[12px] font-medium ${order.profitLoss >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
                        {formatMoney(order.profitLoss, true)} ({order.profitLossPct >= 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="bg-tv-surface text-[12px] font-normal uppercase text-tv-muted">
                  <tr>
                    <th className="border-b border-tv-border px-3 py-2 font-normal">Ticker</th>
                    <th className="border-b border-tv-border px-3 py-2 text-right font-normal">Position Value</th>
                    <th className="border-b border-tv-border px-3 py-2 text-right font-normal">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {orderStats.openOrders.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-tv-muted text-[12px] font-normal">No open positions</td>
                    </tr>
                  ) : (
                    orderStats.openOrders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="border-b border-tv-border last:border-b-0 hover:bg-tv-hover">
                        <td className="px-3 py-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-tv-surface flex items-center justify-center overflow-hidden shrink-0 border border-tv-border">
                              {order.logoUrl ? (
                                <img src={order.logoUrl} alt={order.tickerSymbol} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[12px] font-medium text-tv-muted">
                                  {order.tickerSymbol.substring(0, 2)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-medium text-[12px] text-tv-text hover:text-tv-accent">
                                {order.tickerSymbol}
                              </Link>
                              <div className="max-w-48 truncate text-[12px] font-light text-tv-muted">{order.companyName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{formatPrice(order.currentPrice * order.quantity)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${order.profitLoss >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
                          {formatMoney(order.profitLoss, true)}
                          <div className="text-[12px] font-light opacity-90">{order.profitLossPct >= 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          {/* Buy Opportunities */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-weight-medium">Buy Opportunities</h2>
            <span className="text-[11px] text-tv-muted">Last 5 bars</span>
          </div>
          <div className="overflow-hidden rounded-tv-lg border border-tv-border">
            <OpportunityTable opportunities={buyOpportunities} emptyText="No buy opportunities in the last 5 bars" />
          </div>

          {/* Exit Signals */}
          <div className="mt-4 mb-2 flex items-center justify-between">
            <h2 className="text-sm font-weight-medium">Exit Signals</h2>
            <span className="text-[11px] text-tv-muted">Last 5 bars</span>
          </div>
          <div className="overflow-hidden rounded-tv-lg border border-tv-border">
            <OpportunityTable opportunities={exitSignals} emptyText="No exit signals in the last 5 bars" compact />
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, valueClass = 'text-tv-text', subtitle, subtitleClass = 'text-tv-muted' }: { label: string; value: string; valueClass?: string; subtitle?: string; subtitleClass?: string }) {
  return (
    <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-3">
      <div className="text-[11px] uppercase text-tv-muted">{label}</div>
      <div className={`mt-1 text-lg font-weight-medium ${valueClass}`}>{value}</div>
      {subtitle && <div className={`text-[11px] mt-0.5 font-weight-medium ${subtitleClass}`}>{subtitle}</div>}
    </div>
  );
}

async function getOrderStats() {
  const openRows = await db.select().from(orders).where(eq(orders.status, 'OPEN')).orderBy(desc(orders.createdAt));
  const closedRows = await db.select().from(orders).where(eq(orders.status, 'CLOSED')).orderBy(desc(orders.createdAt));
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

  // --- Monthly Investment (cost basis per month, from all OPEN orders raw rows) ---
  const monthlyMap = new Map<string, number>();
  for (const order of openRows) {
    const date = typeof order.entryDate === 'string' ? order.entryDate : new Date(order.entryDate as unknown as string).toISOString().split('T')[0];
    const [year, month] = date.split('-');
    const label = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(month) - 1]} '${year.slice(2)}`;
    const cost = Number(order.entryPrice) * Number(order.quantity);
    monthlyMap.set(label, (monthlyMap.get(label) ?? 0) + cost);
  }
  // Sort chronologically
  const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData: MonthlyDataItem[] = Array.from(monthlyMap.entries())
    .sort((a, b) => {
      const [aM, aY] = [a[0].slice(0, 3), a[0].slice(-2)];
      const [bM, bY] = [b[0].slice(0, 3), b[0].slice(-2)];
      if (aY !== bY) return Number(aY) - Number(bY);
      return monthOrder.indexOf(aM) - monthOrder.indexOf(bM);
    })
    .map(([month, invested]) => ({ month, invested, orders: 1 }));

  let winningTrades = 0;
  let totalHoldDays = 0;
  let maxDrawdownPct = 0;

  const realized = closedRows.reduce((sum, order) => {
    const entryPrice = Number(order.entryPrice);
    const exitPrice = Number(order.exitPrice ?? entryPrice);
    const quantity = Number(order.quantity);
    
    if (exitPrice > entryPrice) {
      winningTrades++;
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
  };
}



async function getActiveAlertCount(): Promise<number> {
  const rows = await db.select({ id: tickerAlerts.id }).from(tickerAlerts).where(eq(tickerAlerts.enabled, true));
  return rows.length;
}

async function getLatestPriceMap(): Promise<Record<string, number>> {
  const rows = await db.execute(sql`
    WITH ranked_prices AS (
      SELECT ticker_symbol, close, ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) AS rn
      FROM ${dailyPrices}
    )
    SELECT ticker_symbol, close
    FROM ranked_prices
    WHERE rn = 1
  `);

  const priceMap: Record<string, number> = {};
  for (const row of rows) {
    priceMap[String(row.ticker_symbol)] = Number(row.close);
  }
  return priceMap;
}

async function getTickerMap(): Promise<Record<string, { companyName: string; sector: string; logoUrl: string | null }>> {
  const rows = await db.select().from(tickers);
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
