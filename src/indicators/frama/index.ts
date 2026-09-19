import { IndicatorDefinition, IndicatorResult, IndicatorLine } from '../index';
import { ChartData } from '@/components/platform/ChartWidget';
import { SeriesMarker, Time } from 'lightweight-charts';

/**
 * Fractal Adaptive Moving Average (FRAMA)
 * Developed by John Ehlers (TASC 2000).
 * Dynamically adjusts smoothing based on instantaneous Fractal Dimension (D).
 * Forms horizontal support/resistance during consolidation (D -> 2.0)
 * and hugs price with near-zero lag during strong trends (D -> 1.0).
 */
export const framaIndicator: IndicatorDefinition = {
  id: 'frama',
  name: 'Fractal Adaptive MA (FRAMA)',
  description: 'Ehlers Fractal Adaptive Moving Average dynamically adjusting speed based on fractal dimension (D), with flat support/resistance levels in chop and fast trend adherence.',
  options: [
    {
      id: 'showLine',
      name: 'FRAMA Adaptive Line',
      description: 'Render the non-linear fractal adaptive curve',
      defaultActive: true,
    },
    {
      id: 'showMarkers',
      name: 'Fractal Breakout Signals',
      description: 'Mark bullish/bearish breakouts when price escapes consolidation zones',
      defaultActive: true,
    },
  ],
  compute: (bars: ChartData[], optionsState?: Record<string, boolean>): IndicatorResult => {
    const N = 16; // Standard lookback window (even integer)
    if (!bars || bars.length < N + 2) {
      return { lines: [], markers: [] };
    }

    const showLine = optionsState?.['showLine'] ?? true;
    const showMarkers = optionsState?.['showMarkers'] ?? true;

    const halfN = Math.floor(N / 2);
    const ln2 = Math.log(2);

    const framaValues: { time: Time; value: number }[] = [];
    const markers: SeriesMarker<Time>[] = [];

    // Initialize first FRAMA value
    let prevFrama = bars[N - 1].close;
    framaValues.push({
      time: bars[N - 1].time as Time,
      value: Number(prevFrama.toFixed(2)),
    });

    for (let i = N; i < bars.length; i++) {
      // 1. Sub-window 1: older half [i - N + 1 ... i - halfN]
      let h1 = -Infinity;
      let l1 = Infinity;
      for (let j = i - N + 1; j <= i - halfN; j++) {
        if (bars[j].high > h1) h1 = bars[j].high;
        if (bars[j].low < l1) l1 = bars[j].low;
      }
      const n1 = (h1 - l1) / halfN;

      // 2. Sub-window 2: recent half [i - halfN + 1 ... i]
      let h2 = -Infinity;
      let l2 = Infinity;
      for (let j = i - halfN + 1; j <= i; j++) {
        if (bars[j].high > h2) h2 = bars[j].high;
        if (bars[j].low < l2) l2 = bars[j].low;
      }
      const n2 = (h2 - l2) / halfN;

      // 3. Full window: [i - N + 1 ... i]
      let h3 = -Infinity;
      let l3 = Infinity;
      for (let j = i - N + 1; j <= i; j++) {
        if (bars[j].high > h3) h3 = bars[j].high;
        if (bars[j].low < l3) l3 = bars[j].low;
      }
      const n3 = (h3 - l3) / N;

      // 4. Calculate Fractal Dimension (D)
      let d = 1.0;
      if (n1 + n2 > 0 && n3 > 0) {
        d = (Math.log(n1 + n2) - Math.log(n3)) / ln2;
      }

      // Clamp dimension between 1.0 (smooth trend) and 2.0 (chaotic noise)
      if (d < 1.0) d = 1.0;
      if (d > 2.0) d = 2.0;

      // 5. Exponential smoothing factor alpha
      let alpha = Math.exp(-4.6 * (d - 1.0));
      if (alpha < 0.01) alpha = 0.01;
      if (alpha > 1.0) alpha = 1.0;

      // 6. Filter step
      const currentPrice = bars[i].close;
      const currentFrama = alpha * currentPrice + (1.0 - alpha) * prevFrama;
      prevFrama = currentFrama;

      framaValues.push({
        time: bars[i].time as Time,
        value: Number(currentFrama.toFixed(2)),
      });

      // 7. Breakout signals
      if (showMarkers && i >= N + 3) {
        const prevBar = bars[i - 1];
        const prevFramaVal = framaValues[framaValues.length - 2]?.value ?? currentFrama;
        const olderFramaVal = framaValues[framaValues.length - 4]?.value ?? currentFrama;

        // Check if FRAMA was relatively flat (consolidation phase)
        const isFlat = Math.abs(prevFramaVal - olderFramaVal) / (olderFramaVal || 1) < 0.005;

        // Bullish Breakout above flat FRAMA
        if (isFlat && prevBar.close <= prevFramaVal && currentPrice > currentFrama) {
          markers.push({
            time: bars[i].time as Time,
            position: 'belowBar',
            color: '#089981',
            shape: 'arrowUp',
            size: 1,
            text: 'FRAMA Breakout',
          });
        }
        // Bearish Breakdown below flat FRAMA
        else if (isFlat && prevBar.close >= prevFramaVal && currentPrice < currentFrama) {
          markers.push({
            time: bars[i].time as Time,
            position: 'aboveBar',
            color: '#f23645',
            shape: 'arrowDown',
            size: 1,
            text: 'FRAMA Breakdown',
          });
        }
      }
    }

    const lines: IndicatorLine[] = [];
    if (showLine) {
      lines.push({
        id: 'frama-line',
        name: 'FRAMA',
        color: '#2962ff', // TradingView electric blue
        lineWidth: 2,
        data: framaValues,
      });
    }

    return {
      lines,
      markers,
    };
  },
};
