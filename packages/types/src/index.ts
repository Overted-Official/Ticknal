/**
 * @ticknal/types
 * Core shared data contracts and types for Ticknal ecosystem
 */

export interface ChartData {
  time: string | number; // "YYYY-MM-DD" or numeric epoch seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PriceBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

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

export type StrategySettingType = 'range' | 'number' | 'select' | 'boolean';

export interface StrategySettingDef {
  key: string;
  label: string;
  type: StrategySettingType;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: any; label: string }[];
}

export interface StrategyMetricDef {
  key: string;
  label: string;
  format?: 'number' | 'percentage' | 'currency' | 'text';
  decimals?: number;
}

export interface StrategyTrade {
  id: number;
  tradeNumber: number;
  type: "long";
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  shares: number;
  positionValue: number;
  netPnl: number;
  returnPct: number;
  exitReason: string;
  barsHeld: number;
  cumulativeEquity: number;
}

export interface FullBacktestReport {
  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRatePct: number;
    initialCapital: number;
    endingEquity: number;
    totalRoiPct: number;
    annualizedReturnPct: number;
    buyAndHoldRoiPct: number;
    alphaPct: number;
    profitFactor: number;
    maxDrawdownPct: number;
    maxDrawdownDays: number;
    avgTradeReturnPct: number;
    avgWinPct: number;
    avgLossPct: number;
    avgBarsHeld: number;
    sharpeRatio: number;
    calmarRatio: number;
  };
  trades: StrategyTrade[];
  equityCurve: {
    date: string;
    equity: number;
    drawdownPct: number;
    buyAndHoldEquity: number;
  }[];
}
