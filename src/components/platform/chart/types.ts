import type { SeriesMarker, Time } from 'lightweight-charts';
import type { WatchlistItem } from '@/components/platform/RightSidebar';
import type { TickerOrder } from '@/components/platform/TickerPositions';

export interface ChartData {
  time: string | number; // "YYYY-MM-DD" or numeric epoch seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategySignal {
  date: string;
  signal: string;
  price?: number;
  entryReason?: string;
  exitReason?: string;
}

export type StrategyLevelsResponse = {
  targetPrice: number | null;
  stopPrice: number | null;
  targetLabel: string | null;
  stopLabel: string | null;
};

export type ChartOrder = {
  id: number;
  tickerSymbol: string;
  status: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  targetPrice: number | null;
  stopPrice: number | null;
  currentPrice: number;
  profitLoss: number;
  profitLossPct: number;
};

export type OrderDraft = {
  date: string;
  entryPrice: string;
  quantity: string;
  targetPrice: string;
  stopPrice: string;
  targetLabel: string | null;
  stopLabel: string | null;
  x: number;
  y: number;
  loadingLevels: boolean;
};

export type OrderOverlay = {
  id: number;
  order: ChartOrder;
  left: number;
  width: number;
  entryTop: number;
  targetTop: number | null;
  stopTop: number | null;
  currentTop: number | null;
  profitBoxTop: number | null;
  profitBoxHeight: number;
  stopBoxTop: number | null;
  stopBoxHeight: number;
  isProfit: boolean;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  marketValue: number;
  profitLoss: number;
  profitLossPct: number;
};

export type ReplayState = {
  active: boolean;
  startDate: string | number | null;
  endDate: string | number | null;
};

export interface ChartWidgetProps {
  data: ChartData[];
  symbol: string;
  timeframe?: string;
  initialReplayMode?: boolean;
  onReplayStateChange?: (state: ReplayState) => void;
  selectedStrategy?: string;
  strategyParams?: Record<string, any>;
  strategyStartDate?: string;
  strategyEndDate?: string;
  setStrategyStartDate?: (d: string) => void;
  setStrategyEndDate?: (d: string) => void;
  activeIndicators?: string[];
  onToggleIndicator?: (id: string) => void;
  onUpdateStrategyParam?: (key: string, val: any) => void;
  watchlist?: WatchlistItem[];
  showSignals?: boolean;
  onMetricsChange?: (metrics: Record<string, string> | null) => void;
  tickerPositions?: TickerOrder[];
  currentPrice?: number;
}

export const PLAYBACK_SPEEDS = [
  { label: '1x', delay: 900 },
  { label: '2x', delay: 450 },
  { label: '4x', delay: 180 },
] as const;
