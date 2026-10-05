'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import ChartWidget, { type ChartData } from '@/components/platform/ChartWidget';
import { STRATEGIES } from '@/strategies/registry';
import { tickerDataStore } from '@/lib/storage/tickerDataStore';
import { prefetchWatchlist } from '@/lib/client-price-cache';

import { WatchlistItem } from '@/components/platform/RightSidebar';
import { TickerOrder } from '@/components/platform/TickerPositions';
import type { BrokerageAccountOption } from '@/components/platform/AddOrderModal';
import { PROGRAM_MANIFEST } from '@ticknal/quant-engine/canonical';
import {
  createIndicatorSelection,
  parseIndicatorQuery,
  removeIndicatorSelection,
  reorderIndicatorSelection,
  updateIndicatorSelection,
  writeIndicatorQuery,
} from '@/indicators/canonical/selection-state';
import type { CanonicalIndicatorSelection } from '@/indicators/canonical/types';
import type { CanonicalIndicatorSelectionPatch } from '@/components/platform/chart/types';

interface ChartWorkspaceProps {
  data: ChartData[];
  symbol: string;
  watchlist?: WatchlistItem[];
  tickerPositions?: TickerOrder[];
  currentPrice?: number;
  brokerageAccounts?: BrokerageAccountOption[];
  companyName?: string;
  logoUrl?: string | null;
  currency?: string;
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
  currency,
}: ChartWorkspaceProps) {

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selectableCanonicalIds = useMemo(() => new Set(
    PROGRAM_MANIFEST.filter((entry) => entry.state === 'integrated' && entry.canonicalId)
      .map((entry) => entry.canonicalId!),
  ), []);
  const initialIndicatorState = useMemo(() => parseIndicatorQuery(
    new URLSearchParams(searchParams?.toString() ?? ''),
    selectableCanonicalIds,
  ), [searchParams, selectableCanonicalIds]);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(() => [...initialIndicatorState.legacyIds]);
  const [activeCanonicalIndicators, setActiveCanonicalIndicators] = useState<readonly CanonicalIndicatorSelection[]>(
    () => initialIndicatorState.selections,
  );

  const persistIndicators = useCallback((
    canonicalSelections: readonly CanonicalIndicatorSelection[],
    legacyIds: readonly string[],
  ) => {
    const params = writeIndicatorQuery(
      new URLSearchParams(window.location.search),
      canonicalSelections,
      legacyIds,
    );
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }, [pathname]);

  const handleToggleIndicator = useCallback((id: string) => {
    setActiveIndicators((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      persistIndicators(activeCanonicalIndicators, next);
      return next;
    });
  }, [activeCanonicalIndicators, persistIndicators]);

  const handleAddCanonicalIndicator = useCallback((definitionId: string) => {
    setActiveCanonicalIndicators((current) => {
      const next = [...current, createIndicatorSelection(definitionId, current, selectableCanonicalIds)];
      persistIndicators(next, activeIndicators);
      return next;
    });
  }, [activeIndicators, persistIndicators, selectableCanonicalIds]);

  const handleUpdateCanonicalIndicator = useCallback((instanceId: string, patch: CanonicalIndicatorSelectionPatch) => {
    setActiveCanonicalIndicators((current) => {
      try {
        const next = updateIndicatorSelection(current, instanceId, patch, selectableCanonicalIds);
        persistIndicators(next, activeIndicators);
        return next;
      } catch {
        return current;
      }
    });
  }, [activeIndicators, persistIndicators, selectableCanonicalIds]);

  const handleRemoveCanonicalIndicator = useCallback((instanceId: string) => {
    setActiveCanonicalIndicators((current) => {
      const next = removeIndicatorSelection(current, instanceId);
      persistIndicators(next, activeIndicators);
      return next;
    });
  }, [activeIndicators, persistIndicators]);

  const handleReorderCanonicalIndicator = useCallback((instanceId: string, direction: -1 | 1) => {
    setActiveCanonicalIndicators((current) => {
      const index = current.findIndex((selection) => selection.instanceId === instanceId);
      if (index < 0) return current;
      const next = reorderIndicatorSelection(current, instanceId, index + direction);
      persistIndicators(next, activeIndicators);
      return next;
    });
  }, [activeIndicators, persistIndicators]);

  const requestedStrategy = searchParams?.get('strategy');
  const initialStrategy = requestedStrategy && STRATEGIES[requestedStrategy]
    ? requestedStrategy
    : 'psi';
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
  const normalizedRawTimeframe = rawTf.trim().toUpperCase();
  const canonicalTimeframe = normalizedRawTimeframe === '60' ? '1H' : normalizedRawTimeframe;

  // A strategy supplied by a notification (or a user-selected URL) always
  // wins. With no explicit strategy, resolve the ticker's best-fit model by
  // alpha so the chart opens on the same algorithm that can generate its
  // notification.
  useEffect(() => {
    if (requestedStrategy && STRATEGIES[requestedStrategy]) return;

    let cancelled = false;
    const controller = new AbortController();

    const resolveChampion = async () => {
      try {
        const params = new URLSearchParams({
          symbol,
          timeframe,
          start: '2025-01-01',
        });
        const response = await fetch(`/api/strategy-champion?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const champion = await response.json() as { strategy?: string };
        const strategy = champion.strategy;
        if (cancelled || !strategy || !STRATEGIES[strategy]) return;

        setSelectedStrategy(strategy);
        const definition = STRATEGIES[strategy];
        const defaults: Record<string, any> = {};
        definition.settings.forEach((setting) => {
          defaults[setting.key] = setting.default;
        });
        setStrategyParams(defaults);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.warn('Could not resolve the ticker strategy champion:', error);
        }
      }
    };

    resolveChampion();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [requestedStrategy, symbol, timeframe]);

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
        canonicalTimeframe={canonicalTimeframe}
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
        activeCanonicalIndicators={activeCanonicalIndicators}
        onAddCanonicalIndicator={handleAddCanonicalIndicator}
        onUpdateCanonicalIndicator={handleUpdateCanonicalIndicator}
        onRemoveCanonicalIndicator={handleRemoveCanonicalIndicator}
        onReorderCanonicalIndicator={handleReorderCanonicalIndicator}
        onUpdateStrategyParam={updateStrategyParam}
        bulkUpdateStrategyParams={bulkUpdateStrategyParams}
        showSignals={true}
        onMetricsChange={setMetrics}
        metrics={metrics}
        companyName={companyName}
        logoUrl={logoUrl}
        currency={currency}
        tickerPositions={tickerPositions}
        currentPrice={currentPrice}
        brokerageAccounts={brokerageAccounts}
      />
    </div>
  );
}
