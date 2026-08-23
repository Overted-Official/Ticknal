'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, TrendingUp, Landmark } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';
import InvestmentsHeader from './dashboard/investments/InvestmentsHeader';
import InvestmentsKPIs from './dashboard/investments/InvestmentsKPIs';
import ExtendedPerformanceBar from './dashboard/investments/ExtendedPerformanceBar';
import DashboardCharts from '@/components/platform/DashboardCharts';
import DashboardPositionsCard from './dashboard/investments/DashboardPositionsCard';
import DashboardSignalsCard from './dashboard/investments/DashboardSignalsCard';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import { type SectorDataItem } from '@/components/platform/SectorDonutChart';
import { type MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';

const DASHBOARD_TABS = ['net-worth', 'investments', 'banks'] as const;

export type DashboardOrder = {
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

export type OrderStats = {
  openOrders: DashboardOrder[];
  openMarketValue: number;
  unrealized: number;
  realized: number;
  totalRoi: number;
  sectorData: SectorDataItem[];
  monthlyData: MonthlyDataItem[];
  winRate: number;
  avgBarsPerTrade: number;
  maxDrawdownPct: number;
  avgAdverseExcursion: number;
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

  const { swipeHandlers } = useSwipeableTabs({
    tabs: DASHBOARD_TABS,
    activeTab: 'investments',
    onTabChange: (val) => router.push(`/dashboard?tab=${val}`),
  });

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-tv-base text-tv-text select-none">
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab="investments"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Bank Accounts', value: 'banks', icon: Landmark },
        ]}
      />

      {/* 2. Main Page Scroll Canvas */}
      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-y-auto touch-pan-y">
        <div className="app-page page-sections-stack pb-28 md:pb-20">
          {/* Header */}
          <InvestmentsHeader />

          {/* SECTION 1: Performance Overview */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Performance Overview</h2>
              <p className="section-subtitle">Mark-to-market portfolio returns, win rates, and capital distribution</p>
            </div>

            <InvestmentsKPIs
              orderStats={orderStats}
              activeAlertCount={activeAlertCount}
            />

            <ExtendedPerformanceBar orderStats={orderStats} />
          </section>

          {/* SECTION 2: Allocation & Capital Flow */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Allocation & Capital Flow</h2>
              <p className="section-subtitle">EGX sector exposure and historical monthly capital deployment</p>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <DashboardCharts
                sectorData={orderStats.sectorData}
                monthlyData={orderStats.monthlyData}
              />
            </div>
          </section>

          {/* SECTION 3: Active Positions & Market Signals */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Active Positions & Market Signals</h2>
              <p className="section-subtitle">Live open market holdings alongside real-time algorithmic entry and risk management alerts</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch flex-1 min-h-0">
              <DashboardPositionsCard orders={orderStats.openOrders} />
              <DashboardSignalsCard
                buyOpportunities={buyOpportunities}
                exitSignals={exitSignals}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
