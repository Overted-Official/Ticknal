import { SeriesMarker, Time } from 'lightweight-charts';
import { ChartData } from '@/components/platform/ChartWidget';
import { swingMapperIndicator } from './swing-mapper';
import { supportResistanceIndicator } from './support-resistance';

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
  [swingMapperIndicator.id]: swingMapperIndicator,
  [supportResistanceIndicator.id]: supportResistanceIndicator,
};

export const getAvailableIndicators = () => Object.values(INDICATORS);
