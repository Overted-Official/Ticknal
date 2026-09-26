import type { SectorPerformanceItem, SectorStrategySignalsResponse } from '@/lib/finance/sectors-math';

// ─── Timeframe ─────────────────────────────────────────────────────────────
export type StrategyTimeframe = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'custom';

// ─── Granularity (pill rail switcher) ───────────────────────────────────────
export type GroupBy = 'sector' | 'industryGroup' | 'industry';

// ─── Signal filter toolbar ───────────────────────────────────────────────────
export type SignalFilterType = 'ALL' | 'FRESH_BUYS' | 'WINNING' | 'TAILWIND_ONLY';
export type QuickFilter = 'all' | 'beating' | 'trailing' | 'active';

// ─── Per-ticker enriched row used by the breakdown section ──────────────────
export interface TickerAlphaItem {
  symbol: string;
  meta: {
    companyName: string;
    sector: string;
    industryGroup?: string | null;
    industry?: string | null;
    rotationRegime: string;
    logoUrl?: string | null;
    returnPct: number;
  } | undefined;
  group: string;
  price: number;
  sysRoi: number;
  bh: number;
  alpha: number;
  status: 'BUY_FRESH' | 'LONG_ACTIVE' | 'EXIT_RECENT' | 'FLAT';
  isOpen: boolean;
  isFresh: boolean;
  winRate: number;
  tradesCount: number;
  maxDrawdown: number;
  avgAdverseExcursion: number;
  avgBarsHeld: number;
  tradeReturnPct: number;
  // Position Activity fields
  lastSignalDate?: string;
  lastSignalType?: string;
  entryPrice?: number;
  barsHeld?: number;
  positionMae?: number;
}

// ─── Per-sector differential row used by the pill rail ──────────────────────
export interface SectorDifferentialItem {
  sector: string;
  stockCount: number;
  rotationRegime: string;
  strategyRoi: number;
  buyHoldRoi: number;
  alphaDelta: number;
  activePositionsCount: number;
  freshBuysCount: number;
}

// ─── Active open setup (used by toolbar filter counts) ──────────────────────
export interface ActiveSetup {
  symbol: string;
  companyName: string;
  sector: string;
  rotationRegime: string;
  logoUrl?: string | null;
  status: string;
  signalDate?: string;
  entryPrice?: number;
  currentPrice?: number;
  tradeReturnPct: number;
  buyHoldRoi: number;
  alphaVsBh: number;
  barsHeld: number;
  tailwindLevel: 'tailwind' | 'neutral' | 'headwind';
}

// ─── Simulation-wide KPI summary ────────────────────────────────────────────
export interface SimulationKPIs {
  stratRoi: number;
  bhRoi: number;
  alphaVsBh: number;
  alphaVsEgx: number;
  winRate: number;
  totalTrades: number;
  activeLongs: number;
  freshBuys: number;
  winningLongs: number;
}

// ─── Main section props ──────────────────────────────────────────────────────
export interface StrategySimulationSectionProps {
  sectors?: SectorPerformanceItem[];
  signalsData?: SectorStrategySignalsResponse;
  strategyMetrics?: Record<string, { roi: number; bhRoi: number; alpha: number }>;
  selectedStrategy: string;
  onSelectStrategy: (strat: string) => void;
  benchmarkReturn?: number;
  timeframePreset?: StrategyTimeframe;
  onTimeframeChange?: (tf: StrategyTimeframe) => void;
  customStartDate?: string;
  onCustomStartDateChange?: (val: string) => void;
  customEndDate?: string;
  onCustomEndDateChange?: (val: string) => void;
}
