import { IndicatorDefinition, IndicatorResult } from '../index';
import { ChartData } from '@/components/platform/ChartWidget';
import { SeriesMarker, Time } from 'lightweight-charts';

function computeSwingThreshold(bars: ChartData[]): number {
  if (bars.length < 2) return 0.05;
  const magnitudes: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prevClose = bars[i - 1].close;
    if (prevClose === 0) continue;
    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - prevClose);
    const lc = Math.abs(bars[i].low - prevClose);
    const tr = Math.max(hl, hc, lc);
    magnitudes.push(tr / prevClose);
  }
  if (magnitudes.length === 0) return 0.05;
  magnitudes.sort((a, b) => a - b);
  const p75 = Math.floor(magnitudes.length * 0.75);
  return magnitudes[p75];
}

export const swingMapperIndicator: IndicatorDefinition = {
  id: 'swingMapper',
  name: 'Swing Mapper',
  description: 'Identifies swing highs and lows based on ATR threshold.',
  compute: (bars: ChartData[]): IndicatorResult => {
    if (bars.length < 2) return { markers: [] };
    const threshold = computeSwingThreshold(bars);

    const markers: SeriesMarker<Time>[] = [];

    let state = 1;
    let extremumIndex = 0;
    let extremumPrice = bars[0].close;

    for (let i = 1; i < bars.length; i++) {
      const price = bars[i].close;
      if (state === 1) {
        if (price > extremumPrice) {
          extremumPrice = price;
          extremumIndex = i;
        } else if (price < extremumPrice * (1.0 - threshold)) {
          // Found a High
          markers.push({
            time: bars[extremumIndex].time as Time,
            position: 'aboveBar',
            color: 'var(--plt-risk)',
            shape: 'circle',
            size: 1,
          });
          state = -1;
          extremumIndex = i;
          extremumPrice = price;
        }
      } else {
        if (price < extremumPrice) {
          extremumPrice = price;
          extremumIndex = i;
        } else if (price > extremumPrice * (1.0 + threshold)) {
          // Found a Low
          markers.push({
            time: bars[extremumIndex].time as Time,
            position: 'belowBar',
            color: 'var(--plt-profit)',
            shape: 'circle',
            size: 1,
          });
          state = 1;
          extremumIndex = i;
          extremumPrice = price;
        }
      }
    }

    return { markers };
  }
};
