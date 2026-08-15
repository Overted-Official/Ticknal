import TopBar from '@/components/platform/TopBar';

import RightSidebar, { WatchlistItem } from '@/components/platform/RightSidebar';
import BottomToolbar from '@/components/platform/BottomToolbar';
import ChartReplayWorkspace from '@/components/platform/ChartReplayWorkspace';
import { db } from '@/db';
import { dailyPrices, tickers, positions } from '@/db/schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';
import { getRecentOpportunities } from '@/lib/opportunities';
import ChartViews from '@/components/platform/ChartViews';
import TickerPositions, { TickerOrder } from '@/components/platform/TickerPositions';
import { getCachedTickers, getCachedRecentPrices, getCachedDailyPrices } from '@/lib/data-cache';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { Suspense } from 'react';
import ChartsSkeleton from './ChartsSkeleton';

interface PlatformPageProps {
  searchParams: Promise<{ ticker?: string; timeframe?: string; replay?: string }>;
}

export default async function PlatformPage(props: PlatformPageProps) {
  const searchParams = await props.searchParams;
  const selectedSymbol = normalizeTickerSymbol(searchParams?.ticker || 'COMI');
  const timeframe = searchParams?.timeframe || 'D';
  const initialReplayMode = searchParams?.replay === '1';

  return (
    <Suspense key={`${selectedSymbol}-${timeframe}-${initialReplayMode}`} fallback={<ChartsSkeleton />}>
      <PlatformPageContent selectedSymbol={selectedSymbol} timeframe={timeframe} initialReplayMode={initialReplayMode} />
    </Suspense>
  );
}

