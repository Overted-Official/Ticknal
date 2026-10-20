'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HomeInvestmentsHeader from './investments/HomeInvestmentsHeader';
import HomeFloatingNav from './HomeFloatingNav';
import MobileHomeHero from './MobileHomeHero';
import PerformanceOverviewSection from './investments/performance/PerformanceOverviewSection';
import MyPositionsSection from './investments/positions/MyPositionsSection';
import MarketSignalsSection from './investments/signals/MarketSignalsSection';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import { type OrderStats } from './investments/homeInvestmentsTypes';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { type NetWorthHistoryPoint } from '@/lib/portfolio-finance';
import { signalTicknalReady } from '@/components/platform/splash/splash-boot-script';
import { Tour, useTour } from '@/components/ui/tour';
import { getHomeTourSteps, HOME_TOUR_STORAGE_KEY } from '@/lib/tours/home-tour-config';
import { useTranslation } from '@/lib/i18n';

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
  userProfile?: {
    name: string;
    avatarUrl?: string | null;
    email?: string;
  };
  canViewProprietary?: boolean;
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
  userProfile,
  canViewProprietary = false,
}: HomePageViewProps) {
  const [liveBuyOpps, setLiveBuyOpps] = useState<Opportunity[]>([]);
  const [isLoadingOpps, setIsLoadingOpps] = useState(canViewProprietary && (!buyOpportunities || buyOpportunities.length === 0));

  const { isRTL } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const tour = useTour(HOME_TOUR_STORAGE_KEY);
  const tourSteps = React.useMemo(
    () => getHomeTourSteps(isRTL, canViewProprietary, isMobile),
    [isRTL, canViewProprietary, isMobile]
  );

  // Signal splash screen that home page view is mounted with initial data
  useEffect(() => {
    signalTicknalReady();
  }, []);

  useEffect(() => {
    if (!canViewProprietary || (buyOpportunities && buyOpportunities.length > 0)) {
      return;
    }

    let isMounted = true;
    fetch('/api/opportunities?bars=10&strategy=champion')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.opportunities && Array.isArray(data.opportunities)) {
          const buys = (data.opportunities as Opportunity[]).filter((opportunity) => opportunity.signal?.signal === 'BUY');
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
  }, [buyOpportunities, canViewProprietary]);

  const router = useRouter();

  // Intraday live portfolio refresh: softly refreshes server component data every 3 minutes
  useEffect(() => {
    let lastRefreshTime = Date.now();

    const triggerRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        router.refresh();
        lastRefreshTime = Date.now();
      }
    };

    const intervalId = setInterval(triggerRefresh, 180 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshTime > 180 * 1000) {
        triggerRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [router]);

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text select-none">
      {/* 1. Mobile-Only Hero Banner with Wavy Gradient */}
      <div className="block md:hidden shrink-0 relative z-40">
        <MobileHomeHero
          userProfile={userProfile}
          activeAlertCount={activeAlertCount}
          onStartTour={tour.start}
        />
      </div>

      {/* Desktop/Tablet Header (Breadcrumbs) */}
      <div className="hidden md:block px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-plt-base">
        <HomeInvestmentsHeader onStartTour={tour.start} />
      </div>

      {/* 2. Sticky Floating Top Navigation Bar */}
      <div data-tour="home-floating-nav">
        <HomeFloatingNav canViewProprietary={canViewProprietary} />
      </div>

      {/* 3. Main Sections Stack */}
      <div className="app-page page-sections-stack pb-28 md:pb-20 pt-1 space-y-8">
        <div data-tour="home-portfolio-summary">
          <PerformanceOverviewSection
            orderStats={orderStats}
            initialAccounts={initialAccounts}
            initialTransactions={initialTransactions}
            usdRate={usdRate}
            cbeInflationRate={cbeInflationRate}
            initialNetWorthHistory={initialNetWorthHistory}
            initialInflationSeries={initialInflationSeries}
          />
        </div>

        {/* SECTION 2: Positions (Stock Gainers & Stock Losers) */}
        <div data-tour="home-positions-section">
          <MyPositionsSection
            orders={orderStats.openOrders}
            totalMarketValue={orderStats.openMarketValue}
            exitSignals={exitSignals}
          />
        </div>

        {/* SECTION 3: Buy Opportunities (Algorithmic Buy Opportunities with Strategy Switcher) */}
        {canViewProprietary && (
          <div data-tour="home-signals-section">
            <MarketSignalsSection
              buyOpportunities={buyOpportunities.length > 0 ? buyOpportunities : liveBuyOpps}
              isLoading={buyOpportunities.length === 0 && isLoadingOpps}
            />
          </div>
        )}
      </div>

      {/* 4. Product Walkthrough Tour */}
      <Tour
        steps={tourSteps}
        open={tour.open}
        onOpenChange={tour.setOpen}
        index={tour.index}
        onIndexChange={tour.setIndex}
        onFinish={tour.markSeen}
        onSkip={tour.markSeen}
        dark
      />
    </div>
  );
}
