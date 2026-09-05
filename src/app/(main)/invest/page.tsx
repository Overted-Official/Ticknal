import { db } from '@/db';
import { dailyPrices, tickers, positions } from '@/db/schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import { normalizeTickerSymbol, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { getCachedOpportunitiesSync } from '@/lib/opportunities';
import { evaluateHoldingConsensus, type HoldingConsensus } from '@/lib/multi-strategy-consensus';
import { getCachedIndustryRotationMap } from '@/lib/industry-rotation';
import { TickerOrder } from '@/components/platform/TickerPositions';
import { getCachedTickers, getCachedRecentPrices, getCachedDailyPrices, getCachedHourlyPrices } from '@/lib/data-cache';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import InvestClientView from '@/components/platform/invest/InvestClientView';
import InvestSectorsView from '@/components/platform/invest/InvestSectorsView';
import InvestTickersView from '@/components/platform/invest/InvestTickersView';
import PortfolioArchitectView from '@/components/platform/invest/portfolio/PortfolioArchitectView';
import { type WatchlistItem } from '@/components/platform/RightSidebar';
import InvestSkeleton from './InvestSkeleton';

export const dynamic = 'force-dynamic';

interface InvestPageProps {
  searchParams: Promise<{ ticker?: string; timeframe?: string; replay?: string; view?: string }>;
}

export default async function InvestPage(props: InvestPageProps) {
  const searchParams = await props.searchParams;
  const selectedSymbol = normalizeTickerSymbol(searchParams?.ticker || 'COMI');
  const timeframe = searchParams?.timeframe || 'D';
  const initialReplayMode = searchParams?.replay === '1';
  
  // Default to 'sectors' unless explicitly set to 'chart' or 'portfolio'
  const rawView = searchParams?.view;
  const view = rawView === 'chart' ? 'chart' : rawView === 'portfolio' ? 'portfolio' : 'sectors';

  return (
    <InvestPageContent 
      selectedSymbol={selectedSymbol} 
      timeframe={timeframe} 
      initialReplayMode={initialReplayMode} 
      view={view} 
    />
  );
}

