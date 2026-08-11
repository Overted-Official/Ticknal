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
      />
      <SignalPanel
        activeSymbol={symbol}
        replayActive={replayState.active}
        replayStartDate={replayState.startDate}
        replayEndDate={replayState.endDate}
      />
    </>
  );
}
