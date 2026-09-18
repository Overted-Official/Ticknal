'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, TrendingUp, Landmark } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';
import InvestmentsHeader from './investments/InvestmentsHeader';
import InvestmentsKPIs from './investments/InvestmentsKPIs';
import SectorDonutChart, { type SectorDataItem } from '@/components/platform/SectorDonutChart';
import MonthlyInvestmentChart, { type MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';
import PortfolioConsultantCard, { type IndustryGroupStake } from './investments/PortfolioConsultantCard';
import ActivePositionsBreakdownTable from './investments/ActivePositionsBreakdownTable';
import DashboardPositionsCard from './investments/DashboardPositionsCard';
import DashboardSignalsCard from './investments/DashboardSignalsCard';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import { type DashboardOrder, type OrderStats } from './investments/investmentsTypes';

export type { DashboardOrder, OrderStats };

const DASHBOARD_TABS = ['net-worth', 'investments', 'banks'] as const;

interface DashboardInvestmentsPageViewProps {
  orderStats: OrderStats;
  buyOpportunities: Opportunity[];
  exitSignals: Opportunity[];
  activeAlertCount: number;
}

export default function DashboardInvestmentsPageView({
  orderStats,
  buyOpportunities,
  exitSignals,
  activeAlertCount,
}: DashboardInvestmentsPageViewProps) {
  const router = useRouter();

  const [liveBuyOpps, setLiveBuyOpps] = React.useState<Opportunity[]>(buyOpportunities ?? []);
  const [isLoadingOpps, setIsLoadingOpps] = React.useState(!buyOpportunities || buyOpportunities.length === 0);

  React.useEffect(() => {
    if (buyOpportunities && buyOpportunities.length > 0) {
      setLiveBuyOpps(buyOpportunities);
      setIsLoadingOpps(false);
      return;
    }

    let isMounted = true;
    fetch('/api/opportunities?bars=5&strategy=all')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.opportunities && Array.isArray(data.opportunities)) {
          const buys = data.opportunities.filter((o: any) => o.signal?.signal === 'BUY').slice(0, 12);
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

  const { swipeHandlers } = useSwipeableTabs({
    tabs: DASHBOARD_TABS,
    activeTab: 'investments',
    onTabChange: (tab) => {
      router.push(`/dashboard?tab=${tab}`);
    },
  });

  return (
    <div className="command-surface-page flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-plt-base text-plt-text select-none">
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab="investments"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Banks', value: 'banks', icon: Landmark },
        ]}
      />

      {/* 2. Main Page Scroll Canvas */}
      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-y-auto touch-pan-y custom-scrollbar">
        <div className="app-page page-sections-stack pb-28 md:pb-20">
          {/* Header & Section 1: Performance Overview */}
          <div className="flex flex-col gap-3 md:gap-4">
            <InvestmentsHeader />

            {/* SECTION 1: Performance Overview */}
            <section className="section-container section-viewport-fit">
              <div className="flex flex-col gap-0.5">
                <h2 className="section-title">Performance Overview</h2>
                <p className="section-subtitle">Mark-to-market portfolio returns, win rates, and monthly capital progression</p>
              </div>

              <InvestmentsKPIs
                orderStats={orderStats}
                activeAlertCount={activeAlertCount}
              />

              {/* Monthly Performance Progression Chart */}
              <div id="section-monthly-progression" className="w-full mt-3 flex-1 min-h-0 flex flex-col">
                <MonthlyInvestmentChart data={orderStats.monthlyData} />
              </div>
            </section>
          </div>

          {/* SECTION 2: Capital Allocation & Portfolio Health */}
          <section id="section-capital-allocation" className="section-container section-viewport-fit space-y-6">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Capital Allocation & Portfolio Health</h2>
              <p className="section-subtitle">25 GICS Industry Group exposure, concentration risk diagnostics, and rotation-driven rebalancing</p>
            </div>

            <div className="flex flex-col gap-8 w-full">
              {/* Row 1: Capital Allocation (Aligned with Portfolio Distribution benchmark) */}
              <div className="w-full">
                <SectorDonutChart
                  sectorData={orderStats.sectorData}
                  industryGroupData={orderStats.industryGroupData}
                  openOrders={orderStats.openOrders}
                  totalValue={orderStats.openMarketValue}
                />
              </div>

              {/* Row 2: Dedicated Portfolio Allocation Consultant & Health Advisor (Aligned with Holdings & Allocations benchmark) */}
              <div className="w-full pt-2">
                <PortfolioConsultantCard
                  stakes={orderStats.industryGroupData}
                  totalPortfolioValue={orderStats.openMarketValue}
                  buyOpportunities={liveBuyOpps}
                  rotationMap={orderStats.rotationMap}
                  openOrders={orderStats.openOrders}
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: Active Positions & Market Signals (Aligned with Holdings & Allocations benchmark) */}
          <section id="section-active-positions" className="section-container section-viewport-fit space-y-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Active Positions & Market Signals</h2>
              <p className="section-subtitle">Live open market holdings alongside real-time algorithmic entry and risk management alerts</p>
            </div>

            <div className="flex-1 min-h-0 w-full">
              <ActivePositionsBreakdownTable
                orders={orderStats.openOrders}
                totalMarketValue={orderStats.openMarketValue}
                buyOpportunities={liveBuyOpps}
                exitSignals={exitSignals}
                isLoadingBuyOpportunities={isLoadingOpps}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
