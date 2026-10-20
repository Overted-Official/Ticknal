'use client';

import React from 'react';
import ChartWorkspace from '@/components/platform/ChartWorkspace';
import BottomToolbar from '@/components/platform/BottomToolbar';
import RightSidebar, { WatchlistItem } from '@/components/platform/RightSidebar';
import { TickerOrder } from '@/components/platform/TickerPositions';
import type { BrokerageAccountOption } from '@/components/platform/AddOrderModal';
import GuestConversionBanner from '@/components/platform/auth/GuestConversionBanner';
import { useGuestGuard } from '@/context/GuestGuardContext';
import { Tour, useTour } from '@/components/ui/tour';
import { getChartsTourSteps, CHARTS_TOUR_STORAGE_KEY } from '@/lib/tours/charts-tour-config';
import { useTranslation } from '@/lib/i18n';
import { useHeroSceneMode } from '@/components/landing/hero-scenes/useHeroSceneMode';

export interface ChartsWorkspaceViewProps {
  canViewProprietary?: boolean;
  symbol: string;
  timeframe: string;
  chartData: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>;
  dailyChartData?: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>;
  watchlist: WatchlistItem[];
  tickerPositions: TickerOrder[];
  currentPrice: number;
  companyName?: string;
  logoUrl?: string | null;
  currency?: string;
  rangeData: { dayHigh: number; dayLow: number; yearHigh: number; yearLow: number };
  brokerageAccounts?: BrokerageAccountOption[];
}

export default function ChartsWorkspaceView({
  canViewProprietary = false,
  symbol,
  timeframe,
  chartData,
  dailyChartData,
  watchlist,
  tickerPositions,
  currentPrice,
  companyName,
  logoUrl,
  currency,
  rangeData,
  brokerageAccounts = [],
}: ChartsWorkspaceViewProps) {
  const { isGuest } = useGuestGuard();
  const { isRTL } = useTranslation();
  const isHeroScene = useHeroSceneMode();

  const tour = useTour(CHARTS_TOUR_STORAGE_KEY);
  const tourSteps = React.useMemo(
    () => getChartsTourSteps(isRTL, canViewProprietary),
    [isRTL, canViewProprietary]
  );

  return (
    <div className="flex-1 h-full w-full min-w-0 flex flex-row overflow-hidden select-none relative">
      {/* Chart Canvas + Bottom Toolbar */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        <ChartWorkspace
          canViewProprietary={canViewProprietary}
          key={`${symbol}-${timeframe}`}
          data={chartData}
          symbol={symbol}
          watchlist={watchlist}
          tickerPositions={tickerPositions}
          currentPrice={currentPrice}
          brokerageAccounts={brokerageAccounts}
          companyName={companyName}
          logoUrl={logoUrl}
          currency={currency}
          onStartTour={tour.start}
        />
        <div data-tour="chart-bottom-toolbar" className="shrink-0 w-full">
          <BottomToolbar
            symbol={symbol}
            timeframe={timeframe}
            chartData={dailyChartData || chartData}
            companyName={companyName}
            logoUrl={logoUrl}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:flex h-full shrink-0" data-tour="chart-watchlist-sidebar">
        <RightSidebar
          canViewProprietary={canViewProprietary}
          watchlist={watchlist}
          selectedSymbol={symbol}
          timeframe={timeframe}
          rangeData={rangeData}
        />
      </div>

      {/* Guest Mode Conversion Banner */}
      <GuestConversionBanner currentFeature="SuperCharts" />

      {/* In-App Tour Walkthrough Portal */}
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