async function InvestPageContent({ 
  selectedSymbol, 
  timeframe, 
  initialReplayMode,
  view
}: { 
  selectedSymbol: string; 
  timeframe: string; 
  initialReplayMode: boolean;
  view: string;
}) {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch (err) {
    console.warn('InvestPageContent auth check skipped/failed:', err);
  }

  const is1H = timeframe === '1H' || timeframe === '60' || timeframe === '1h';

  // Parallel fetch of all page dependencies with zero serial blocking
  const [
    allTickersRes,
    openPositionsRes,
    recentPricesRes,
    tickerPositionsRes,
    dbDataRes,
    industryRotationRes,
  ] = await Promise.allSettled([
    getCachedTickers(),
    userId
      ? db.select()
          .from(positions)
          .where(and(eq(positions.status, 'OPEN'), eq(positions.userId, userId)))
      : Promise.resolve([]),
    getCachedRecentPrices(),
    userId
      ? db.select()
          .from(positions)
          .where(and(eq(positions.tickerSymbol, selectedSymbol), eq(positions.userId, userId)))
      : Promise.resolve([]),
    is1H ? getCachedHourlyPrices(selectedSymbol) : getCachedDailyPrices(selectedSymbol),
    getCachedIndustryRotationMap().catch(() => null),
  ]);

  const allTickers = allTickersRes.status === 'fulfilled' && Array.isArray(allTickersRes.value) ? allTickersRes.value : [];
  const openPositionsRows = openPositionsRes.status === 'fulfilled' && Array.isArray(openPositionsRes.value) ? openPositionsRes.value : [];
  const recentPricesRows = recentPricesRes.status === 'fulfilled' && Array.isArray(recentPricesRes.value) ? recentPricesRes.value : [];
  const tickerPositionsData = tickerPositionsRes.status === 'fulfilled' && Array.isArray(tickerPositionsRes.value) ? tickerPositionsRes.value : [];
  const dbData = dbDataRes.status === 'fulfilled' && Array.isArray(dbDataRes.value) ? dbDataRes.value : [];

  const openPositionsSet = new Set(openPositionsRows.map((o: any) => o.tickerSymbol));

  // Group by ticker symbol for O(1) lookup
  const priceMap: Record<string, { lastPrice: number, prevPrice: number, volume: number }> = {};
  for (const row of recentPricesRows) {
    const sym = row.ticker_symbol as string;
    const close = Number(row.close);
    const volume = Number(row.volume || 0);
    const rn = Number(row.rn);
    
    if (!priceMap[sym]) priceMap[sym] = { lastPrice: 0, prevPrice: 0, volume: 0 };
    
    if (rn === 1) {
      priceMap[sym].lastPrice = close;
      priceMap[sym].volume = volume;
    }
    if (rn === 2) priceMap[sym].prevPrice = close;
  }

  function formatVol(v: number): string {
    if (!v || isNaN(v)) return '-';
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)} K`;
    return String(v);
  }

  const watchlist: WatchlistItem[] = allTickers.map((t) => {
    const p = priceMap[t.symbol] || { lastPrice: 0, prevPrice: 0, volume: 0 };
    const lastPrice = p.lastPrice;
    const prevPrice = p.prevPrice || lastPrice;
    
    const change = lastPrice - prevPrice;
    const changePct = prevPrice ? (change / prevPrice) * 100 : 0;
    
    // Use GICS industry group (25 groups) instead of sector (11 groups) for finer grouping
    const isFund = ['CI_QUANT', 'OSOUL', 'COF'].includes(t.symbol.toUpperCase());
    let group = t.industryGroup || t.sector || 'Unclassified';
    if (isFund || group.toLowerCase().includes('fund')) {
      group = 'Funds';
    }

    return {
      symbol: t.symbol,
      companyName: t.companyName || t.symbol,
      website: t.website || undefined,
      sector: group,
      price: lastPrice.toFixed(2),
      change: `${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)`,
      changePct: `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      volume: formatVol(p.volume),
      isUp: change >= 0,
      hasOpenPosition: openPositionsSet.has(t.symbol),
      logoUrl: t.logoUrl,
      recentBuyOpportunity: false,
    };
  });

  const tickerPositions: TickerOrder[] = tickerPositionsData.map((o: any) => ({
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

  const isFund = ['CI_QUANT', 'OSOUL', 'COF'].includes(selectedSymbol.toUpperCase());

  const rawChartData = dbData
    .filter(record => isFund ? Number(record.close) > 0 : (Number(record.volume) > 0 || Number(record.close) > 0))
    .map(record => {
      let timeVal: any;
      let sortKey = 0;
      if (is1H) {
        const d = typeof record.date === 'string' ? new Date(record.date) : (record.date as Date);
        // Epoch timestamp in seconds for intraday Lightweight Charts
        timeVal = Math.floor(d.getTime() / 1000);
        sortKey = timeVal;
      } else {
        const dStr = typeof record.date === 'string' 
          ? record.date.split('T')[0] 
          : new Date(record.date as Date).toISOString().split('T')[0];
        timeVal = dStr;
        const [y, m, d] = dStr.split('-').map(Number);
        sortKey = Date.UTC(y, m - 1, d) / 1000;
      }

      return {
        time: timeVal,
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume),
        _sortKey: sortKey,
      };
    })
    .sort((a, b) => a._sortKey - b._sortKey);

  const formattedChartData: Array<{
    time: any;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  let lastKey = -Infinity;
  for (const item of rawChartData) {
    if (item._sortKey > lastKey) {
      formattedChartData.push({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      });
      lastKey = item._sortKey;
    } else if (item._sortKey === lastKey && formattedChartData.length > 0) {
      formattedChartData[formattedChartData.length - 1] = {
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      };
    }
  }

  const dailyChartData = formattedChartData;
  let chartData = formattedChartData;

  if (timeframe === 'W') {
    const weeklyData: typeof chartData = [];
    let currentCandle: (typeof chartData)[number] | null = null;
    let currentWeekKey: string | null = null;
    
    for (const d of chartData) {
      const date = new Date(d.time);
      const day = date.getDay();
      const diff = date.getDate() - day;
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
      const monthKey = d.time.substring(0, 7) + '-01';

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

  const currentTicker = watchlist.find((item) => item.symbol.toUpperCase() === selectedSymbol.toUpperCase());

  const industryRotation = industryRotationRes.status === 'fulfilled' ? industryRotationRes.value : null;

  const latestPriceMap: Record<string, number> = {};
  for (const [sym, p] of Object.entries(priceMap)) {
    latestPriceMap[sym] = p.lastPrice;
  }

  const tickerMap: Record<string, { companyName: string; sector: string; industryGroup: string; logoUrl: string | null }> = {};
  for (const t of allTickers) {
    const sym = t.symbol.toUpperCase();
    const cleanSym = normalizeTickerSymbol(sym);
    const meta = {
      companyName: t.companyName || sym,
      sector: t.sector || 'Unclassified',
      industryGroup: t.industryGroup || t.sector || 'Unclassified',
      logoUrl: t.logoUrl || null,
    };
    tickerMap[sym] = meta;
    tickerMap[cleanSym] = meta;
  }

  const rotationMap: Record<string, { industryGroup: string; rotationRegime?: 'Leading' | 'Improving' | 'Weakening' | 'Lagging' }> = {};
  if (industryRotation?.tickerMap) {
    for (const [sym, meta] of industryRotation.tickerMap.entries()) {
      rotationMap[sym] = {
        industryGroup: meta.industryGroup,
        rotationRegime: meta.rotationRegime,
      };
    }
  }

  // Multi-strategy consensus for active holdings
  const positionSymbols = Array.from(new Set(openPositionsRows.map((p: any) => normalizeTickerSymbol(p.tickerSymbol))));
  const consensusMap: Record<string, HoldingConsensus> = {};

  if (positionSymbols.length > 0) {
    const priceHistories = await Promise.allSettled(
      positionSymbols.map(async (sym) => {
        if (sym === normalizeTickerSymbol(selectedSymbol) && dbData.length > 0 && !is1H) {
          return { sym, rows: dbData };
        }
        const rows = await getCachedDailyPrices(sym, 120);
        return { sym, rows };
      })
    );

    for (const res of priceHistories) {
      if (res.status === 'fulfilled' && res.value) {
        const { sym, rows } = res.value;
        const bars: PriceBar[] = (rows || []).map((r: any) => ({
          date: r.date,
          open: Number(r.open),
          high: Number(r.high),
          low: Number(r.low),
          close: Number(r.close),
          volume: Number(r.volume || 0),
        }));
        if (bars.length >= 10) {
          consensusMap[sym] = evaluateHoldingConsensus(sym, bars);
        }
      }
    }
  }

  const initialOpportunities = (getCachedOpportunitiesSync(15, 'all') || []).filter(
    (o) => o.signal.signal === 'BUY'
  );

  return (
    <div className="flex-1 h-full w-full flex flex-row bg-plt-base text-plt-text overflow-hidden pb-14 md:pb-0">
      <InvestClientView
        sectorsView={<InvestSectorsView />}
        tickersView={
          <InvestTickersView
            symbol={selectedSymbol}
            timeframe={timeframe}
            initialReplayMode={initialReplayMode}
            chartData={chartData}
            dailyChartData={dailyChartData}
            watchlist={watchlist}
            tickerPositions={tickerPositions}
            currentPrice={currentPriceForSymbol}
            companyName={currentTicker?.companyName}
            logoUrl={currentTicker?.logoUrl}
            rangeData={rangeData}
          />
        }
        portfolioView={
          <PortfolioArchitectView
            initialPositions={openPositionsRows.map((p: any) => ({
              id: p.id,
              tickerSymbol: p.tickerSymbol,
              entryPrice: Number(p.entryPrice),
              quantity: Number(p.quantity),
              createdAt: p.createdAt,
              entryDate: p.entryDate ? (typeof p.entryDate === 'string' ? p.entryDate : new Date(p.entryDate).toISOString()) : undefined,
            }))}
            latestPriceMap={latestPriceMap}
            tickerMap={tickerMap}
            rotationMap={rotationMap}
            initialConsensusMap={consensusMap}
            initialOpportunities={initialOpportunities}
          />
        }
        initialView={view as 'sectors' | 'chart' | 'portfolio'}
      />
    </div>
  );
}
