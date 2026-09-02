import Link from 'next/link';
import { connection } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { banks, dailyPrices, macroInflationRates, positions, tickerAlerts, tickers, userBankAccounts, bankTransactions } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar, type PsiSignal } from '@/strategies/PSI/psiStrategy';
import { getRecentOpportunities } from '@/lib/opportunities';
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
  unrealized: 0,
  realized: 0,
  totalRoi: 0,
  sectorData: [] as SectorDataItem[],
  industryGroupData: [] as IndustryGroupStake[],
  rotationMap: {} as Record<string, string>,
  monthlyData: [] as MonthlyDataItem[],
  winRate: 0,
  avgBarsPerTrade: 0,
  maxDrawdownPct: 0,
  avgAdverseExcursion: 0,
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
      <div className="flex h-full min-h-0 flex-col overflow-auto bg-tv-base text-tv-text items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to QuantEGX</h2>
        <p className="text-tv-muted mb-6">Please sign in to view your personalized dashboard and portfolio.</p>
        <Link href="/" className="bg-tv-accent text-white px-6 py-2 rounded-tv-sm hover:bg-tv-accent/90 transition">
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
    let openPositions: PositionItem[] = [];
    let cbeInflation = 14.9;
    let usCpiInflation = 2.8;
    let inflationSeries: Array<{ yearMonth: string; cbeHeadlineInflation: string; usCpiInflation?: string }> = [];

    try {
      const [accRes, posRes, infRes, usCpiRes, seriesRes] = await Promise.allSettled([
        getUserBankAccounts(user.id),
        getOpenPositionsForNetWorth(user.id),
        getLatestInflationRate(),
        getLatestUsCpiRate(),
        getHistoricalInflationSeries(),
      ]);

      if (accRes.status === 'fulfilled') accounts = accRes.value;
      if (posRes.status === 'fulfilled') openPositions = posRes.value;
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

    return (
      <DashboardNetWorthView
        initialAccounts={accounts}
        openPositions={openPositions}
        usdRate={usdRate}
        cbeAnnualInflation={cbeInflation}
        usCpiAnnualInflation={usCpiInflation}
        initialInflationSeries={inflationSeries}
      />
    );
  }

  // Tab 1: Investments View (Default)
  let orderStats = emptyOrderStats;
  let opportunities: Opportunity[] = [];
  let activeAlertCount = 0;

  const fetchWithTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
    ]);
  };

  try {
    const [statsResult, oppsResult, alertResult] = await Promise.allSettled([
      getOrderStats(user.id),
      fetchWithTimeout(getRecentOpportunities(), 2500, [] as Opportunity[]),
      getActiveAlertCount(user.id),
    ]);

    if (statsResult.status === 'fulfilled') {
      orderStats = statsResult.value;
    } else {
      console.error('Error fetching orderStats:', statsResult.reason);
    }

    if (oppsResult.status === 'fulfilled') {
      opportunities = oppsResult.value;
    } else {
      console.error('Error fetching opportunities:', oppsResult.reason);
    }

    if (alertResult.status === 'fulfilled') {
      activeAlertCount = alertResult.value;
    } else {
      console.error('Error fetching activeAlertCount:', alertResult.reason);
    }
  } catch (err) {
    console.error('Unexpected error in DashboardContent:', err);
  }

  const openPositionTickers = new Set(
    orderStats.openOrders.map((o) => o.tickerSymbol.replace('.CA', '').trim().toUpperCase())
  );
  const buyOpportunities = opportunities.filter((item) => item.signal.signal === 'BUY').slice(0, 12);
  const exitSignals = opportunities.filter((item) => {
    const sym = item.symbol.replace('.CA', '').trim().toUpperCase();
    return item.signal.signal !== 'BUY' && openPositionTickers.has(sym);
  });

  return (
    <DashboardInvestmentsView
      orderStats={orderStats}
      buyOpportunities={buyOpportunities}
      exitSignals={exitSignals}
      activeAlertCount={activeAlertCount}
    />
  );
}

