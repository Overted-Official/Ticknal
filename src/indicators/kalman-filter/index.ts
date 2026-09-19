import { IndicatorDefinition, IndicatorResult, IndicatorLine } from '../index';
import { ChartData } from '@/components/platform/ChartWidget';
import { SeriesMarker, Time } from 'lightweight-charts';

/**
 * Kalman Filter Adaptive Velocity & Innovation Shock Channel
 * Formulates market price dynamics as a continuous 2D state-space model:
 * [Level, Velocity]. Estimates unobserved fair value, latent drift,
 * and tracks normalized innovation shocks (Z-score) to detect institutional breaks.
 */
export const kalmanFilterIndicator: IndicatorDefinition = {
  id: 'kalmanFilter',
  name: 'Kalman Adaptive Velocity',
  description: 'Recursive state-space filter estimating unobserved price level, latent velocity, and innovation Z-score shocks with optimal noise rejection.',
  options: [
    {
      id: 'showMean',
      name: 'Kalman Mean Line',
      description: 'Optimal recursive state estimation of fair value',
      defaultActive: true,
    },
    {
      id: 'showBands',
      name: 'Innovation Shock Bands (±2σ)',
      description: 'Dynamic volatility envelope based on measurement innovation variance',
      defaultActive: true,
    },
    {
      id: 'showShocks',
      name: 'Liquidity Shock Markers',
      description: 'Flag statistically significant innovation spikes (|Z| > 2.0)',
      defaultActive: true,
    },
  ],
  compute: (bars: ChartData[], optionsState?: Record<string, boolean>): IndicatorResult => {
    if (!bars || bars.length < 5) {
      return { lines: [], markers: [] };
    }

    const showMean = optionsState?.['showMean'] ?? true;
    const showBands = optionsState?.['showBands'] ?? true;
    const showShocks = optionsState?.['showShocks'] ?? true;

    // State estimates: [mu, v]
    let mu = bars[0].close;
    let v = 0;

    // Error covariance P (2x2 matrix)
    let p00 = 1.0;
    let p01 = 0.0;
    let p10 = 0.0;
    let p11 = 1.0;

    // Process noise covariance Q
    const q00 = 0.001;
    const q01 = 0.001;
    const q10 = 0.001;
    const q11 = 0.005;

    const meanLine: { time: Time; value: number }[] = [];
    const upperLine: { time: Time; value: number }[] = [];
    const lowerLine: { time: Time; value: number }[] = [];
    const markers: SeriesMarker<Time>[] = [];

    // Precompute rolling volatility to adapt measurement noise R
    for (let i = 0; i < bars.length; i++) {
      const price = bars[i].close;

      // 1. Predict Step
      const muPrior = mu + v;
      const vPrior = v;

      const p00Prior = p00 + p01 + p10 + p11 + q00;
      const p01Prior = p01 + p11 + q01;
      const p10Prior = p10 + p11 + q10;
      const p11Prior = p11 + q11;

      // Dynamic measurement variance R (estimated from bar range)
      const barRange = bars[i].high - bars[i].low;
      const R = Math.max(0.01, Math.pow(barRange, 2) * 0.25);

      // 2. Innovation Step
      const innovation = price - muPrior;
      const S = p00Prior + R; // Innovation variance

      // 3. Kalman Gain
      const k0 = p00Prior / S;
      const k1 = p10Prior / S;

      // 4. Update Step
      mu = muPrior + k0 * innovation;
      v = vPrior + k1 * innovation;

      p00 = (1 - k0) * p00Prior;
      p01 = (1 - k0) * p01Prior;
      p10 = p10Prior - k1 * p00Prior;
      p11 = p11Prior - k1 * p01Prior;

      // Innovation Z-Score
      const sigma = Math.sqrt(Math.max(0.0001, S));
      const zScore = innovation / sigma;

      const timeVal = bars[i].time as Time;

      if (showMean) {
        meanLine.push({
          time: timeVal,
          value: Number(mu.toFixed(2)),
        });
      }

      if (showBands) {
        upperLine.push({
          time: timeVal,
          value: Number((mu + 2 * sigma).toFixed(2)),
        });
        lowerLine.push({
          time: timeVal,
          value: Number((mu - 2 * sigma).toFixed(2)),
        });
      }

      // 5. Liquidity Shock Signals (|Z| >= 2.0)
      if (showShocks && i >= 10) {
        if (zScore >= 2.0) {
          markers.push({
            time: timeVal,
            position: 'belowBar',
            color: '#089981',
            shape: 'arrowUp',
            size: 1,
            text: 'Kalman Shock +',
          });
        } else if (zScore <= -2.0) {
          markers.push({
            time: timeVal,
            position: 'aboveBar',
            color: '#f23645',
            shape: 'arrowDown',
            size: 1,
            text: 'Kalman Shock -',
          });
        }
      }
    }

    const lines: IndicatorLine[] = [];

    if (showMean && meanLine.length > 0) {
      lines.push({
        id: 'kalman-mean',
        name: 'Kalman Mean',
        color: '#00bcd4', // Cyan / sky blue
        lineWidth: 2,
        lineStyle: 0,
        data: meanLine,
      });
    }

    if (showBands && upperLine.length > 0) {
      lines.push({
        id: 'kalman-upper',
        name: 'Kalman +2σ Shock',
        color: '#089981',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        data: upperLine,
      });
      lines.push({
        id: 'kalman-lower',
        name: 'Kalman -2σ Shock',
        color: '#f23645',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        data: lowerLine,
      });
    }

    return {
      lines,
      markers,
    };
  },
};
