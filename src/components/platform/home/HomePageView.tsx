'use client';

import React, { useState, useEffect } from 'react';
import HomeInvestmentsHeader from './investments/HomeInvestmentsHeader';
import HomeFloatingNav from './HomeFloatingNav';
import PerformanceOverviewSection from './investments/performance/PerformanceOverviewSection';
import MyPositionsSection from './investments/positions/MyPositionsSection';
import MarketSignalsSection from './investments/signals/MarketSignalsSection';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import { type OrderStats } from './investments/homeInvestmentsTypes';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { type NetWorthHistoryPoint } from '@/lib/portfolio-finance';

interface HomePageViewProps {
  orderStats: OrderStats;
  buyOpportunities: Opportunity[];
  exitSignals: Opportunity[];
  activeAlertCount: number;
  initialAccounts?: BankAccount[];
  initialTransactions?: BankTransaction[];
  usdRate?: number;
  cbeInflationRate?: number;
  initialNetWorthHistory?: NetWorthHistoryPoint[];
  initialInflationSeries?: Array<{ yearMonth: string; cbeHeadlineInflation: string; usCpiInflation?: string }>;
}

export default function HomePageView({
  orderStats,
  buyOpportunities = [],
  exitSignals = [],
  activeAlertCount = 0,
  initialAccounts = [],
  initialTransactions = [],
  usdRate = 50.20,
  cbeInflationRate = 14.9,
  initialNetWorthHistory = [],
  initialInflationSeries = [],
}: HomePageViewProps) {
  const [liveBuyOpps, setLiveBuyOpps] = useState<Opportunity[]>(buyOpportunities);
  const [isLoadingOpps, setIsLoadingOpps] = useState(!buyOpportunities || buyOpportunities.length === 0);

  useEffect(() => {
    if (buyOpportunities && buyOpportunities.length > 0) {
      setLiveBuyOpps(buyOpportunities);
      setIsLoadingOpps(false);
      return;
    }

    let isMounted = true;
    fetch('/api/opportunities?bars=10&strategy=all')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.opportunities && Array.isArray(data.opportunities)) {
          const buys = data.opportunities.filter((o: any) => o.signal?.signal === 'BUY');
          setLiveBuyOpps(buys);
        }
      })
      .catch((err) => console.warn('Background opportunities load error:', err))
      .finally(() => {
        if (isMounted) setIsLoadingOpps(false);
      });

    return () => {
      isMounted = false;
    };
  }, [buyOpportunities]);

  return (
    <div className="command-surface-page flex-1 h-full w-full flex flex-col min-h-0 overflow-y-auto custom-scrollbar bg-plt-base text-plt-text select-none">
      {/* 1. Header (Breadcrumbs) */}
      <div className="px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-plt-base">
        <HomeInvestmentsHeader />
      </div>

      {/* 2. Sticky Floating Top Navigation Bar */}
      <HomeFloatingNav />

      {/* 3. Main Sections Stack */}
      <div className="app-page page-sections-stack pb-28 md:pb-20 pt-1 space-y-8">
        <PerformanceOverviewSection
          orderStats={orderStats}
          initialAccounts={initialAccounts}
          initialTransactions={initialTransactions}
          usdRate={usdRate}
          cbeInflationRate={cbeInflationRate}
          initialNetWorthHistory={initialNetWorthHistory}
          initialInflationSeries={initialInflationSeries}
        />

        {/* SECTION 2: My Positions (Stock Gainers & Stock Losers) */}
        <MyPositionsSection
          orders={orderStats.openOrders}
          totalMarketValue={orderStats.openMarketValue}
          exitSignals={exitSignals}
        />

        {/* SECTION 3: Market Signals (Algorithmic Buy Opportunities with Strategy Switcher) */}
        <MarketSignalsSection
          buyOpportunities={liveBuyOpps}
          isLoading={isLoadingOpps}
        />
      </div>
    </div>
  );
}