async function getOrderStats(userId: string) {
  try {
    const [openRows, closedRows, latestPrices, tickerMap, avgAdverseExcursion, rotationMeta] = await Promise.all([
      db.select().from(positions).where(
        and(eq(positions.status, 'OPEN'), eq(positions.userId, userId))
      ).orderBy(desc(positions.createdAt)),
      db.select().from(positions).where(
        and(eq(positions.status, 'CLOSED'), eq(positions.userId, userId))
      ).orderBy(desc(positions.createdAt)),
      getLatestPriceMap().catch(() => ({} as Record<string, number>)),
      getTickerMap().catch(() => ({} as Record<string, { companyName: string; sector: string; industryGroup: string; logoUrl: string | null }>)),
      getAvgAdverseExcursion(userId).catch(() => 0),
      getCachedIndustryRotationMap().catch(() => ({ tickerMap: new Map(), industryMap: new Map() })),
    ]);

  const openOrdersMap = new Map<string, DashboardOrder>();
  for (const order of openRows) {
    const symbol = order.tickerSymbol.trim().toUpperCase();
    const cleanSym = symbol.replace('.CA', '');
    const entryPrice = Number(order.entryPrice);
    const quantity = Number(order.quantity);
    const currentPrice = latestPrices[symbol] ?? entryPrice;
    const profitLoss = (currentPrice - entryPrice) * quantity;
    const industryGroup = tickerMap[symbol]?.industryGroup || rotationMeta.tickerMap.get(cleanSym)?.industryGroup || tickerMap[symbol]?.sector || 'Unclassified';

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
        industryGroup,
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
  const totalMarketValue = openOrders.reduce((sum, o) => sum + o.currentPrice * o.quantity, 0);

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

  // --- Monthly Investment & Realized/Unrealized P/L (Activity-based) ---
  type MonthlyBucket = { invested: number; realizedPL: number; unrealizedPL: number };
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
        monthlyBucketMap.set(label, { invested: 0, realizedPL: 0, unrealizedPL: 0 });
      }
      current.setMonth(current.getMonth() + 1);
    }
  }

  // 2. Invested: group by entryDate month (capital deployed)
  for (const order of allOrders) {
    const entryLabel = getLabel(getIsoDate(order.entryDate));
    const cost = Number(order.entryPrice) * Number(order.quantity);
    if (!monthlyBucketMap.has(entryLabel)) monthlyBucketMap.set(entryLabel, { invested: 0, realizedPL: 0, unrealizedPL: 0 });
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
    if (!monthlyBucketMap.has(exitLabel)) monthlyBucketMap.set(exitLabel, { invested: 0, realizedPL: 0, unrealizedPL: 0 });
    monthlyBucketMap.get(exitLabel)!.realizedPL += pl;
  }

  // 4. Unrealized P/L: group by entryDate month for active open positions
  for (const order of openRows) {
    const entryLabel = getLabel(getIsoDate(order.entryDate));
    const symbol = order.tickerSymbol.trim().toUpperCase();
    const entryPrice = Number(order.entryPrice);
    const currentPrice = latestPrices[symbol] ?? entryPrice;
    const quantity = Number(order.quantity);
    const unpl = (currentPrice - entryPrice) * quantity;
    if (!monthlyBucketMap.has(entryLabel)) monthlyBucketMap.set(entryLabel, { invested: 0, realizedPL: 0, unrealizedPL: 0 });
    monthlyBucketMap.get(entryLabel)!.unrealizedPL += unpl;
  }

  // 5. Sort chronologically and compute cumulative ROI line
  const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const sortedBuckets = Array.from(monthlyBucketMap.entries())
    .sort((a, b) => {
      const [aM, aY] = [a[0].slice(0, 3), a[0].slice(-2)];
      const [bM, bY] = [b[0].slice(0, 3), b[0].slice(-2)];
      if (aY !== bY) return Number(aY) - Number(bY);
      return monthOrder.indexOf(aM) - monthOrder.indexOf(bM);
    });

  let cumInvested = 0;
  let cumRealizedPL = 0;
  let cumUnrealizedPL = 0;
  const monthlyData: MonthlyDataItem[] = sortedBuckets.map(([month, bucket]) => {
    cumInvested += bucket.invested;
    cumRealizedPL += bucket.realizedPL;
    cumUnrealizedPL += bucket.unrealizedPL;
    const totalPL = cumRealizedPL + cumUnrealizedPL;
    return {
      month,
      invested: bucket.invested,
      pl: bucket.realizedPL,
      unrealizedPl: bucket.unrealizedPL,
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
      industryGroupData,
      rotationMap: rotationMapRecord,
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
  } catch (err) {
    console.error('Error in getOrderStats:', err);
    return emptyOrderStats;
  }
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
        WHERE p.user_id = ${userId}::uuid AND p.status = 'CLOSED'
        GROUP BY p.id, p.entry_price
      ) sub
    `);
    const row = result[0] as Record<string, unknown> | undefined;
    const avgMae = Number(row?.avg_mae ?? 0);
    return isNaN(avgMae) ? 0 : avgMae;
  } catch (err) {
    console.error('Error calculating avgAdverseExcursion:', err);
    return 0;
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
      .orderBy(desc(bankTransactions.transactionDate), desc(bankTransactions.createdAt))
      .limit(100);
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
