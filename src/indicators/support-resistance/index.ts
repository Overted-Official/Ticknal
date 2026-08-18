import { IndicatorDefinition, IndicatorResult, IndicatorLine } from '../index';
import { ChartData } from '@/components/platform/ChartWidget';
import { SeriesMarker, Time } from 'lightweight-charts';
import { extractSwingPoints } from './swings';
import {
  calculateDynamicStepChannels,
  calculateClusteredZones,
  calculateTrendlineChannels,
} from './calculator';
import { SROptionsState } from './types';

export const supportResistanceIndicator: IndicatorDefinition = {
  id: 'supportResistance',
  name: 'Support & Resistance',
  description: 'Adaptive support and resistance channels with step envelopes, clustered zones, and trendlines.',
  options: [
    {
      id: 'step',
      name: 'Dynamic Step Channels',
      description: 'Adaptive Swing High/Low step envelopes with midline',
      defaultActive: true,
    },
    {
      id: 'zones',
      name: 'Clustered S/R Zones',
      description: 'Multi-touch historical key price density bands',
      defaultActive: true,
    },
    {
      id: 'trend',
      name: 'Trendline Channels',
      description: 'Consecutive swing slope boundary channels',
      defaultActive: true,
    },
  ],
  compute: (bars: ChartData[], optionsState?: Record<string, boolean>): IndicatorResult => {
    if (bars.length < 2) return { lines: [], markers: [] };

    // Default option states if not specified
    const isStepActive = optionsState?.['step'] ?? true;
    const isZonesActive = optionsState?.['zones'] ?? true;
    const isTrendActive = optionsState?.['trend'] ?? true;

    const { swings, threshold } = extractSwingPoints(bars);

    let allLines: IndicatorLine[] = [];
    let allMarkers: SeriesMarker<Time>[] = [];

    // 1. Dynamic Step Channels
    if (isStepActive) {
      const stepRes = calculateDynamicStepChannels(bars, threshold);
      allLines = [...allLines, ...stepRes.lines];
      allMarkers = [...allMarkers, ...stepRes.markers];
    }

    // 2. Clustered S/R Zones
    if (isZonesActive) {
      const zonesRes = calculateClusteredZones(bars, swings, threshold);
      allLines = [...allLines, ...zonesRes.lines];
    }

    // 3. Trendline Channels
    if (isTrendActive) {
      const trendRes = calculateTrendlineChannels(bars, swings);
      allLines = [...allLines, ...trendRes.lines];
    }

    return {
      lines: allLines,
      markers: allMarkers,
    };
  },
};
