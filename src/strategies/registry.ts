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
    label: 'Typhon Strategy',
    shortName: 'TYPHON',
    description: 'Primordial Cyclical & Mean-Reversion Engine (Master Index & MDM)',
    badgeClassName: 'bg-[#2962ff]/15 text-[#2962ff] border-[#2962ff]/30',
    settings: [],
    metrics: [
      { key: 'masterIndex', label: 'Master Index', format: 'number', decimals: 2 },
      { key: 'medianDailyMove', label: 'MDM', format: 'percentage', decimals: 2 },
    ],
  },
  psi_v2: {
    id: 'psi_v2',
    label: 'Cerberus Strategy',
    shortName: 'CERBERUS',
    description: '3-Headed Stateful Swing & Regime Engine (ZONE, UP, DOWN)',
    badgeClassName: 'bg-[#089981]/15 text-[#089981] border-[#089981]/30',
    settings: [],
    metrics: [
      { key: 'psiZone', label: 'PSI Zone', format: 'number', decimals: 2 },
      { key: 'psiUp', label: 'PSI UP', format: 'number', decimals: 2 },
      { key: 'psiDown', label: 'PSI DOWN', format: 'number', decimals: 2 },
      { key: 'regimeDirection', label: 'Regime', format: 'text' },
    ],
  },
  hydra: {
    id: 'hydra',
    label: 'Hydra Strategy',
    shortName: 'HYDRA',
    description: 'Adaptive Volatility Synchronizer & Swing Regime Engine (>92% Swings Caught)',
    badgeClassName: 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30',
    settings: [],
    metrics: [
      { key: 'hydraState', label: 'State', format: 'number', decimals: 0 },
      { key: 'continuousVal', label: 'Regime Value', format: 'number', decimals: 1 },
      { key: 'volatilityTheta', label: 'Dynamic Theta', format: 'percentage', decimals: 2 },
    ],
  },
};

export const getAvailableStrategies = () => Object.values(STRATEGIES);

export function getStrategyBadge(strategyId: string = 'psi'): { label: string; className: string } {
  const strat = STRATEGIES[strategyId] || STRATEGIES['psi'];
  if (!strat) {
    return {
      label: 'Archived',
      className: 'bg-[#18181b] text-[#787b86] border-[#27272a]',
    };
  }
  return {
    label: strat.shortName || strat.label,
    className: strat.badgeClassName || 'bg-[#18181b] text-white border-[#27272a]',
  };
}
