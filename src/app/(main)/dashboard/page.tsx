import Link from 'next/link';
import { connection } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dailyPrices, orders, tickerAlerts, tickers } from '@/db/schema';
import { resolvePsiParamsFromStore } from '@/lib/psiParameterStore';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar, type PsiSignal } from '@/lib/psiStrategy';
import OpportunityTable from '@/components/platform/OpportunityTable';
import TestNotificationButton from '@/components/platform/TestNotificationButton';

type DashboardOrder = {
  id: number;
  tickerSymbol: string;
  companyName: string;
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
  signal: PsiSignal;
};

const DASHBOARD_HISTORY_BARS = 320;

export default async function DashboardPage() {
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
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-tv-base text-tv-text">
      <div className="border-b border-tv-border px-5 py-4">
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

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          <Metric label="Portfolio Value" value={formatMoney(orderStats.openMarketValue, false)} />
          <Metric label="Unrealized P/L" value={formatMoney(orderStats.unrealized, true)} valueClass={orderStats.unrealized >= 0 ? 'text-tv-up' : 'text-tv-down'} />
          <Metric label="Realized P/L" value={formatMoney(orderStats.realized, true)} valueClass={orderStats.realized >= 0 ? 'text-tv-up' : 'text-tv-down'} />
          <Metric label="Open Positions" value={String(orderStats.openOrders.length)} />
          <Metric label="Active Alerts" value={String(activeAlertCount)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1.25fr_0.75fr]">
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
                <div className="p-4 text-center text-tv-muted">No open positions</div>
              ) : (
                orderStats.openOrders.slice(0, 10).map((order) => (
                  <div key={order.id} className="bg-tv-base rounded-tv-lg border border-tv-border p-3 flex justify-between items-center">
                    <div>
                      <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-weight-medium text-tv-text hover:text-tv-accent text-sm">
                        {order.tickerSymbol}
                      </Link>
                      <div className="max-w-40 truncate text-[11px] text-tv-muted">{order.companyName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatPrice(order.currentPrice * order.quantity)}</div>
                      <div className={`flex items-center justify-end text-[11px] font-weight-medium ${order.profitLoss >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
                        {formatMoney(order.profitLoss, true)} ({order.profitLossPct >= 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-tv-surface text-[0.65rem] uppercase text-tv-muted">
                  <tr>
                    <th className="border-b border-tv-border px-3 py-2">Ticker</th>
                    <th className="border-b border-tv-border px-3 py-2 text-right">Position Value</th>
                    <th className="border-b border-tv-border px-3 py-2 text-right">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {orderStats.openOrders.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-tv-muted">No open positions</td>
                    </tr>
                  ) : (
                    orderStats.openOrders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="border-b border-tv-border last:border-b-0 hover:bg-tv-hover">
                        <td className="px-3 py-2">
                          <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-weight-medium text-tv-text hover:text-tv-accent">
                            {order.tickerSymbol}
                          </Link>
                          <div className="max-w-48 truncate text-[11px] text-tv-muted">{order.companyName}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-weight-medium">{formatPrice(order.currentPrice * order.quantity)}</td>
                        <td className={`px-3 py-2 text-right font-weight-medium ${order.profitLoss >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
                          {formatMoney(order.profitLoss, true)}
                          <div className="text-[11px] opacity-90">{order.profitLossPct >= 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%</div>
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

function Metric({ label, value, valueClass = 'text-tv-text' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-3">
      <div className="text-[11px] uppercase text-tv-muted">{label}</div>
      <div className={`mt-1 text-lg font-weight-medium ${valueClass}`}>{value}</div>
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

  const realized = closedRows.reduce((sum, order) => {
    const entryPrice = Number(order.entryPrice);
    const exitPrice = Number(order.exitPrice ?? entryPrice);
    const quantity = Number(order.quantity);
    return sum + (exitPrice - entryPrice) * quantity;
  }, 0);

  return {
    openOrders,
    openMarketValue: openOrders.reduce((sum, order) => sum + order.currentPrice * order.quantity, 0),
    unrealized: openOrders.reduce((sum, order) => sum + order.profitLoss, 0),
    realized,
  };
}

async function getRecentOpportunities(): Promise<Opportunity[]> {
  const [tickerRows, priceRows] = await Promise.all([
    db.select().from(tickers),
    db.execute(sql`
      WITH ranked_prices AS (
        SELECT ticker_symbol, date, open, high, low, close, volume,
               ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) AS rn
        FROM ${dailyPrices}
        WHERE volume > 0
      )
      SELECT ticker_symbol, date, open, high, low, close, volume
      FROM ranked_prices
      WHERE rn <= ${DASHBOARD_HISTORY_BARS}
      ORDER BY ticker_symbol, date
    `),
  ]);

  const tickerMap = new Map(
    tickerRows.map((ticker) => [
      normalizeTickerSymbol(ticker.symbol),
      {
        companyName: ticker.companyName ?? ticker.symbol,
        sector: ticker.sector ?? 'Unclassified',
      },
    ]),
  );
  const barsByTicker = new Map<string, PriceBar[]>();

  for (const row of priceRows) {
    const symbol = normalizeTickerSymbol(String(row.ticker_symbol));
    const bars = barsByTicker.get(symbol) ?? [];
    bars.push({
      date: typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date as Date).toISOString().split('T')[0],
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    });
    barsByTicker.set(symbol, bars);
  }

  const opportunities: Opportunity[] = [];
  for (const [symbol, bars] of barsByTicker.entries()) {
    if (bars.length < 220) continue;
    const recentDates = new Set(bars.slice(-5).map((bar) => bar.date));
    // The dashboard scans only recent mature histories; full-history strategy metrics stay on the chart.
    const strategyResult = runPsiStrategy(bars, resolvePsiParamsFromStore(symbol, { startDate: bars[0].date }));
    const signal = [...strategyResult.signals].reverse().find((candidate) => recentDates.has(candidate.date));
    if (!signal) continue;

    const ticker = tickerMap.get(symbol);
    opportunities.push({
      symbol,
      companyName: ticker?.companyName ?? symbol,
      sector: ticker?.sector ?? 'Unclassified',
      signal,
    });
  }

  return opportunities.sort((a, b) => Date.parse(b.signal.date) - Date.parse(a.signal.date));
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

async function getTickerMap(): Promise<Record<string, { companyName: string }>> {
  const rows = await db.select().from(tickers);
  const tickerMap: Record<string, { companyName: string }> = {};
  for (const ticker of rows) {
    tickerMap[ticker.symbol] = { companyName: ticker.companyName ?? ticker.symbol };
  }
  return tickerMap;
}

function formatMoney(value: number, showSign: boolean): string {
  return `${showSign && value >= 0 ? '+' : ''}${value.toFixed(2)} EGP`;
}

function formatPrice(value: number): string {
  return `${Number(value).toFixed(2)} EGP`;
}

function formatSignal(signal: string): string {
  if (signal === 'BUY') return 'BUY';
  if (signal === 'SELL_TP') return 'TP';
  if (signal === 'SELL_TRAIL') return 'TRAIL';
  if (signal === 'SELL_SL') return 'STOP';
  return 'EXIT';
}
