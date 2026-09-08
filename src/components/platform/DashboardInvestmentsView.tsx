'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, TrendingUp, Landmark } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';
import InvestmentsHeader from './dashboard/investments/InvestmentsHeader';
import InvestmentsKPIs from './dashboard/investments/InvestmentsKPIs';
import ExtendedPerformanceBar from './dashboard/investments/ExtendedPerformanceBar';
import SectorDonutChart, { type SectorDataItem } from '@/components/platform/SectorDonutChart';
import MonthlyInvestmentChart, { type MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';
import PortfolioConsultantCard, { type IndustryGroupStake } from './dashboard/investments/PortfolioConsultantCard';
import DashboardPositionsCard from './dashboard/investments/DashboardPositionsCard';
import DashboardSignalsCard from './dashboard/investments/DashboardSignalsCard';
import { type Opportunity } from '@/components/platform/OpportunityTable';

const DASHBOARD_TABS = ['net-worth', 'investments', 'banks'] as const;

export type DashboardOrder = {
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

export type OrderStats = {
  openOrders: DashboardOrder[];
  openMarketValue: number;
  openCostBasis: number;
  unrealized: number;
  realized: number;
  totalRoi: number;
  sectorData: SectorDataItem[];
  industryGroupData: IndustryGroupStake[];
  rotationMap?: Record<string, string>;
  monthlyData: MonthlyDataItem[];
  winRate: number | null;
  avgBarsPerTrade: number | null;
  maxDrawdownPct: number | null;
  avgAdverseExcursion: number | null;
  openWinning: number;
  openLosing: number;
  closedWinning: number;
  closedLosing: number;
  closedCount: number;
};

interface DashboardInvestmentsViewProps {
  orderStats: OrderStats;
  buyOpportunities: Opportunity[];
  exitSignals: Opportunity[];
  activeAlertCount: number;
}

export default function DashboardInvestmentsView({
  orderStats,
  buyOpportunities,
  exitSignals,
  activeAlertCount,
}: DashboardInvestmentsViewProps) {
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
          { label: 'Accounts', value: 'banks', icon: Landmark },
        ]}
      />

      {/* 2. Main Page Scroll Canvas */}
      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-y-auto touch-pan-y custom-scrollbar">
        <div className="app-page page-sections-stack pb-28 md:pb-20">
          {/* Header */}
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

            <ExtendedPerformanceBar orderStats={orderStats} />

            {/* Monthly Performance Progression Chart */}
            <div className="card-widget w-full mt-1">
              <MonthlyInvestmentChart data={orderStats.monthlyData} />
            </div>
          </section>

          {/* SECTION 2: Capital Allocation & Portfolio Health */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Capital Allocation & Portfolio Health</h2>
              <p className="section-subtitle">25 GICS Industry Group exposure, concentration risk diagnostics, and rotation-driven rebalancing</p>
            </div>

            <div className="widget-grid grid-cols-1 xl:grid-cols-2 items-stretch w-full">
              {/* 25 GICS Industry Group Capital Allocation */}
              <div className="card-widget dashboard-widget-height flex flex-col overflow-hidden">
                <SectorDonutChart data={orderStats.sectorData} />
              </div>

              {/* Dedicated Portfolio Allocation Consultant & Health Advisor */}
              <div className="dashboard-widget-height">
                <PortfolioConsultantCard
                  stakes={orderStats.industryGroupData}
                  totalPortfolioValue={orderStats.openMarketValue}
                  buyOpportunities={liveBuyOpps}
                  rotationMap={orderStats.rotationMap}
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: Active Positions & Market Signals */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Active Positions & Market Signals</h2>
              <p className="section-subtitle">Live open market holdings alongside real-time algorithmic entry and risk management alerts</p>
            </div>

            <div className="widget-grid grid-cols-1 xl:grid-cols-2 items-stretch w-full">
              <div className="dashboard-widget-height">
                <DashboardPositionsCard
                  orders={orderStats.openOrders}
                  exitSignals={exitSignals}
                />
              </div>
              <div className="dashboard-widget-height">
                <DashboardSignalsCard
                  buyOpportunities={liveBuyOpps}
                  exitSignals={exitSignals}
                  isLoadingBuyOpportunities={isLoadingOpps}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
