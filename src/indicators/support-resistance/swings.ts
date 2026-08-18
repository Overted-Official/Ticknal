import { ChartData } from '@/components/platform/ChartWidget';
import { Time } from 'lightweight-charts';
import { SwingPoint } from './types';

export function computeSwingThreshold(bars: ChartData[]): number {
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

export function extractSwingPoints(bars: ChartData[], thresholdOverride?: number): {
  swings: SwingPoint[];
  threshold: number;
} {
  if (bars.length < 2) return { swings: [], threshold: 0.05 };
  
  const threshold = thresholdOverride ?? computeSwingThreshold(bars);
  const swings: SwingPoint[] = [];

  let state = 1; // 1 = looking for high, -1 = looking for low
  let extremumIndex = 0;
  let extremumPrice = bars[0].close;

  for (let i = 1; i < bars.length; i++) {
    const price = bars[i].close;
    if (state === 1) {
      if (price > extremumPrice) {
        extremumPrice = price;
        extremumIndex = i;
      } else if (price < extremumPrice * (1.0 - threshold)) {
        // Confirmed High
        swings.push({
          index: extremumIndex,
          time: bars[extremumIndex].time as Time,
          price: bars[extremumIndex].high ?? extremumPrice,
          type: 'high',
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
        // Confirmed Low
        swings.push({
          index: extremumIndex,
          time: bars[extremumIndex].time as Time,
          price: bars[extremumIndex].low ?? extremumPrice,
          type: 'low',
        });
        state = 1;
        extremumIndex = i;
        extremumPrice = price;
      }
    }
  }

  return { swings, threshold };
}
