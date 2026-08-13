'use client';

import { useCallback, useState } from 'react';
import ChartWidget, { type ChartData, type ReplayState } from '@/components/platform/ChartWidget';
import SignalPanel from '@/components/platform/SignalPanel';

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
  const [selectedStrategy, setSelectedStrategy] = useState('psi');
  const [buyThreshold, setBuyThreshold] = useState(75);
  const [sellThreshold, setSellThreshold] = useState(75);
  const [strategyStartDate, setStrategyStartDate] = useState<string>('2021-01-01');
  const [strategyEndDate, setStrategyEndDate] = useState<string>('');
  const chartKey = [
    symbol,
    data.length,
    data[0]?.time ?? 'none',
    data[data.length - 1]?.time ?? 'none',
    initialReplayMode ? 'replay' : 'live',
    selectedStrategy,
    buyThreshold,
    sellThreshold,
    strategyStartDate,
    strategyEndDate,
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
        buyThreshold={buyThreshold}
        sellThreshold={sellThreshold}
        strategyStartDate={strategyStartDate}
        strategyEndDate={strategyEndDate}
        setStrategyStartDate={setStrategyStartDate}
        setStrategyEndDate={setStrategyEndDate}
      />
      <SignalPanel
        activeSymbol={symbol}
        replayActive={replayState.active}
        replayStartDate={replayState.startDate}
        replayEndDate={replayState.endDate}
        selectedStrategy={selectedStrategy}
        setSelectedStrategy={setSelectedStrategy}
        buyThreshold={buyThreshold}
        setBuyThreshold={setBuyThreshold}
        sellThreshold={sellThreshold}
        setSellThreshold={setSellThreshold}
        strategyStartDate={strategyStartDate}
        strategyEndDate={strategyEndDate}
        setStrategyStartDate={setStrategyStartDate}
        setStrategyEndDate={setStrategyEndDate}
      />
    </>
  );
}
