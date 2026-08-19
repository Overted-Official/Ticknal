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
  key: string; // The key in the signalData response
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
  favorableExcursion: number;
  adverseExcursion: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
  buyHoldEquity: number;
  drawdown: number;
  tradePnl?: number;
  tradeReturnPct?: number;
}

export interface StrategyKeyStats {
  initialCapital: number;
  finalEquity: number;
  netProfit: number;
  netProfitPct: number;
  buyHoldReturn: number;
  buyHoldReturnPct: number;
  alphaMargin: number;
  maxDrawdown: number;
  maxDrawdownAmount: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  grossProfit: number;
  grossLoss: number;
  avgTradePnl: number;
  avgTradeReturnPct: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgBarsHeld: number;
  annualCagr: number;
  sharpeRatio: number;
  startDate: string;
  endDate: string;
}

export interface FullBacktestReport {
  trades: StrategyTrade[];
  equityCurve: EquityPoint[];
  stats: StrategyKeyStats;
  signals: any[];
}

export interface StrategyDefinition {
  id: string;
  label: string;
  shortName: string;
  description?: string;
  disabled?: boolean;
  badgeClassName: string;
  settings: StrategySettingDef[];
  metrics: StrategyMetricDef[];
}

export const STRATEGIES: Record<string, StrategyDefinition> = {
  psi: {
    id: 'psi',
    label: 'PSI Strategy',
    shortName: 'PSI',
    description: 'Proprietary System Indicator',
    badgeClassName: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
    settings: [], // PSI has no configurable settings on the frontend right now
    metrics: [
      { key: 'masterIndex', label: 'Master Index', format: 'number', decimals: 2 },
      { key: 'medianDailyMove', label: 'MDM', format: 'percentage', decimals: 2 },
    ]
  },
  thoth_egx_macro: {
    id: 'thoth_egx_macro',
    label: 'Thoth EGX Macro',
    shortName: 'THOTH',
    description: 'Deep Learning Swing Trading Transformer for EGX Daily Timeframe',
    badgeClassName: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    settings: [
      { key: 'buyThreshold', label: 'Buy Exhaustion %', type: 'number', default: 35, min: 10, max: 90, step: 5 },
      { key: 'sellThreshold', label: 'Sell Exhaustion %', type: 'number', default: 85, min: 50, max: 95, step: 5 },
      { key: 'minNetProfit', label: 'Strict No-Loss Min Net %', type: 'number', default: 0.0, min: 0.0, max: 5.0, step: 0.25 },
      { key: 'requireGreen', label: 'Require Green Candle', type: 'boolean', default: false },
    ],
    metrics: [
      { key: 'masterIndex', label: 'Master Index', format: 'number', decimals: 2 },
      { key: 'masterIndexAdjusted', label: 'Pred Exhaustion', format: 'percentage', decimals: 1 },
    ]
  }
};

export const getAvailableStrategies = () => Object.values(STRATEGIES);

export function getStrategyBadge(strategyId: string = 'psi'): { label: string; className: string } {
  const strat = STRATEGIES[strategyId] || STRATEGIES['psi'];
  return {
    label: strat.shortName || strat.label,
    className: strat.badgeClassName || 'bg-white/[0.08] text-white border-white/[0.15]',
  };
}

