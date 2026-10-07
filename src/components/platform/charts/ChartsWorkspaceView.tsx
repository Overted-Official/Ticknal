'use client';

import React from 'react';
import ChartWorkspace from '@/components/platform/ChartWorkspace';
import BottomToolbar from '@/components/platform/BottomToolbar';
import RightSidebar, { WatchlistItem } from '@/components/platform/RightSidebar';
import { TickerOrder } from '@/components/platform/TickerPositions';
import type { BrokerageAccountOption } from '@/components/platform/AddOrderModal';
import GuestConversionBanner from '@/components/platform/auth/GuestConversionBanner';
import { useGuestGuard } from '@/context/GuestGuardContext';

export interface ChartsWorkspaceViewProps {
  symbol: string;
  timeframe: string;
  chartData: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>;
  dailyChartData: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>;
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

  return (
    <div className="flex-1 h-full w-full min-w-0 flex flex-row overflow-hidden select-none relative">
      {/* Chart Canvas + Bottom Toolbar */}
      <div className={`flex-1 flex flex-col min-w-0 relative h-full overflow-hidden ${isGuest ? 'pb-[108px] md:pb-14' : 'pb-14 md:pb-0'}`}>
        <ChartWorkspace
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
        />
        <BottomToolbar
          symbol={symbol}
          timeframe={timeframe}
          chartData={dailyChartData}
          companyName={companyName}
          logoUrl={logoUrl}
        />
      </div>

      {/* Right Sidebar */}
      <div className={`hidden lg:flex h-full shrink-0 ${isGuest ? 'pb-13 sm:pb-14' : ''}`}>
        <RightSidebar
          watchlist={watchlist}
          selectedSymbol={symbol}
          timeframe={timeframe}
          rangeData={rangeData}
        />
      </div>

      {/* Guest Mode Conversion Banner */}
      <GuestConversionBanner currentFeature="SuperCharts" />
    </div>
  );
}
