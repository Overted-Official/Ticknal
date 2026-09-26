'use client';

import { useCallback, useState, useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import ChartWidget, { type ChartData } from '@/components/platform/ChartWidget';
import { STRATEGIES } from '@/strategies/registry';
import { tickerDataStore } from '@/lib/storage/tickerDataStore';
import { prefetchWatchlist } from '@/lib/client-price-cache';

import { WatchlistItem } from '@/components/platform/RightSidebar';
import { TickerOrder } from '@/components/platform/TickerPositions';
import type { BrokerageAccountOption } from '@/components/platform/AddOrderModal';

interface ChartWorkspaceProps {
  data: ChartData[];
  symbol: string;
  watchlist?: WatchlistItem[];
  tickerPositions?: TickerOrder[];
  currentPrice?: number;
  brokerageAccounts?: BrokerageAccountOption[];
  companyName?: string;
  logoUrl?: string | null;
}

export default function ChartWorkspace({
  data,
  symbol,
  watchlist = [],
  tickerPositions = [],
  currentPrice = 0,
  brokerageAccounts = [],
  companyName,
  logoUrl,
}: ChartWorkspaceProps) {

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [activeIndicators, setActiveIndicators] = useState<string[]>(() => {
    return searchParams?.get('indicators')?.split(',').filter(Boolean) || [];
  });

  const handleToggleIndicator = useCallback((id: string) => {
    setActiveIndicators((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      const params = new URLSearchParams(window.location.search);
      if (next.length > 0) {
        params.set('indicators', next.join(','));
      } else {
        params.delete('indicators');
      }
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
      return next;
    });
  }, [pathname]);

  const initialStrategy = searchParams?.get('strategy') || 'psi';
  const [selectedStrategy, setSelectedStrategy] = useState(initialStrategy);

  const [strategyParams, setStrategyParams] = useState<Record<string, any>>(() => {
    const initialParams: Record<string, any> = {};
    const stratDef = STRATEGIES[initialStrategy];
    if (stratDef) {
      stratDef.settings.forEach(s => {
        const urlVal = searchParams?.get(`s_${s.key}`);
        initialParams[s.key] = urlVal !== null ? (s.type === 'number' || s.type === 'range' ? Number(urlVal) : urlVal) : s.default;
      });
    }
    return initialParams;
  });

  const [strategyStartDate, setStrategyStartDate] = useState<string>(
    searchParams?.get('strategyStart') || '2025-01-01'
  );
  const [strategyEndDate, setStrategyEndDate] = useState<string | undefined>(
    searchParams?.get('strategyEnd') || undefined
  );

  const rawTf = searchParams?.get('timeframe') || 'D';
  const timeframe = (rawTf === '1H' || rawTf === '60' || rawTf === '1h') ? 'D' : rawTf;

  // Client-side IndexedDB caching & delta sync
  const [activeChartData, setActiveChartData] = useState<ChartData[]>(data);

  useEffect(() => {
    setActiveChartData(data);
  }, [data]);

  useEffect(() => {
    let isCancelled = false;

    // 1. Instantly check IndexedDB for cached historical bars
    tickerDataStore.getStoredBars(symbol, timeframe).then((localBars) => {
      if (!isCancelled && localBars.length > 0 && (!data || localBars.length > data.length)) {
        setActiveChartData(localBars as ChartData[]);
      }
    }).catch(() => {});

    // 2. Perform delta-sync in background to fetch only missing days
    tickerDataStore.syncTickerData(symbol, timeframe, {
      initialBars: data as any,
    }).then((result) => {
      if (!isCancelled && result.bars && result.bars.length > 0) {
        setActiveChartData(result.bars as ChartData[]);
      }
    }).catch((err) => {
      console.warn('Ticker data delta sync warning:', err);
    });

    // 3. Pre-warm user's watchlist symbols in background during idle time
    if (watchlist && watchlist.length > 0) {
      prefetchWatchlist(watchlist.map((w) => w.symbol), timeframe);
    }

    return () => {
      isCancelled = true;
    };
  }, [symbol, timeframe, watchlist]);

  // Sync strategy if URL query param changes
  useEffect(() => {
    const urlStrat = searchParams?.get('strategy');
    if (urlStrat && urlStrat !== selectedStrategy && STRATEGIES[urlStrat]) {
      setSelectedStrategy(urlStrat);
      const stratDef = STRATEGIES[urlStrat];
      const newParams: Record<string, any> = {};
      if (stratDef) {
        stratDef.settings.forEach(s => {
          const urlVal = searchParams?.get(`s_${s.key}`);
          newParams[s.key] = urlVal !== null ? (s.type === 'number' || s.type === 'range' ? Number(urlVal) : urlVal) : s.default;
        });
      }
      setStrategyParams(newParams);
    }
  }, [searchParams, selectedStrategy]);

  const handleStrategyChange = useCallback((newStrategy: string) => {
    setSelectedStrategy(newStrategy);
    const stratDef = STRATEGIES[newStrategy];
    const newParams: Record<string, any> = {};
    if (stratDef) {
      stratDef.settings.forEach(s => {
        newParams[s.key] = s.default;
      });
    }
    setStrategyParams(newParams);

    // Sync to URL shallowly
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('strategy', newStrategy);
    Array.from(params.keys()).forEach(k => {
      if (k.startsWith('s_')) params.delete(k);
    });
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }, [searchParams, pathname]);

  const updateStrategyParam = useCallback((key: string, value: any) => {
    setStrategyParams(prev => ({ ...prev, [key]: value }));
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set(`s_${key}`, value.toString());
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }, [searchParams, pathname]);

  const bulkUpdateStrategyParams = useCallback((newParams: Record<string, any>) => {
    setStrategyParams(prev => ({ ...prev, ...newParams }));
    const params = new URLSearchParams(searchParams?.toString() || '');
    Object.entries(newParams).forEach(([key, value]) => {
      params.set(`s_${key}`, value.toString());
    });
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }, [searchParams, pathname]);

  const updateGlobalParam = useCallback((key: string, value: string) => {
    if (key === 'strategyStart') setStrategyStartDate(value);
    if (key === 'strategyEnd') setStrategyEndDate(value);

    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }, [searchParams, pathname]);

  const chartKey = [
    symbol,
    timeframe,
    activeChartData.length,
    activeChartData[0]?.time ?? 'none',
    activeChartData[activeChartData.length - 1]?.time ?? 'none',
  ].join(':');

  const [metrics, setMetrics] = useState<Record<string, string> | null>(null);
  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden h-full">
      <ChartWidget
        key={chartKey}
        data={activeChartData}
        symbol={symbol}
        timeframe={timeframe}
        watchlist={watchlist}
        selectedStrategy={selectedStrategy}
        setSelectedStrategy={handleStrategyChange}
        strategyParams={strategyParams}
        strategyStartDate={strategyStartDate}
        strategyEndDate={strategyEndDate}
        setStrategyStartDate={(val) => updateGlobalParam('strategyStart', val)}
        setStrategyEndDate={(val) => updateGlobalParam('strategyEnd', val)}
        activeIndicators={activeIndicators}
        onToggleIndicator={handleToggleIndicator}
        onUpdateStrategyParam={updateStrategyParam}
        bulkUpdateStrategyParams={bulkUpdateStrategyParams}
        showSignals={true}
        onMetricsChange={setMetrics}
        metrics={metrics}
        companyName={companyName}
        logoUrl={logoUrl}
        tickerPositions={tickerPositions}
        currentPrice={currentPrice}
        brokerageAccounts={brokerageAccounts}
      />
    </div>
  );
}
