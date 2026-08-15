import { SeriesMarker, Time } from 'lightweight-charts';
import { ChartData } from '@/components/platform/ChartWidget';
import { swingMapperIndicator } from './swing-mapper';

export interface IndicatorResult {
  markers?: SeriesMarker<Time>[];
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  description: string;
  compute: (data: ChartData[]) => IndicatorResult;
}

// Registry of all available indicators
export const INDICATORS: Record<string, IndicatorDefinition> = {
  [swingMapperIndicator.id]: swingMapperIndicator,
};

export const getAvailableIndicators = () => Object.values(INDICATORS);
