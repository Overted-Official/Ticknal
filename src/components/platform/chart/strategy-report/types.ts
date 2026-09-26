import type { ChartData } from '../types';
import type { FullBacktestReport, EquityPoint } from '@/strategies/registry';

export type StrategyReportTab = 'performance' | 'trades';
export type BacktestPreset = '3m' | '6m' | 'ytd' | '1y' | 'all' | 'custom' | '2025';

export interface StrategyReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  timeframe?: string;
  selectedStrategy: string;
  setSelectedStrategy?: (strategy: string) => void;
  strategyParams?: Record<string, any>;
  updateStrategyParam?: (key: string, value: any) => void;
  bulkUpdateStrategyParams?: (newParams: Record<string, any>) => void;
  chartData?: ChartData[];
  strategyStartDate?: string;
  strategyEndDate?: string;
  setStrategyStartDate?: (d: string) => void;
  setStrategyEndDate?: (d: string) => void;
  metrics?: Record<string, string> | null;
  companyName?: string;
  logoUrl?: string | null;
  initialTab?: StrategyReportTab;
}

export interface ComputedReportMetrics {
  effectiveStrategyRoiPct: number;
  effectiveBnhRoiPct: number;
  effectiveAlphaPct: number;
  effectiveWinRate: number;
  effectiveAvgTradeReturnPct: number;
  effectiveAvgBars: string;
  effectiveMaxDd: number;
  computedMaxMae: string;
  currencySymbol: string;
}

export type { FullBacktestReport, EquityPoint, ChartData };
