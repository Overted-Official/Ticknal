import Link from 'next/link';
import { connection } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { banks, dailyPrices, macroInflationRates, positions, tickerAlerts, tickers, userBankAccounts, bankTransactions } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar, type PsiSignal } from '@/strategies/PSI/psiStrategy';
import { getCachedOpportunitiesSync, getExitSignalsForHoldings } from '@/lib/opportunities';
import { getCachedTickers, getCachedRecentPrices } from '@/lib/data-cache';
import OpportunityTable, { type Opportunity } from '@/components/platform/OpportunityTable';
import TestNotificationButton from '@/components/platform/TestNotificationButton';
import DashboardCharts from '@/components/platform/DashboardCharts';
import DashboardInvestmentsView from '@/components/platform/DashboardInvestmentsView';
import DashboardBankAccountsView from '@/components/platform/DashboardBankAccountsView';
import DashboardNetWorthView from '@/components/platform/DashboardNetWorthView';
import { type SectorDataItem } from '@/components/platform/SectorDonutChart';
import { type MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';
import { type BankAccount, type BankTransaction, type PositionItem } from '@/types/bank';
import { getLatestInflationRate, getLatestUsCpiRate, getHistoricalInflationSeries } from '@/lib/cbe-inflation';
import { getCachedIndustryRotationMap } from '@/lib/industry-rotation';
import { type IndustryGroupStake } from '@/components/platform/dashboard/investments/PortfolioConsultantCard';
import { buildCashTrend, monthEnd, recentMonthKeys } from '@/lib/portfolio-finance';
import type { NetWorthHistoryPoint } from '@/lib/portfolio-finance';

type DashboardOrder = {
  id: number;
  tickerSymbol: string;
  companyName: string;
  sector: string;
  industryGroup?: string;
  logoUrl?: string | null;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPct: number;
};

const emptyOrderStats = {
  openOrders: [] as DashboardOrder[],
  openMarketValue: 0,
  openCostBasis: 0,
  unrealized: 0,
  realized: 0,
  totalRoi: 0,
  sectorData: [] as SectorDataItem[],
  industryGroupData: [] as IndustryGroupStake[],
  rotationMap: {} as Record<string, string>,
  monthlyData: [] as MonthlyDataItem[],
  winRate: null,
  avgBarsPerTrade: null,
  maxDrawdownPct: null,
  avgAdverseExcursion: null,
  openWinning: 0,
  openLosing: 0,
  closedWinning: 0,
  closedLosing: 0,
  closedCount: 0,
};

const DASHBOARD_HISTORY_BARS = 320;

export default async function DashboardContent({ tab = 'net-worth' }: { tab?: string }) {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-auto bg-plt-base p-8 text-center text-plt-text">
        <h2 className="text-2xl font-bold mb-4">Welcome to Ticknal</h2>
        <p className="mb-6 text-plt-muted">Please sign in to view your personalized dashboard and portfolio.</p>
        <Link href="/" className="rounded-xl bg-plt-accent px-6 py-2 text-plt-base transition hover:opacity-90">
          Sign In
        </Link>
      </div>
    );
  }

  // Live USD/EGP rate
  const usdRate = await getUsdRate();

  // Tab 2: Bank Accounts View
  if (tab === 'banks') {
    let accounts: BankAccount[] = [];
    let transactions: BankTransaction[] = [];

    try {
      const [accRes, txRes] = await Promise.allSettled([
        getUserBankAccounts(user.id),
        getUserBankTransactions(user.id),
      ]);

      if (accRes.status === 'fulfilled') accounts = accRes.value;
      if (txRes.status === 'fulfilled') transactions = txRes.value;
    } catch (err) {
      console.error('Error fetching bank accounts / transactions:', err);
    }

    return (
      <DashboardBankAccountsView
        initialAccounts={accounts}
        initialTransactions={transactions}
        usdRate={usdRate}
      />
    );
  }

  // Tab 3: Net Worth & Inflation View
  if (tab === 'net-worth') {
    let accounts: BankAccount[] = [];
    let transactions: BankTransaction[] = [];
    let openPositions: PositionItem[] = [];
    let netWorthHistory: NetWorthHistoryPoint[] = [];
    let cbeInflation = 14.9;
    let usCpiInflation = 2.8;
    let inflationSeries: Array<{ yearMonth: string; cbeHeadlineInflation: string; usCpiInflation?: string }> = [];

    try {
      const [accRes, posRes, txRes, infRes, usCpiRes, seriesRes] = await Promise.allSettled([
        getUserBankAccounts(user.id),
        getOpenPositionsForNetWorth(user.id),
        getUserBankTransactions(user.id),
        getLatestInflationRate(),
        getLatestUsCpiRate(),
        getHistoricalInflationSeries(),
      ]);

      if (accRes.status === 'fulfilled') accounts = accRes.value;
      if (posRes.status === 'fulfilled') openPositions = posRes.value;
      if (txRes.status === 'fulfilled') transactions = txRes.value;
      if (infRes.status === 'fulfilled') cbeInflation = infRes.value;
      if (usCpiRes.status === 'fulfilled') usCpiInflation = usCpiRes.value;
      if (seriesRes.status === 'fulfilled') {
        inflationSeries = seriesRes.value.map((r) => ({
          yearMonth: r.yearMonth,
          cbeHeadlineInflation: String(r.cbeHeadlineInflation),
          usCpiInflation: r.usCpiInflation ? String(r.usCpiInflation) : undefined,
        }));
      }
    } catch (err) {
      console.error('Error fetching net worth data:', err);
    }

    netWorthHistory = await getNetWorthHistory(user.id, accounts, transactions, usdRate);

    return (
      <DashboardNetWorthView
        initialAccounts={accounts}
        openPositions={openPositions}
        netWorthHistory={netWorthHistory}
        usdRate={usdRate}
        cbeAnnualInflation={cbeInflation}
        usCpiAnnualInflation={usCpiInflation}
        initialInflationSeries={inflationSeries}
      />
    );
  }

  // Tab 1: Investments View (Default)
  let orderStats: Awaited<ReturnType<typeof getOrderStats>> = emptyOrderStats;
  let activeAlertCount = 0;

  try {
    const [statsResult, alertResult] = await Promise.allSettled([
      getOrderStats(user.id),
      getActiveAlertCount(user.id),
    ]);

    if (statsResult.status === 'fulfilled') {
      orderStats = statsResult.value;
    } else {
      console.error('Error fetching orderStats:', statsResult.reason);
    }

    if (alertResult.status === 'fulfilled') {
      activeAlertCount = alertResult.value;
    } else {
      console.error('Error fetching activeAlertCount:', alertResult.reason);
    }
  } catch (err) {
    console.error('Unexpected error in DashboardContent:', err);
  }

  // Fast targeted exit signals computation ONLY for user's open holdings (~30ms)
  const openSymbols = orderStats.openOrders.map((o) => o.tickerSymbol);
  let exitSignals: Opportunity[] = [];
  try {
    exitSignals = (await getExitSignalsForHoldings(openSymbols, 5)) as Opportunity[];
  } catch (err) {
    console.error('Error fetching exit signals for holdings:', err);
  }

  // Fast synchronous check if full market opportunities are already warmed in memory
  const cachedOpps = getCachedOpportunitiesSync(5, 'all');
  const initialBuyOpportunities = cachedOpps
    ? (cachedOpps.filter((item) => item.signal.signal === 'BUY').slice(0, 12) as Opportunity[])
    : [];

  return (
    <DashboardInvestmentsView
      orderStats={orderStats}
      buyOpportunities={initialBuyOpportunities}
      exitSignals={exitSignals}
      activeAlertCount={activeAlertCount}
    />
  );
}

