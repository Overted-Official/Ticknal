import {
  BACKTEST_GROUPS,
  BACKTEST_ROWS,
  type BacktestGranularity,
  type BacktestGroupItem,
  type BacktestRow,
} from './strategy-builder-fixtures';

export type BacktestMode = 'all' | 'custom' | 'holdout';
export type BacktestPhase = 'primary' | 'unseen';

export interface MockBacktestKpis {
  readonly strategyReturn: number;
  readonly alpha: number;
  readonly benchmarkReturn: number;
  readonly winRate: number;
  readonly maxDrawdown: number;
  readonly totalTrades: number;
}

export interface MockBacktestPreview {
  readonly kpis: MockBacktestKpis;
  readonly rows: readonly BacktestRow[];
  readonly groups: readonly BacktestGroupItem[];
}

type StaticSnapshotKey = 'all' | 'custom' | 'holdoutBuild' | 'holdoutUnseen';

const STATIC_KPI_SNAPSHOTS: Readonly<Record<string, Readonly<Record<StaticSnapshotKey, MockBacktestKpis>>>> = {
  psi: {
    all: { strategyReturn: 18.4, alpha: 7.1, benchmarkReturn: 11.3, winRate: 61.8, maxDrawdown: -8.6, totalTrades: 144 },
    custom: { strategyReturn: 14, alpha: 5.4, benchmarkReturn: 8.6, winRate: 61.8, maxDrawdown: -7.5, totalTrades: 109 },
    holdoutBuild: { strategyReturn: 10.5, alpha: 4, benchmarkReturn: 6.5, winRate: 61.8, maxDrawdown: -6.5, totalTrades: 82 },
    holdoutUnseen: { strategyReturn: 5.7, alpha: 2.2, benchmarkReturn: 3.5, winRate: 61.8, maxDrawdown: -4.8, totalTrades: 45 },
  },
  psi_v2: {
    all: { strategyReturn: 21.7, alpha: 10.4, benchmarkReturn: 11.3, winRate: 64.2, maxDrawdown: -10.1, totalTrades: 131 },
    custom: { strategyReturn: 16.5, alpha: 7.9, benchmarkReturn: 8.6, winRate: 64.2, maxDrawdown: -8.8, totalTrades: 100 },
    holdoutBuild: { strategyReturn: 12.4, alpha: 5.9, benchmarkReturn: 6.5, winRate: 64.2, maxDrawdown: -7.6, totalTrades: 75 },
    holdoutUnseen: { strategyReturn: 6.7, alpha: 3.2, benchmarkReturn: 3.5, winRate: 64.2, maxDrawdown: -5.6, totalTrades: 41 },
  },
  hydra: {
    all: { strategyReturn: 24.9, alpha: 13.6, benchmarkReturn: 11.3, winRate: 66.7, maxDrawdown: -7.4, totalTrades: 119 },
    custom: { strategyReturn: 18.9, alpha: 10.3, benchmarkReturn: 8.6, winRate: 66.7, maxDrawdown: -6.5, totalTrades: 90 },
    holdoutBuild: { strategyReturn: 14.2, alpha: 7.7, benchmarkReturn: 6.5, winRate: 66.7, maxDrawdown: -5.6, totalTrades: 68 },
    holdoutUnseen: { strategyReturn: 7.7, alpha: 4.2, benchmarkReturn: 3.5, winRate: 66.7, maxDrawdown: -4.1, totalTrades: 37 },
  },
  'custom-draft': {
    all: { strategyReturn: 12.8, alpha: 1.5, benchmarkReturn: 11.3, winRate: 55.4, maxDrawdown: -11.8, totalTrades: 102 },
    custom: { strategyReturn: 9.7, alpha: 1.1, benchmarkReturn: 8.6, winRate: 55.4, maxDrawdown: -10.3, totalTrades: 78 },
    holdoutBuild: { strategyReturn: 7.3, alpha: 0.8, benchmarkReturn: 6.5, winRate: 55.4, maxDrawdown: -8.9, totalTrades: 58 },
    holdoutUnseen: { strategyReturn: 4, alpha: 0.5, benchmarkReturn: 3.5, winRate: 55.4, maxDrawdown: -6.6, totalTrades: 32 },
  },
};

export function getMockBacktestPreview(
  strategyId: string,
  mode: BacktestMode,
  granularity: BacktestGranularity,
  hasRules: boolean,
  phase: BacktestPhase,
): MockBacktestPreview | null {
  if (strategyId === 'custom-draft' && !hasRules) return null;

  const snapshots = STATIC_KPI_SNAPSHOTS[strategyId] ?? STATIC_KPI_SNAPSHOTS.psi!;
  const snapshotKey: StaticSnapshotKey = mode === 'holdout'
    ? (phase === 'unseen' ? 'holdoutUnseen' : 'holdoutBuild')
    : mode;

  return {
    kpis: snapshots[snapshotKey],
    rows: BACKTEST_ROWS[granularity],
    groups: BACKTEST_GROUPS,
  };
}
