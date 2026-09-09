'use client';

import React from 'react';
import ChartReplayWorkspace from '@/components/platform/ChartReplayWorkspace';
import BottomToolbar from '@/components/platform/BottomToolbar';
import RightSidebar, { WatchlistItem } from '@/components/platform/RightSidebar';
import { TickerOrder } from '@/components/platform/TickerPositions';
import type { BrokerageAccountOption } from '@/components/platform/AddOrderModal';

interface InvestTickersViewProps {
  symbol: string;
  timeframe: string;
  initialReplayMode: boolean;
  chartData: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>;
  dailyChartData: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>;
  watchlist: WatchlistItem[];
  tickerPositions: TickerOrder[];
  currentPrice: number;
  companyName?: string;
  logoUrl?: string | null;
  rangeData: { dayHigh: number; dayLow: number; yearHigh: number; yearLow: number };
  brokerageAccounts?: BrokerageAccountOption[];
}

export default function InvestTickersView({
  symbol,
  timeframe,
  initialReplayMode,
  chartData,
  dailyChartData,
  watchlist,
  tickerPositions,
  currentPrice,
  companyName,
  logoUrl,
  rangeData,
  brokerageAccounts = [],
}: InvestTickersViewProps) {
  return (
    <div className="flex-1 h-full w-full flex flex-row overflow-hidden select-none">
      {/* Chart Canvas + Bottom Toolbar */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        <ChartReplayWorkspace
          key={`${symbol}-${timeframe}-${initialReplayMode ? 'replay' : 'live'}`}
          data={chartData}
          symbol={symbol}
          watchlist={watchlist}
          initialReplayMode={initialReplayMode}
          tickerPositions={tickerPositions}
          currentPrice={currentPrice}
          brokerageAccounts={brokerageAccounts}
        />
        <BottomToolbar
          symbol={symbol}
          timeframe={timeframe}
          replay={initialReplayMode}
          chartData={dailyChartData}
          companyName={companyName}
          logoUrl={logoUrl}
        />
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        <RightSidebar
          watchlist={watchlist}
          selectedSymbol={symbol}
          timeframe={timeframe}
          rangeData={rangeData}
        />
      </div>
    </div>
  );
}
