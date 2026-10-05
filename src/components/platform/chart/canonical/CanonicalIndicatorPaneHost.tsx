'use client';

import type { IChartApi, ISeriesApi } from 'lightweight-charts';

import type { CanonicalIndicatorViewState } from '@/indicators/canonical/types';
import CanonicalIndicatorPane from './CanonicalIndicatorPane';
import type { CanonicalPaneModel } from './surface-model';

interface CanonicalIndicatorPaneHostProps {
  readonly panes: readonly CanonicalPaneModel[];
  readonly states: Readonly<Record<string, CanonicalIndicatorViewState>>;
  readonly locale: 'en' | 'ar';
  readonly mainChart: IChartApi | null;
  readonly mainSeries: ISeriesApi<any> | null;
  readonly mainValueAtTime: (time: string) => number | null;
  readonly collapsed: ReadonlySet<string>;
  readonly heights: Readonly<Record<string, number>>;
  readonly onToggleCollapse: (instanceId: string) => void;
  readonly onHeightChange: (instanceId: string, height: number) => void;
  readonly onMove: (instanceId: string, direction: -1 | 1) => void;
  readonly onResetParameters: (instanceId: string) => void;
  readonly onClose: (instanceId: string) => void;
}

export default function CanonicalIndicatorPaneHost(props: CanonicalIndicatorPaneHostProps) {
  if (props.panes.length === 0) return null;
  return (
    <div className="w-full bg-black">
      {props.panes.map((pane) => (
        <CanonicalIndicatorPane
          key={pane.instanceId}
          pane={pane}
          state={props.states[pane.instanceId]}
          locale={props.locale}
          mainChart={props.mainChart}
          mainSeries={props.mainSeries}
          mainValueAtTime={props.mainValueAtTime}
          collapsed={props.collapsed.has(pane.instanceId)}
          height={props.heights[pane.instanceId] ?? 160}
          onToggleCollapse={() => props.onToggleCollapse(pane.instanceId)}
          onHeightChange={(height) => props.onHeightChange(pane.instanceId, height)}
          onMoveUp={() => props.onMove(pane.instanceId, -1)}
          onMoveDown={() => props.onMove(pane.instanceId, 1)}
          onResetParameters={() => props.onResetParameters(pane.instanceId)}
          onClose={() => props.onClose(pane.instanceId)}
        />
      ))}
    </div>
  );
}
