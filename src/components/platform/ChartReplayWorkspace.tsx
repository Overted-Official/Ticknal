'use client';

import { useCallback, useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ChartWidget, { type ChartData, type ReplayState } from '@/components/platform/ChartWidget';
import SignalPanel from '@/components/platform/SignalPanel';
import { STRATEGIES } from '@/strategies/registry';

interface ChartReplayWorkspaceProps {
  data: ChartData[];
  symbol: string;
  initialReplayMode?: boolean;
}

const EMPTY_REPLAY_STATE: ReplayState = {
  active: false,
  startDate: null,
  endDate: null,
};

export default function ChartReplayWorkspace({
  data,
  symbol,
  initialReplayMode = false,
}: ChartReplayWorkspaceProps) {
  const [replayState, setReplayState] = useState<ReplayState>(
    initialReplayMode ? { ...EMPTY_REPLAY_STATE, active: true } : EMPTY_REPLAY_STATE,
  );
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeIndicators = searchParams?.get('indicators')?.split(',').filter(Boolean) || [];
  
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

  const [strategyStartDate, setStrategyStartDate] = useState<string>(searchParams?.get('strategyStart') || '2021-01-01');
  const [strategyEndDate, setStrategyEndDate] = useState<string>(searchParams?.get('strategyEnd') || '');

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
    
    // Sync to URL
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('strategy', newStrategy);
    Array.from(params.keys()).forEach(k => {
       if (k.startsWith('s_')) params.delete(k);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const updateStrategyParam = useCallback((key: string, value: any) => {
    setStrategyParams(prev => ({ ...prev, [key]: value }));
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set(`s_${key}`, value.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const bulkUpdateStrategyParams = useCallback((newParams: Record<string, any>) => {
    setStrategyParams(prev => ({ ...prev, ...newParams }));
    const params = new URLSearchParams(searchParams?.toString() || '');
    Object.entries(newParams).forEach(([key, value]) => {
      params.set(`s_${key}`, value.toString());
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const updateGlobalParam = useCallback((key: string, value: string) => {
    if (key === 'strategyStart') setStrategyStartDate(value);
    if (key === 'strategyEnd') setStrategyEndDate(value);
    
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const chartKey = [
    symbol,
    data.length,
    data[0]?.time ?? 'none',
    data[data.length - 1]?.time ?? 'none',
    initialReplayMode ? 'replay' : 'live',
  ].join(':');
  
  const handleReplayStateChange = useCallback((state: ReplayState) => {
    setReplayState(state);
  }, []);

  return (
    <>
      <ChartWidget
        key={chartKey}
        data={data}
        symbol={symbol}
        initialReplayMode={initialReplayMode}
        onReplayStateChange={handleReplayStateChange}
        selectedStrategy={selectedStrategy}
        strategyParams={strategyParams}
        strategyStartDate={strategyStartDate}
        strategyEndDate={strategyEndDate}
        setStrategyStartDate={(val) => updateGlobalParam('strategyStart', val)}
        setStrategyEndDate={(val) => updateGlobalParam('strategyEnd', val)}
        activeIndicators={activeIndicators}
      />
      <SignalPanel
        activeSymbol={symbol}
        replayActive={replayState.active}
        replayStartDate={replayState.startDate}
        replayEndDate={replayState.endDate}
        selectedStrategy={selectedStrategy}
        setSelectedStrategy={handleStrategyChange}
        strategyParams={strategyParams}
        updateStrategyParam={updateStrategyParam}
        bulkUpdateStrategyParams={bulkUpdateStrategyParams}
        chartData={data}
        strategyStartDate={strategyStartDate}
        strategyEndDate={strategyEndDate}
        setStrategyStartDate={(val) => updateGlobalParam('strategyStart', val)}
        setStrategyEndDate={(val) => updateGlobalParam('strategyEnd', val)}
      />
    </>
  );
}
