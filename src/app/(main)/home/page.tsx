import Link from 'next/link';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerLocale } from '@/lib/i18n/server';
import { getCachedOpportunitiesSync, getExitSignalsForHoldings } from '@/lib/opportunities';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import {
  getOrderStats,
  getActiveAlertCount,
  emptyOrderStats,
  getUserBankAccounts,
  getUserBankTransactions,
  getFxRates,
  getNetWorthHistory,
} from '@/lib/server/portfolio-queries';
import { getLatestInflationRate, getHistoricalInflationSeries } from '@/lib/cbe-inflation';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { type FxRates, type NetWorthHistoryPoint } from '@/lib/portfolio-finance';
import HomePageView from '@/components/platform/home/HomePageView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await connection();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getServerLocale();
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-auto bg-plt-base p-8 text-center text-plt-text">
        <h2 className="text-2xl font-bold mb-4">
          {locale === 'ar' ? 'مرحبًا بك في تكنال' : 'Welcome to Ticknal'}
        </h2>
        <p className="mb-6 text-plt-muted max-w-sm">
          {locale === 'ar'
            ? 'يرجى تسجيل الدخول لعرض لوحة التحكم المخصصة ومحفظتك الاستثمارية.'
            : 'Please sign in to view your personalized dashboard and portfolio.'}
        </p>
        <Link href="/" className="rounded-xl bg-plt-accent px-6 py-2 text-plt-base transition hover:opacity-90 font-medium">
          {locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
        </Link>
      </div>
    );
  }

  let orderStats: Awaited<ReturnType<typeof getOrderStats>> = emptyOrderStats;
  let activeAlertCount = 0;
  let initialAccounts: BankAccount[] = [];
  let initialTransactions: BankTransaction[] = [];
  let usdRate = 50.20;
  let fxRates: FxRates = { EGP: 1, USD: usdRate };
  let cbeInflationRate = 14.9;
  let netWorthHistory: NetWorthHistoryPoint[] = [];
  let inflationSeries: Array<{ yearMonth: string; cbeHeadlineInflation: string; usCpiInflation?: string }> = [];

  try {
    const [statsResult, alertResult, accountsResult, txResult, fxRatesResult, inflationResult, seriesResult] = await Promise.allSettled([
      getOrderStats(user.id),
      getActiveAlertCount(user.id),
      getUserBankAccounts(user.id),
      getUserBankTransactions(user.id),
      getFxRates(),
      getLatestInflationRate(),
      getHistoricalInflationSeries(),
    ]);

    if (statsResult.status === 'fulfilled') {
      orderStats = statsResult.value;
    } else {
      console.error('Error fetching orderStats for HomePage:', statsResult.reason);
    }

    if (alertResult.status === 'fulfilled') {
      activeAlertCount = alertResult.value;
    } else {
      console.error('Error fetching activeAlertCount for HomePage:', alertResult.reason);
    }

    if (accountsResult.status === 'fulfilled') {
      initialAccounts = accountsResult.value;
    } else {
      console.error('Error fetching accounts for HomePage:', accountsResult.reason);
    }

    if (txResult.status === 'fulfilled') {
      initialTransactions = txResult.value;
    } else {
      console.error('Error fetching transactions for HomePage:', txResult.reason);
    }

    if (fxRatesResult.status === 'fulfilled') {
      fxRates = fxRatesResult.value;
      if (fxRates.USD && fxRates.USD > 0) {
        usdRate = fxRates.USD;
      }
    }

    if (inflationResult.status === 'fulfilled' && inflationResult.value > 0) {
      cbeInflationRate = inflationResult.value;
    }

    if (seriesResult.status === 'fulfilled') {
      inflationSeries = seriesResult.value.map((r) => ({
        yearMonth: r.yearMonth,
        cbeHeadlineInflation: String(r.cbeHeadlineInflation),
        usCpiInflation: r.usCpiInflation ? String(r.usCpiInflation) : undefined,
      }));
    }
  } catch (err) {
    console.error('Unexpected error in HomePage data loading:', err);
  }

  try {
    netWorthHistory = await getNetWorthHistory(user.id, initialAccounts, initialTransactions, fxRates);
  } catch (err) {
    console.error('Error fetching netWorthHistory for HomePage:', err);
  }

  const openSymbols = orderStats.openOrders.map((o) => o.tickerSymbol);
  let exitSignals: Opportunity[] = [];
  try {
    exitSignals = (await getExitSignalsForHoldings(openSymbols, 5)) as Opportunity[];
  } catch (err) {
    console.error('Error fetching exit signals for holdings in HomePage:', err);
  }

  const cachedOpps = getCachedOpportunitiesSync(10, 'champion') || getCachedOpportunitiesSync(5, 'champion');
  const initialBuyOpportunities = cachedOpps
    ? (cachedOpps.filter((item) => item.signal.signal === 'BUY').slice(0, 50) as Opportunity[])
    : [];

  return (
    <HomePageView
      orderStats={orderStats}
      buyOpportunities={initialBuyOpportunities}
      exitSignals={exitSignals}
      activeAlertCount={activeAlertCount}
      initialAccounts={initialAccounts}
      initialTransactions={initialTransactions}
      usdRate={usdRate}
      cbeInflationRate={cbeInflationRate}
      initialNetWorthHistory={netWorthHistory}
      initialInflationSeries={inflationSeries}
    />
  );
}
