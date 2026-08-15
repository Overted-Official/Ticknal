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

export interface StrategyDefinition {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  settings: StrategySettingDef[];
  metrics: StrategyMetricDef[];
}

export const STRATEGIES: Record<string, StrategyDefinition> = {
  psi: {
    id: 'psi',
    label: 'PSI Strategy',
    description: 'Proprietary System Indicator',
    settings: [], // PSI has no configurable settings on the frontend right now
    metrics: [
      { key: 'masterIndex', label: 'Master Index', format: 'number', decimals: 2 },
      { key: 'medianDailyMove', label: 'MDM', format: 'percentage', decimals: 2 },
    ]
  },
  quantum_exhaustion: {
    id: 'quantum_exhaustion',
    label: 'Quantum Exhaustion (QE)',
    settings: [
      { key: 'buyThreshold', label: 'BUY Threshold', type: 'range', default: 75, min: 50, max: 99, step: 1 },
      { key: 'sellThreshold', label: 'SELL Threshold', type: 'range', default: 75, min: 50, max: 99, step: 1 },
    ],
    metrics: [] // Add metrics if QE exposes any specific ones in the signal data
  },
  quantum_exhaustion_v2: {
    id: 'quantum_exhaustion_v2',
    label: 'Quantum Exhaustion v2 (Research Gate)',
    disabled: true,
    settings: [],
    metrics: []
  }
};

export const getAvailableStrategies = () => Object.values(STRATEGIES);
