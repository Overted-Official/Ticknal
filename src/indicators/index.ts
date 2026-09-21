import { SeriesMarker, Time } from 'lightweight-charts';
import { ChartData } from '@/components/platform/ChartWidget';
import { swingMapperIndicator } from './swing-mapper';
import { supportResistanceIndicator } from './support-resistance';
import { framaIndicator } from './frama';
import { evenBetterSinewaveIndicator } from './even-better-sinewave';
import { kalmanFilterIndicator } from './kalman-filter';
import { permutationEntropyIndicator } from './permutation-entropy';
import { hydraIndicator } from './hydra-index';

export interface IndicatorLine {
  id: string;
  name: string;
  color: string;
  lineWidth?: number;
  lineStyle?: number; // 0: Solid, 1: Dotted, 2: Dashed, 3: LargeDashed
  data: { time: Time; value: number }[];
}

export interface IndicatorOption {
  id: string;
  name: string;
  description?: string;
  defaultActive?: boolean;
}

export interface IndicatorResult {
  markers?: SeriesMarker<Time>[];
  lines?: IndicatorLine[];
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  description: string;
  options?: IndicatorOption[];
  compute: (data: ChartData[], optionsState?: Record<string, boolean>) => IndicatorResult;
}

// Registry of all available indicators
export const INDICATORS: Record<string, IndicatorDefinition> = {
  [hydraIndicator.id]: hydraIndicator,
  [framaIndicator.id]: framaIndicator,
  [evenBetterSinewaveIndicator.id]: evenBetterSinewaveIndicator,
  [kalmanFilterIndicator.id]: kalmanFilterIndicator,
  [permutationEntropyIndicator.id]: permutationEntropyIndicator,
  [supportResistanceIndicator.id]: supportResistanceIndicator,
  [swingMapperIndicator.id]: swingMapperIndicator,
};

export const getAvailableIndicators = () => Object.values(INDICATORS);
