import { IndicatorDefinition, IndicatorResult, IndicatorLine } from '../index';
import { ChartData } from '@/components/platform/ChartWidget';
import { SeriesMarker, Time } from 'lightweight-charts';

/**
 * Permutation Entropy (PE) Complexity & Regime Filter
 * Based on Bandt & Pompe (Physical Review Letters 2002).
 * Maps ordinal patterns of consecutive price sequences into normalized
 * Shannon Entropy (h in [0, 1]) to isolate structural institutional trends from random noise.
 */
export const permutationEntropyIndicator: IndicatorDefinition = {
  id: 'permutationEntropy',
  name: 'Permutation Entropy (PE)',
  description: 'Information-theoretic complexity metric (Bandt-Pompe) quantifying market order vs random walk noise to isolate institutional trend regimes.',
  options: [
    {
      id: 'showMarkers',
      name: 'Trend Inception Markers',
      description: 'Highlight transitions from high-entropy noise to low-entropy structural trend',
      defaultActive: true,
    },
    {
      id: 'showChannel',
      name: 'Entropy Adaptive Channel',
      description: 'Volatility envelope that contracts during order and expands during noise',
      defaultActive: true,
    },
  ],
  compute: (bars: ChartData[], optionsState?: Record<string, boolean>): IndicatorResult => {
    const W = 20; // Rolling evaluation window
    const m = 3;  // Embedding dimension (3! = 6 patterns)
    if (!bars || bars.length < W + m + 5) {
      return { lines: [], markers: [] };
    }

    const showMarkers = optionsState?.['showMarkers'] ?? true;
    const showChannel = optionsState?.['showChannel'] ?? true;

    const ln6 = Math.log(6);

    // Function to map 3 values to permutation index 0..5
    const getPermutationIndex = (a: number, b: number, c: number): number => {
      if (a <= b && b <= c) return 0; // Monotonic Up
      if (a <= c && c < b) return 1;
      if (b < a && a <= c) return 2;
      if (c < a && a <= b) return 3;
      if (b <= c && c < a) return 4;
      return 5;                       // Monotonic Down
    };

    // Calculate ATR for channel scaling
    const atr: number[] = new Array(bars.length).fill(0);
    for (let i = 1; i < bars.length; i++) {
      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      atr[i] = Math.max(hl, hc, lc);
    }

    // 20-period EMA baseline
    const ema: number[] = new Array(bars.length).fill(0);
    const k = 2 / (20 + 1);
    ema[0] = bars[0].close;
    for (let i = 1; i < bars.length; i++) {
      ema[i] = bars[i].close * k + ema[i - 1] * (1 - k);
    }

    const entropyValues: number[] = new Array(bars.length).fill(1.0);
    const upperChannel: { time: Time; value: number }[] = [];
    const lowerChannel: { time: Time; value: number }[] = [];
    const markers: SeriesMarker<Time>[] = [];

    for (let i = W; i < bars.length; i++) {
      const counts = [0, 0, 0, 0, 0, 0];
      const totalPatterns = W - m + 1;

      for (let j = i - totalPatterns + 1; j <= i; j++) {
        const p0 = bars[j - 2].close;
        const p1 = bars[j - 1].close;
        const p2 = bars[j].close;
        const idx = getPermutationIndex(p0, p1, p2);
        counts[idx]++;
      }

      // Compute Shannon Entropy
      let entropy = 0;
      for (let c = 0; c < 6; c++) {
        if (counts[c] > 0) {
          const p = counts[c] / totalPatterns;
          entropy -= p * Math.log(p);
        }
      }

      // Normalized Entropy h in [0, 1]
      const h = Math.max(0, Math.min(1.0, entropy / ln6));
      entropyValues[i] = h;

      // Average true range over 14 bars
      let atrSum = 0;
      for (let t = 0; t < 14; t++) {
        atrSum += atr[i - t] || 0;
      }
      const currentAtr = atrSum / 14 || 1;

      const timeVal = bars[i].time as Time;

      // Channel width modulates with entropy: tight when structured, wide when noisy
      const bandOffset = (0.8 + h * 1.2) * currentAtr;
      if (showChannel) {
        upperChannel.push({
          time: timeVal,
          value: Number((ema[i] + bandOffset).toFixed(2)),
        });
        lowerChannel.push({
          time: timeVal,
          value: Number((ema[i] - bandOffset).toFixed(2)),
        });
      }

      // 3. Regime Inception Signals: Entropy drops below 0.68 from high noise
      if (showMarkers && i >= W + 2) {
        const prevH = entropyValues[i - 1];
        const olderH = entropyValues[i - 2];

        const isCollapsingEntropy = h < 0.68 && (prevH >= 0.68 || olderH >= 0.75);

        if (isCollapsingEntropy) {
          if (bars[i].close > ema[i]) {
            markers.push({
              time: timeVal,
              position: 'belowBar',
              color: '#089981',
              shape: 'arrowUp',
              size: 1,
              text: 'Low Entropy Trend +',
            });
          } else {
            markers.push({
              time: timeVal,
              position: 'aboveBar',
              color: '#f23645',
              shape: 'arrowDown',
              size: 1,
              text: 'Low Entropy Trend -',
            });
          }
        }
      }
    }

    const lines: IndicatorLine[] = [];

    if (showChannel && upperChannel.length > 0) {
      lines.push({
        id: 'pe-upper',
        name: 'PE Regime Upper',
        color: '#9c27b0', // Purple channel boundary
        lineWidth: 1,
        lineStyle: 2, // Dashed
        data: upperChannel,
      });
      lines.push({
        id: 'pe-lower',
        name: 'PE Regime Lower',
        color: '#9c27b0',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        data: lowerChannel,
      });
    }

    return {
      lines,
      markers,
    };
  },
};
