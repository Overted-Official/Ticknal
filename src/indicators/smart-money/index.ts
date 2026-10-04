import { IndicatorDefinition, IndicatorResult } from '../index';
import { ChartData } from '@/components/platform/chart/types';
import { computeSmartMoneyFlow } from './calculator';

export const smartMoneyIndicator: IndicatorDefinition = {
  id: 'smartMoneyFlow',
  name: 'Smart Money Flow (ATS & Absorption)',
  description:
    'Exposes institutional order concentration and Wyckoff volume absorption. Columns plot Average Trade Size (ATS) colored by absorption state, paired with transaction frequency to reveal smart money accumulation vs. retail churn.',
  options: [
    {
      id: 'showMarkers',
      name: 'Show Signals on Candlestick Chart',
      description: 'Overlay Smart Buy and Distribution arrows directly on the price chart',
      defaultActive: false,
    },
  ],
  compute: (bars: ChartData[], optionsState?: Record<string, boolean>): IndicatorResult => {
    const showMarkers = optionsState?.['showMarkers'] ?? false;
    const { markers } = computeSmartMoneyFlow(bars, { showMarkers });
    return {
      markers,
      lines: [], // The primary visual representation renders in its synchronized sub-panel
    };
  },
};

export { computeSmartMoneyFlow } from './calculator';
export type { SmartMoneyPoint, SmartMoneyCalculationResult, SmartMoneyOptions } from './calculator';
