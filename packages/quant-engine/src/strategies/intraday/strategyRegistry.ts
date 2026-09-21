/**
 * Strategy-Agnostic Intraday Bot Strategy Registry
 * Allows dynamic registration and switching of algorithmic trading models.
 */

export interface StrategyDefinition {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  category: 'MEAN_REVERSION' | 'MOMENTUM' | 'HYBRID' | 'BREAKOUT';
  icon: string;
  status: 'ACTIVE' | 'BETA' | 'COMING_SOON';
  supportedTimeframes: string[];
  parameterFields: Array<{
    key: string;
    label: string;
    type: 'levels' | 'number' | 'boolean' | 'select';
    defaultValue: any;
    description: string;
  }>;
}

export const STRATEGY_REGISTRY: Record<string, StrategyDefinition> = {
  PSI_PURE: {
    id: 'PSI_PURE',
    name: 'PSI Pure Intraday Engine',
    shortName: 'PSI Pure',
    tagline: 'Multi-Level Institutional Index with AYM Take-Profit & ATR Trail',
    description:
      'Our benchmark 8-indicator proprietary index that identifies institutional turning points. Fires precise entries on Fibonacci levels with dynamic median-move profit targets and trailing profit protection.',
    category: 'MEAN_REVERSION',
    icon: 'Zap',
    status: 'ACTIVE',
    supportedTimeframes: ['5m', '15m', '1h', '1d'],
    parameterFields: [
      {
        key: 'entryLevels',
        label: 'Entry Trigger Levels',
        type: 'levels',
        defaultValue: [50.0, 61.8],
        description: 'PSI Master Index upward crossing thresholds (14.6, 23.6, 38.2, 50.0, 61.8)',
      },
      {
        key: 'aymMultiplier',
        label: 'AYM Target Multiplier',
        type: 'number',
        defaultValue: 4.0,
        description: 'Multiplier of 14-period Median Bar Move applied to entry price',
      },
      {
        key: 'aymLimit',
        label: 'AYM Exit Limit',
        type: 'number',
        defaultValue: 50.0,
        description: 'Upper ceiling threshold on adjusted index to validate take-profit',
      },
      {
        key: 'atrDistance',
        label: 'ATR Trailing Stop Distance',
        type: 'number',
        defaultValue: 6.0,
        description: 'Trailing stop floor distance below highest price reached',
      },
    ],
  },

  PSI_HYBRID: {
    id: 'PSI_HYBRID',
    name: 'PSI Hybrid Trend Engine',
    shortName: 'PSI Hybrid',
    tagline: 'PSI Entry Engine + 200 EMA & Volume Trend Confirmation',
    description:
      'Enhances the core PSI signal by enforcing macro trend alignment and volume expansion filters before dispatching orders.',
    category: 'HYBRID',
    icon: 'Layers',
    status: 'BETA',
    supportedTimeframes: ['15m', '1h', '1d'],
    parameterFields: [
      {
        key: 'entryLevels',
        label: 'Entry Trigger Levels',
        type: 'levels',
        defaultValue: [23.6, 38.2],
        description: 'PSI Master Index trigger levels',
      },
      {
        key: 'trendEmaPeriod',
        label: 'Trend EMA Lookback',
        type: 'number',
        defaultValue: 200,
        description: 'Only enter when price is above this EMA',
      },
    ],
  },

  MOMENTUM_BREAKOUT: {
    id: 'MOMENTUM_BREAKOUT',
    name: 'Dynamic Volatility Breakout',
    shortName: 'Volatility Breakout',
    tagline: 'Supertrend + Keltner Expansion Breakout',
    description:
      'Captures rapid intraday momentum thrusts during morning market openings with ATR expansion filters.',
    category: 'MOMENTUM',
    icon: 'TrendingUp',
    status: 'COMING_SOON',
    supportedTimeframes: ['5m', '15m'],
    parameterFields: [
      {
        key: 'atrFactor',
        label: 'Supertrend Factor',
        type: 'number',
        defaultValue: 3.0,
        description: 'ATR volatility multiplier',
      },
    ],
  },
};

export function getStrategyDefinition(strategyId: string): StrategyDefinition {
  return STRATEGY_REGISTRY[strategyId] || STRATEGY_REGISTRY['PSI_PURE'];
}

export function getAllStrategies(): StrategyDefinition[] {
  return Object.values(STRATEGY_REGISTRY);
}