async function getOrderStats(userId: string) {
  try {
    const [openRows, closedRows, latestPrices, tickerMap, rotationMeta] = await Promise.all([
      db.select().from(positions).where(
        and(eq(positions.status, 'OPEN'), eq(positions.userId, userId))
      ).orderBy(desc(positions.createdAt)),
      db.select().from(positions).where(
        and(eq(positions.status, 'CLOSED'), eq(positions.userId, userId))
      ).orderBy(desc(positions.createdAt)),
      getLatestPriceMap().catch(() => ({} as Record<string, number>)),
      getTickerMap().catch(() => ({} as Record<string, { companyName: string; sector: string; industryGroup: string; logoUrl: string | null }>)),
      getCachedIndustryRotationMap().catch(() => ({ tickerMap: new Map(), industryMap: new Map() })),
    ]);

  const positionPerformance = await getPortfolioPerformanceMetrics(openRows, closedRows);

  const openOrdersMap = new Map<string, DashboardOrder>();
  for (const order of openRows) {
    const symbol = order.tickerSymbol.trim().toUpperCase();
    const cleanSym = symbol.replace('.CA', '');
    const entryPrice = Number(order.entryPrice);
    const quantity = Number(order.quantity);
    const currentPrice = latestPrices[symbol] ?? entryPrice;
    const direction = String(order.side).toUpperCase() === 'SHORT' ? -1 : 1;
    const profitLoss = (currentPrice - entryPrice) * quantity * direction;
    const industryGroup = tickerMap[symbol]?.industryGroup || rotationMeta.tickerMap.get(cleanSym)?.industryGroup || tickerMap[symbol]?.sector || 'Unclassified';

    if (openOrdersMap.has(symbol)) {
      const existing = openOrdersMap.get(symbol)!;
      const totalCost = (existing.entryPrice * existing.quantity) + (entryPrice * quantity);
      const newQuantity = existing.quantity + quantity;
      const avgEntryPrice = totalCost / newQuantity;

      existing.quantity = newQuantity;
      existing.entryPrice = avgEntryPrice;
      existing.profitLoss += profitLoss;
      existing.profitLossPct = totalCost > 0 ? (existing.profitLoss / totalCost) * 100 : 0;
    } else {
      openOrdersMap.set(symbol, {
        id: order.id,
        tickerSymbol: symbol,
        companyName: tickerMap[symbol]?.companyName ?? symbol,
        sector: tickerMap[symbol]?.sector ?? 'Unclassified',
        industryGroup,
        logoUrl: tickerMap[symbol]?.logoUrl ?? null,
        entryDate: order.entryDate,
        entryPrice,
        quantity,
        currentPrice,
        profitLoss,
        profitLossPct: entryPrice > 0 ? (profitLoss / (entryPrice * quantity)) * 100 : 0,
      });
    }
  }
  const openOrders = Array.from(openOrdersMap.values());
  const totalMarketValue = openOrders.reduce((sum, o) => sum + o.currentPrice * o.quantity, 0);
  const openCostBasis = openRows.reduce((sum, order) => sum + Number(order.entryPrice) * Number(order.quantity), 0);

  // --- 25 GICS Industry Group Capital Allocation & Stakes ---
  const industryGroupMap = new Map<string, { value: number; count: number; tickers: Set<string> }>();
  for (const order of openOrders) {
    const ig = order.industryGroup || order.sector || 'Unclassified';
    const val = order.currentPrice * order.quantity;
    if (!industryGroupMap.has(ig)) {
      industryGroupMap.set(ig, { value: 0, count: 0, tickers: new Set() });
    }
    const item = industryGroupMap.get(ig)!;
    item.value += val;
    item.count += 1;
    item.tickers.add(order.tickerSymbol.replace('.CA', ''));
  }

  const industryGroupData: IndustryGroupStake[] = Array.from(industryGroupMap.entries())
    .map(([industryGroup, info]) => {
      const regime = rotationMeta.industryMap.get(industryGroup) || 'Improving';
      return {
        industryGroup,
        value: info.value,
        percentage: totalMarketValue > 0 ? (info.value / totalMarketValue) * 100 : 0,
        positionsCount: info.count,
        tickers: Array.from(info.tickers),
        rotationRegime: regime as any,
      };
    })
    .sort((a, b) => b.value - a.value);

  // SectorData mapped from 25 GICS Industry Groups
  const sectorData: SectorDataItem[] = industryGroupData.map((ig) => ({
    sector: ig.industryGroup,
    value: ig.value,
    percentage: ig.percentage,
  }));

  const rotationMapRecord: Record<string, string> = {};
  for (const [ig, reg] of rotationMeta.industryMap.entries()) {
    rotationMapRecord[ig] = reg;
  }

  // --- Monthly Investment Performance ---
  // Activity and mark-to-market values are kept separate. The old chart added
  // today's unrealized P/L to the entry month, which made historical bars and
  // cumulative ROI change whenever the current price changed.
  type MonthlyBucket = {
    invested: number;
    realizedPL: number;
    marketValue: number;
    unrealizedPL: number;
    closedWins: number;
    closedCount: number;
  };

  const allOrders = [...openRows, ...closedRows];
  const getIsoDate = (d: any) => typeof d === 'string' ? d : new Date(d as unknown as string).toISOString().split('T')[0];
  const getMonthKey = (dateStr: string) => dateStr.slice(0, 7);
  const getLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(month) - 1]} '${year.slice(2)}`;
  };
  const getMonthEnd = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  };

  const monthlyBucketMap = new Map<string, MonthlyBucket>();
  let minEntryDate = '';
  for (const order of allOrders) {
    const entryDate = getIsoDate(order.entryDate);
    if (!minEntryDate || entryDate < minEntryDate) minEntryDate = entryDate;
  }

  if (minEntryDate) {
    const cursor = new Date(`${getMonthKey(minEntryDate)}-01T00:00:00Z`);
    const today = new Date();
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    while (cursor <= end) {
      const monthKey = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
      monthlyBucketMap.set(monthKey, {
        invested: 0,
        realizedPL: 0,
        marketValue: 0,
        unrealizedPL: 0,
        closedWins: 0,
        closedCount: 0,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  const symbols = Array.from(new Set(allOrders.map((order) => order.tickerSymbol.trim().toUpperCase())));
  const monthlyCloseMap = await getMonthlyCloseMap(symbols, minEntryDate || new Date().toISOString().slice(0, 10));
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  for (const order of allOrders) {
    const entryMonth = getMonthKey(getIsoDate(order.entryDate));
    const bucket = monthlyBucketMap.get(entryMonth);
    if (bucket) bucket.invested += Number(order.entryPrice) * Number(order.quantity);
  }

  for (const order of closedRows) {
    if (!order.exitDate) continue;
    const exitMonth = getMonthKey(getIsoDate(order.exitDate));
    const bucket = monthlyBucketMap.get(exitMonth);
    if (!bucket) continue;
    const entryPrice = Number(order.entryPrice);
    const exitPrice = Number(order.exitPrice ?? entryPrice);
    const quantity = Number(order.quantity);
      bucket.realizedPL += positionPnl(order);
      bucket.closedCount += 1;
      if (positionPnl(order) > 0) bucket.closedWins += 1;
  }

  for (const [monthKey, bucket] of monthlyBucketMap.entries()) {
    const asOfDate = getMonthEnd(monthKey);
    for (const order of allOrders) {
      const entryDate = getIsoDate(order.entryDate);
      const exitDate = order.exitDate ? getIsoDate(order.exitDate) : null;
      const isActiveAtMonthEnd = entryDate <= asOfDate && (!exitDate || exitDate > asOfDate);
      if (!isActiveAtMonthEnd) continue;

      const symbol = order.tickerSymbol.trim().toUpperCase();
      const entryPrice = Number(order.entryPrice);
      const quantity = Number(order.quantity);
      const price = monthKey === currentMonthKey
        ? (latestPrices[symbol] ?? entryPrice)
        : (monthlyCloseMap.get(`${symbol}|${monthKey}`) ?? entryPrice);
      bucket.marketValue += price * quantity;
      const direction = String(order.side).toUpperCase() === 'SHORT' ? -1 : 1;
      bucket.unrealizedPL += (price - entryPrice) * quantity * direction;
    }
  }

  let cumInvested = 0;
  let cumRealizedPL = 0;
  let cumClosedWins = 0;
  let cumClosedCount = 0;
  const monthlyData: MonthlyDataItem[] = Array.from(monthlyBucketMap.entries()).map(([monthKey, bucket]) => {
    cumInvested += bucket.invested;
    cumRealizedPL += bucket.realizedPL;
    cumClosedWins += bucket.closedWins;
    cumClosedCount += bucket.closedCount;
    const totalPL = cumRealizedPL + bucket.unrealizedPL;
    return {
      month: getLabel(monthKey),
      invested: bucket.invested,
      pl: bucket.realizedPL,
      unrealizedPl: bucket.unrealizedPL,
      marketValue: bucket.marketValue,
      cumulativeRealizedPl: cumRealizedPL,
      winRate: cumClosedCount > 0 ? (cumClosedWins / cumClosedCount) * 100 : null,
      roi: cumInvested > 0 ? (totalPL / cumInvested) * 100 : 0,
    };
  });

  let winningTrades = 0;

  let closedLosing = 0;

  const realized = closedRows.reduce((sum, order) => {
    
    const tradePnl = positionPnl(order);
    if (tradePnl > 0) {
      winningTrades++;
    } else if (tradePnl < 0) {
      closedLosing++;
    }

    return sum + tradePnl;
  }, 0);

  const closedCount = closedRows.length;
  const winRate = closedCount > 0 ? (winningTrades / closedCount) * 100 : null;

  // Return is measured against all capital deployed, not only the still-open
  // lots. Using open cost as the denominator overstated ROI after any sale.
  const totalCostBasis = allOrders.reduce((sum, order) => sum + Number(order.entryPrice) * Number(order.quantity), 0);
  const unrealized = openOrders.reduce((sum, order) => sum + order.profitLoss, 0);
  const totalRoi = totalCostBasis > 0 ? ((unrealized + realized) / totalCostBasis) * 100 : 0;

    return {
      openOrders,
      openMarketValue: totalMarketValue,
      openCostBasis,
      unrealized,
      realized,
      totalRoi,
      sectorData,
      industryGroupData,
      rotationMap: rotationMapRecord,
      monthlyData,
      winRate,
      avgBarsPerTrade: positionPerformance.avgBarsPerTrade,
      maxDrawdownPct: positionPerformance.maxDrawdownPct,
      avgAdverseExcursion: positionPerformance.avgAdverseExcursion,
      openWinning: openOrders.filter(o => o.profitLoss > 0).length,
      openLosing: openOrders.filter(o => o.profitLoss < 0).length,
      closedWinning: winningTrades,
      closedLosing,
      closedCount,
    };
  } catch (err) {
    console.error('Error in getOrderStats:', err);
    return emptyOrderStats;
  }
}

type PortfolioPerformanceMetrics = {
  avgBarsPerTrade: number | null;
  avgAdverseExcursion: number | null;
  maxDrawdownPct: number | null;
};

type PerformancePosition = {
  tickerSymbol: string;
  side: string;
  entryDate: string | Date;
  entryPrice: string | number;
  quantity: string | number;
  exitDate?: string | Date | null;
  exitPrice?: string | number | null;
};

type PerformanceBar = {
  date: string;
  high: number;
  low: number;
  close: number;
};

function isoDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function positionPnl(position: PerformancePosition): number {
  const entry = Number(position.entryPrice);
  const exit = Number(position.exitPrice ?? position.entryPrice);
  const quantity = Number(position.quantity);
  const direction = String(position.side).toUpperCase() === 'SHORT' ? -1 : 1;
  return (exit - entry) * quantity * direction;
}

/**
 * Calculates portfolio risk from actual daily market bars. The equity curve is
 * the capital deployed to date plus realized P/L plus mark-to-market P/L on
 * active lots. New entries therefore add capital rather than being mistaken
 * for an investment gain.
 */
async function getPortfolioPerformanceMetrics(
  openRows: PerformancePosition[],
  closedRows: PerformancePosition[],
): Promise<PortfolioPerformanceMetrics> {
  const allRows = [...openRows, ...closedRows];
  if (allRows.length === 0) {
    return { avgBarsPerTrade: null, avgAdverseExcursion: null, maxDrawdownPct: null };
  }

  const symbols = Array.from(new Set(allRows.map((row) => row.tickerSymbol.trim().toUpperCase())));
  const firstEntry = allRows.map((row) => isoDate(row.entryDate)).sort()[0];
  const symbolList = sql.join(symbols.map((symbol) => sql`${symbol}`), sql`, `);

  try {
    const rows = await db.execute(sql`
      SELECT ticker_symbol, date, high, low, close
      FROM daily_prices
      WHERE ticker_symbol IN (${symbolList})
        AND date >= ${firstEntry}
        AND date <= CURRENT_DATE
        AND high IS NOT NULL
        AND low IS NOT NULL
        AND close IS NOT NULL
      ORDER BY ticker_symbol, date
    `);

    const barsBySymbol = new Map<string, PerformanceBar[]>();
    for (const row of rows as Array<Record<string, unknown>>) {
      const symbol = String(row.ticker_symbol || '').trim().toUpperCase();
      const bar = {
        date: String(row.date).slice(0, 10),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
      };
      if (!symbol || !Number.isFinite(bar.high) || !Number.isFinite(bar.low) || !Number.isFinite(bar.close)) continue;
      const list = barsBySymbol.get(symbol) ?? [];
      list.push(bar);
      barsBySymbol.set(symbol, list);
    }

    const measuredBars: number[] = [];
    const adverseExcursions: number[] = [];
    for (const position of closedRows) {
      const symbol = position.tickerSymbol.trim().toUpperCase();
      const entryDate = isoDate(position.entryDate);
      const exitDate = position.exitDate ? isoDate(position.exitDate) : entryDate;
      const entryPrice = Number(position.entryPrice);
      const side = String(position.side).toUpperCase();
      const tradeBars = (barsBySymbol.get(symbol) ?? []).filter((bar) => bar.date >= entryDate && bar.date <= exitDate);
      if (tradeBars.length > 0) measuredBars.push(tradeBars.length);
      if (tradeBars.length > 0 && entryPrice > 0) {
        const adversePrice = side === 'SHORT'
          ? Math.max(...tradeBars.map((bar) => bar.high))
          : Math.min(...tradeBars.map((bar) => bar.low));
        const direction = side === 'SHORT' ? 1 : -1;
        adverseExcursions.push(((adversePrice - entryPrice) / entryPrice) * 100 * direction);
      }
    }

    const dates = Array.from(new Set(Array.from(barsBySymbol.values()).flat().map((bar) => bar.date))).sort();
    const lastCloseBySymbol = new Map<string, number>();
    let peakEquity = 0;
    let maxDrawdownPct = 0;

    for (const date of dates) {
      for (const [symbol, bars] of barsBySymbol.entries()) {
        const bar = bars.find((candidate) => candidate.date === date);
        if (bar) lastCloseBySymbol.set(symbol, bar.close);
      }

      let deployedCapital = 0;
      let realizedPnl = 0;
      let activeMarkToMarketPnl = 0;

      for (const position of allRows) {
        const entryDate = isoDate(position.entryDate);
        if (entryDate > date) continue;

        const entryPrice = Number(position.entryPrice);
        const quantity = Number(position.quantity);
        const direction = String(position.side).toUpperCase() === 'SHORT' ? -1 : 1;
        deployedCapital += entryPrice * quantity;

        if (position.exitDate && isoDate(position.exitDate) <= date) {
          realizedPnl += positionPnl(position);
          continue;
        }

        const currentClose = lastCloseBySymbol.get(position.tickerSymbol.trim().toUpperCase());
        if (currentClose !== undefined && Number.isFinite(currentClose)) {
          activeMarkToMarketPnl += (currentClose - entryPrice) * quantity * direction;
        }
      }

      const equity = deployedCapital + realizedPnl + activeMarkToMarketPnl;
      if (equity <= 0) continue;
      peakEquity = Math.max(peakEquity, equity);
      const drawdownPct = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
      maxDrawdownPct = Math.max(maxDrawdownPct, drawdownPct);
    }

    return {
      avgBarsPerTrade: measuredBars.length > 0 ? measuredBars.reduce((sum, bars) => sum + bars, 0) / measuredBars.length : null,
      avgAdverseExcursion: adverseExcursions.length > 0 ? adverseExcursions.reduce((sum, value) => sum + value, 0) / adverseExcursions.length : null,
      maxDrawdownPct: dates.length > 0 ? maxDrawdownPct : null,
    };
  } catch (error) {
    console.error('Error calculating portfolio performance metrics:', error);
    return { avgBarsPerTrade: null, avgAdverseExcursion: null, maxDrawdownPct: null };
  }
}

async function getMonthlyCloseMap(symbols: string[], startDate: string): Promise<Map<string, number>> {
  if (symbols.length === 0) return new Map();

  try {
    const symbolList = sql.join(symbols.map((symbol) => sql`${symbol}`), sql`, `);
    const rows = await db.execute(sql`
      SELECT ticker_symbol, year_month, close
      FROM (
        SELECT DISTINCT ON (ticker_symbol, DATE_TRUNC('month', date))
          ticker_symbol,
          TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS year_month,
          close
        FROM daily_prices
        WHERE ticker_symbol IN (${symbolList})
          AND date >= ${startDate}
          AND close IS NOT NULL
        ORDER BY ticker_symbol, DATE_TRUNC('month', date), date DESC
      ) AS monthly_closes
    `);

    const result = new Map<string, number>();
    for (const row of rows as Array<Record<string, unknown>>) {
      const symbol = String(row.ticker_symbol || '').trim().toUpperCase();
      const yearMonth = String(row.year_month || '');
      const close = Number(row.close);
      if (symbol && yearMonth && Number.isFinite(close) && close > 0) {
        result.set(`${symbol}|${yearMonth}`, close);
      }
    }
    return result;
  } catch (error) {
    console.error('Error fetching monthly investment prices:', error);
    return new Map();
  }
}

async function getNetWorthHistory(
  userId: string,
  accounts: BankAccount[],
  transactions: BankTransaction[],
  usdRate: number,
): Promise<NetWorthHistoryPoint[]> {
  const monthKeys = recentMonthKeys(12);
  const cashTrend = buildCashTrend(accounts, transactions, usdRate, 12);

  try {
    const positionRows = await db.select({
      tickerSymbol: positions.tickerSymbol,
      status: positions.status,
      entryDate: positions.entryDate,
      entryPrice: positions.entryPrice,
      quantity: positions.quantity,
      exitDate: positions.exitDate,
    }).from(positions).where(eq(positions.userId, userId));

    const symbols = Array.from(new Set(positionRows.map((row) => row.tickerSymbol.trim().toUpperCase())));
    const monthlyCloseMap = await getMonthlyCloseMap(symbols, `${monthKeys[0]}-01`);
    const latestPrices = await getLatestPriceMap();
    const currentMonth = monthKeys[monthKeys.length - 1];
    const lastKnownCloseBySymbol = new Map<string, number>();

    return monthKeys.map((yearMonth, index) => {
      const asOfDate = monthEnd(yearMonth);
      let investedEgp = 0;

      for (const row of positionRows) {
        const entryDate = String(row.entryDate).slice(0, 10);
        const exitDate = row.exitDate ? String(row.exitDate).slice(0, 10) : null;
        const activeAtMonthEnd = entryDate <= asOfDate && (!exitDate || exitDate > asOfDate);
        if (!activeAtMonthEnd) continue;

        const symbol = row.tickerSymbol.trim().toUpperCase();
        const entryPrice = Number(row.entryPrice) || 0;
        const quantity = Number(row.quantity) || 0;
        const monthlyClose = monthlyCloseMap.get(`${symbol}|${yearMonth}`);
        if (monthlyClose !== undefined) lastKnownCloseBySymbol.set(symbol, monthlyClose);
        const price = yearMonth === currentMonth
          ? (latestPrices[symbol] ?? lastKnownCloseBySymbol.get(symbol) ?? entryPrice)
          : (monthlyClose ?? lastKnownCloseBySymbol.get(symbol) ?? entryPrice);
        investedEgp += price * quantity;
      }

      const cashEgp = cashTrend[index]?.totalEgp ?? 0;
      return {
        yearMonth,
        month: cashTrend[index]?.month ?? yearMonth,
        nominalEgp: cashEgp + investedEgp,
        cashEgp,
        brokerageCashEgp: cashTrend[index]?.brokerageCashEgp ?? 0,
        investedEgp,
      };
    });
  } catch (error) {
    console.error('Error calculating net worth history:', error);
    return [];
  }
}

async function getActiveAlertCount(userId: string): Promise<number> {
  try {
    const rows = await db.select({ id: tickerAlerts.id })
      .from(tickerAlerts)
      .where(
        and(eq(tickerAlerts.enabled, true), eq(tickerAlerts.userId, userId))
      );
    return rows.length;
  } catch (err) {
    console.error('Error in getActiveAlertCount:', err);
    return 0;
  }
}

async function getLatestPriceMap(): Promise<Record<string, number>> {
  try {
    const rows = await getCachedRecentPrices();
    const priceMap: Record<string, number> = {};
    for (const row of rows) {
      if (Number(row.rn) === 1) {
        priceMap[String(row.ticker_symbol)] = Number(row.close);
      }
    }
    return priceMap;
  } catch (err) {
    console.error('Error in getLatestPriceMap:', err);
    return {};
  }
}

async function getTickerMap(): Promise<Record<string, { companyName: string; sector: string; industryGroup: string; logoUrl: string | null }>> {
  try {
    const rows = await getCachedTickers();
    const tickerMap: Record<string, { companyName: string; sector: string; industryGroup: string; logoUrl: string | null }> = {};
    for (const ticker of rows) {
      tickerMap[ticker.symbol] = {
        companyName: ticker.companyName ?? ticker.symbol,
        sector: ticker.sector ?? 'Unclassified',
        industryGroup: ticker.industryGroup ?? ticker.sector ?? 'Unclassified',
        logoUrl: ticker.logoUrl,
      };
    }
    return tickerMap;
  } catch (err) {
    console.error('Error in getTickerMap:', err);
    return {};
  }
}

function formatMoney(value: number, showSign: boolean): string {
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatted} £`;
}

function formatPrice(value: number): string {
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`;
}

function formatSignal(signal: string): string {
  if (signal === 'BUY') return 'BUY';
  if (signal === 'SELL_TP') return 'TP';
  if (signal === 'SELL_TRAIL') return 'TRAIL';
  if (signal === 'SELL_SL') return 'STOP';
  return 'EXIT';
}

async function getUserBankAccounts(userId: string): Promise<BankAccount[]> {
  try {
    const rows = await db
      .select({
        id: userBankAccounts.id,
        userId: userBankAccounts.userId,
        bankId: userBankAccounts.bankId,
        customBankName: userBankAccounts.customBankName,
        accountName: userBankAccounts.accountName,
        accountNumber: userBankAccounts.accountNumber,
        accountType: userBankAccounts.accountType,
        currency: userBankAccounts.currency,
        balance: userBankAccounts.balance,
        color: userBankAccounts.color,
        isDefaultExpense: userBankAccounts.isDefaultExpense,
        isArchived: userBankAccounts.isArchived,
        createdAt: userBankAccounts.createdAt,
        updatedAt: userBankAccounts.updatedAt,
        bankName: banks.name,
        bankLogoUrl: banks.logoUrl,
        bankSlug: banks.slug,
      })
      .from(userBankAccounts)
      .leftJoin(banks, eq(userBankAccounts.bankId, banks.id))
      .where(and(eq(userBankAccounts.userId, userId), eq(userBankAccounts.isArchived, false)))
      .orderBy(desc(userBankAccounts.balance));
    return rows;
  } catch (err) {
    console.error('Error fetching userBankAccounts:', err);
    return [];
  }
}

async function getUserBankTransactions(userId: string): Promise<BankTransaction[]> {
  try {
    const rows = await db
      .select({
        id: bankTransactions.id,
        userId: bankTransactions.userId,
        accountId: bankTransactions.accountId,
        toAccountId: bankTransactions.toAccountId,
        type: bankTransactions.type,
        amount: bankTransactions.amount,
        currency: bankTransactions.currency,
        category: bankTransactions.category,
        transactionDate: bankTransactions.transactionDate,
        notes: bankTransactions.notes,
        accountName: userBankAccounts.accountName,
        accountType: userBankAccounts.accountType,
        bankLogoUrl: banks.logoUrl,
        bankName: banks.name,
      })
      .from(bankTransactions)
      .innerJoin(userBankAccounts, eq(bankTransactions.accountId, userBankAccounts.id))
      .leftJoin(banks, eq(userBankAccounts.bankId, banks.id))
      .where(eq(bankTransactions.userId, userId))
      .orderBy(desc(bankTransactions.transactionDate), desc(bankTransactions.createdAt));
    return rows;
  } catch (err) {
    console.error('Error fetching bankTransactions:', err);
    return [];
  }
}

async function getUsdRate(): Promise<number> {
  try {
    const recentPrices = await getCachedRecentPrices();
    const usdRow = recentPrices.find((r) => r.ticker_symbol === 'USDEGP' && Number(r.rn) === 1);
    if (usdRow && Number(usdRow.close) > 0) {
      return Number(usdRow.close);
    }
  } catch (err) {
    console.error('Error fetching USD rate:', err);
  }
  return 50.20;
}

async function getOpenPositionsForNetWorth(userId: string): Promise<PositionItem[]> {
  try {
    const [rows, latestPrices, tickerMap] = await Promise.all([
      db.select().from(positions).where(
        and(eq(positions.status, 'OPEN'), eq(positions.userId, userId))
      ),
      getLatestPriceMap().catch(() => ({} as Record<string, number>)),
      getTickerMap().catch(() => ({} as Record<string, { companyName: string; sector: string; logoUrl: string | null }>)),
    ]);

    return rows.map((p) => {
      const sym = p.tickerSymbol.trim().toUpperCase();
      const entryPrice = Number(p.entryPrice);
      const currentPrice = latestPrices[sym] ?? entryPrice;
      const meta = tickerMap[sym];

      return {
        id: p.id,
        tickerSymbol: sym,
        companyName: meta?.companyName ?? sym,
        quantity: Number(p.quantity),
        entryPrice,
        currentPrice,
        sector: meta?.sector ?? 'Unclassified',
        logoUrl: meta?.logoUrl ?? null,
      };
    });
  } catch (err) {
    console.error('Error fetching open positions for net worth:', err);
    return [];
  }
}