async function PlatformPageContent({ selectedSymbol, timeframe, initialReplayMode }: { selectedSymbol: string; timeframe: string; initialReplayMode: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Fetch all tickers to build the watchlist
  const allTickers = await getCachedTickers();

  // Fetch open positions
  const openPositionsRows = await db.select({ tickerSymbol: positions.tickerSymbol })
    .from(positions)
    .where(and(eq(positions.status, 'OPEN'), eq(positions.userId, user.id)));
  const openPositionsSet = new Set(openPositionsRows.map(o => o.tickerSymbol));

  
  // Calculate watchlist items by fetching the last 2 prices for each ticker
  // Using a Window Function to eliminate the N+1 query problem that caused connection exhaustion and 7s load times
  
  // Fetch opportunities to show thunder icon on watchlist
  const [recentPricesRows, recentOpportunities] = await Promise.all([
    getCachedRecentPrices(),
    getRecentOpportunities(5)
  ]);
  
  const recentBuySymbols = new Set(
    recentOpportunities
      .filter(opp => opp.signal.signal === 'BUY')
      .map(opp => opp.symbol)
  );

  // Group by ticker symbol for O(1) lookup
  const priceMap: Record<string, { lastPrice: number, prevPrice: number }> = {};
  for (const row of recentPricesRows) {
    const sym = row.ticker_symbol as string;
    const close = Number(row.close);
    const rn = Number(row.rn);
    
    if (!priceMap[sym]) priceMap[sym] = { lastPrice: 0, prevPrice: 0 };
    
    if (rn === 1) priceMap[sym].lastPrice = close;
    if (rn === 2) priceMap[sym].prevPrice = close;
  }

  const watchlist: WatchlistItem[] = allTickers.map((t) => {
    const p = priceMap[t.symbol] || { lastPrice: 0, prevPrice: 0 };
    const lastPrice = p.lastPrice;
    const prevPrice = p.prevPrice || lastPrice;
    
    const change = lastPrice - prevPrice;
    const changePct = prevPrice ? (change / prevPrice) * 100 : 0;
    
    return {
      symbol: t.symbol,
      companyName: t.companyName || t.symbol,
      website: t.website || undefined,
      sector: t.sector || 'Unclassified',
      price: lastPrice.toFixed(2),
      change: `${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)`,
      isUp: change >= 0,
      hasOpenPosition: openPositionsSet.has(t.symbol),
      logoUrl: t.logoUrl,
      recentBuyOpportunity: recentBuySymbols.has(t.symbol),
    };
  });

  // Fetch orders specifically for the selected symbol for the Positions view
  const tickerPositionsData = await db.select().from(positions).where(and(eq(positions.tickerSymbol, selectedSymbol), eq(positions.userId, user.id)));
  const tickerPositions: TickerOrder[] = tickerPositionsData.map(o => ({
    id: o.id,
    status: o.status,
    side: o.side,
    entryDate: typeof o.entryDate === 'string' ? o.entryDate : new Date(o.entryDate as Date).toISOString(),
    entryPrice: Number(o.entryPrice),
    quantity: Number(o.quantity),
    targetPrice: o.targetPrice ? Number(o.targetPrice) : null,
    stopPrice: o.stopPrice ? Number(o.stopPrice) : null,
    exitDate: o.exitDate ? (typeof o.exitDate === 'string' ? o.exitDate : new Date(o.exitDate as Date).toISOString()) : null,
    exitPrice: o.exitPrice ? Number(o.exitPrice) : null,
  }));

  const currentPriceForSymbol = priceMap[selectedSymbol]?.lastPrice || 0;

  // Fetch chart data for the selected symbol
  const dbData = await getCachedDailyPrices(selectedSymbol);

  let dayHigh = 0;
  let dayLow = 0;
  let yearHigh = 0;
  let yearLow = 0;

  if (dbData.length > 0) {
    const lastDay = dbData[dbData.length - 1];
    dayHigh = Number(lastDay.high);
    dayLow = Number(lastDay.low);

    const lastDate = typeof lastDay.date === 'string' ? new Date(lastDay.date) : lastDay.date as Date;
    const oneYearAgo = new Date(lastDate);
    oneYearAgo.setFullYear(lastDate.getFullYear() - 1);

    const yearData = dbData.filter(d => {
      const dDate = typeof d.date === 'string' ? new Date(d.date) : d.date as Date;
      return dDate >= oneYearAgo;
    });
    
    yearHigh = Math.max(...yearData.map(d => Number(d.high)));
    yearLow = Math.min(...yearData.map(d => Number(d.low)));
  }
  const rangeData = { dayHigh, dayLow, yearHigh, yearLow };

  let chartData = dbData
    .filter(record => Number(record.volume) > 0)
    .map(record => {
      // Ensure time is strictly 'YYYY-MM-DD' (10 chars). 
      // If the DB returns an ISO string or Date, this strips the time component.
      // This forces Lightweight Charts to use a "Business Day" discrete time scale, eliminating visual gaps for holidays/weekends.
      const strictDateString = typeof record.date === 'string' 
        ? record.date.split('T')[0] 
        : new Date(record.date as Date).toISOString().split('T')[0];

      return {
        time: strictDateString,
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume)
      };
    });

  if (timeframe === 'W') {
    const weeklyData: typeof chartData = [];
    let currentCandle: (typeof chartData)[number] | null = null;
    let currentWeekKey: string | null = null;
    
    for (const d of chartData) {
      const date = new Date(d.time);
      const day = date.getDay();
      const diff = date.getDate() - day; // Start of week (Sunday)
      const weekStart = new Date(date.getTime());
      weekStart.setDate(diff);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (currentWeekKey !== weekKey) {
        if (currentCandle) weeklyData.push(currentCandle);
        currentWeekKey = weekKey;
        currentCandle = { ...d, time: weekKey };
      } else if (currentCandle) {
        currentCandle.high = Math.max(currentCandle.high, d.high);
        currentCandle.low = Math.min(currentCandle.low, d.low);
        currentCandle.close = d.close;
        currentCandle.volume += d.volume;
      }
    }
    if (currentCandle) weeklyData.push(currentCandle);
    chartData = weeklyData;
  } else if (timeframe === 'M') {
    const monthlyData: typeof chartData = [];
    let currentCandle: (typeof chartData)[number] | null = null;
    let currentMonthKey: string | null = null;
    
    for (const d of chartData) {
      const monthKey = d.time.substring(0, 7) + '-01'; // YYYY-MM-01

      if (currentMonthKey !== monthKey) {
        if (currentCandle) monthlyData.push(currentCandle);
        currentMonthKey = monthKey;
        currentCandle = { ...d, time: monthKey };
      } else if (currentCandle) {
        currentCandle.high = Math.max(currentCandle.high, d.high);
        currentCandle.low = Math.min(currentCandle.low, d.low);
        currentCandle.close = d.close;
        currentCandle.volume += d.volume;
      }
    }
    if (currentCandle) monthlyData.push(currentCandle);
    chartData = monthlyData;
  }

  return (
    <div className="flex-1 h-full w-full flex flex-col bg-plt-base text-plt-text overflow-hidden">
      <TopBar symbol={selectedSymbol} timeframe={timeframe} replay={initialReplayMode} watchlist={watchlist} />
      <div className="flex-1 flex overflow-hidden">

        <ChartViews 
          positionsView={<TickerPositions symbol={selectedSymbol} orders={tickerPositions} currentPrice={currentPriceForSymbol} />}
        >
          <ChartReplayWorkspace
            key={`${selectedSymbol}-${timeframe}-${initialReplayMode ? 'replay' : 'live'}`}
            data={chartData}
            symbol={selectedSymbol}
            initialReplayMode={initialReplayMode}
          />
          <BottomToolbar />
        </ChartViews>

        <div className="hidden lg:flex">
          <RightSidebar watchlist={watchlist} selectedSymbol={selectedSymbol} timeframe={timeframe} rangeData={rangeData} />
        </div>
      </div>
    </div>
  );
}
