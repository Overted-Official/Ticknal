import { IndicatorDefinition, IndicatorResult, IndicatorLine } from '../index';
import { ChartData } from '@/components/platform/ChartWidget';
import { SeriesMarker, Time } from 'lightweight-charts';

/**
 * Even Better Sinewave (EBS) Oscillator & Reversal Detector
 * Developed by John F. Ehlers ("Cycle Analytics for Traders", Wiley 2014).
 * Employs a 2-pole High-Pass Filter combined with a 2-pole SuperSmoother filter
 * and RMS power normalization to identify cycle turning points with near-zero lag.
 */
export const evenBetterSinewaveIndicator: IndicatorDefinition = {
  id: 'evenBetterSinewave',
  name: 'Even Better Sinewave (EBS)',
  description: 'Ehlers DSP 2-pole high-pass & SuperSmoother filter with normalized amplitude, predicting cyclic market turning points with near-zero phase lag.',
  options: [
    {
      id: 'showMarkers',
      name: 'Cycle Turning Point Markers',
      description: 'Mark early cycle reversals at extreme normalized wave amplitudes',
      defaultActive: true,
    },
    {
      id: 'showCycleProjection',
      name: 'Cycle Wave Price Projection',
      description: 'Project the instantaneous cycle phase directly onto the price chart',
      defaultActive: true,
    },
  ],
  compute: (bars: ChartData[], optionsState?: Record<string, boolean>): IndicatorResult => {
    const HP_PERIOD = 40;
    if (!bars || bars.length < HP_PERIOD + 10) {
      return { lines: [], markers: [] };
    }

    const showMarkers = optionsState?.['showMarkers'] ?? true;
    const showCycleProjection = optionsState?.['showCycleProjection'] ?? true;

    // 1. High-Pass Filter Coefficients (2-pole Butterworth high-pass)
    const angle = (0.707 * 2 * Math.PI) / HP_PERIOD;
    const alpha1 = (Math.cos(angle) + Math.sin(angle) - 1) / Math.cos(angle);
    const c1HP = Math.pow(1 - alpha1 / 2, 2);
    const c2HP = 2 * (1 - alpha1);
    const c3HP = -Math.pow(1 - alpha1, 2);

    // 2. SuperSmoother Coefficients (2-pole Butterworth low-pass, cutoff = 10 bars)
    const LP_PERIOD = 10;
    const a1SS = Math.exp((-Math.SQRT2 * Math.PI) / LP_PERIOD);
    const b1SS = 2 * a1SS * Math.cos((Math.SQRT2 * Math.PI) / LP_PERIOD);
    const c2SS = b1SS;
    const c3SS = -a1SS * a1SS;
    const c1SS = 1 - c2SS - c3SS;

    const hp: number[] = new Array(bars.length).fill(0);
    const filt: number[] = new Array(bars.length).fill(0);
    const wave: number[] = new Array(bars.length).fill(0);

    // Warm up filters
    for (let i = 2; i < bars.length; i++) {
      const p0 = (bars[i].high + bars[i].low) / 2;
      const p1 = (bars[i - 1].high + bars[i - 1].low) / 2;
      const p2 = (bars[i - 2].high + bars[i - 2].low) / 2;

      hp[i] = c1HP * (p0 - 2 * p1 + p2) + c2HP * hp[i - 1] + c3HP * hp[i - 2];
      filt[i] = c1SS * ((hp[i] + hp[i - 1]) / 2) + c2SS * filt[i - 1] + c3SS * filt[i - 2];
    }

    // 3. RMS Power Normalization over rolling window
    const RMS_LEN = 40;
    for (let i = RMS_LEN; i < bars.length; i++) {
      let sumSq = 0;
      for (let k = 0; k < RMS_LEN; k++) {
        sumSq += filt[i - k] * filt[i - k];
      }
      const rms = Math.sqrt(sumSq / RMS_LEN);
      const normalizedWave = rms > 0.00001 ? filt[i] / rms : 0;
      // Bounded wave between -1.0 and +1.0
      wave[i] = Math.max(-1.0, Math.min(1.0, normalizedWave));
    }

    // 4. Calculate True Range for baseline price projection
    const tr: number[] = new Array(bars.length).fill(0);
    for (let i = 1; i < bars.length; i++) {
      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      tr[i] = Math.max(hl, hc, lc);
    }

    const markers: SeriesMarker<Time>[] = [];
    const projectionLine: { time: Time; value: number }[] = [];

    // Rolling 20-bar baseline for price projection
    let runningSum = 0;
    const BASE_LEN = 20;

    for (let i = 0; i < bars.length; i++) {
      runningSum += bars[i].close;
      if (i >= BASE_LEN) {
        runningSum -= bars[i - BASE_LEN].close;
      }

      if (i >= HP_PERIOD) {
        const baseline = runningSum / Math.min(i + 1, BASE_LEN);
        let atrSum = 0;
        for (let k = 0; k < 14; k++) {
          atrSum += tr[i - k] || 0;
        }
        const atr = atrSum / 14 || 1;

        // Project cycle wave onto chart scale
        const projectedPrice = baseline + wave[i] * (atr * 1.5);

        if (showCycleProjection) {
          projectionLine.push({
            time: bars[i].time as Time,
            value: Number(projectedPrice.toFixed(2)),
          });
        }

        // 5. Generate Reversal Markers
        if (showMarkers && i >= HP_PERIOD + 2) {
          const curr = wave[i];
          const prev = wave[i - 1];
          const older = wave[i - 2];

          // Bullish cycle valley inflection (turning up from oversold <= -0.75)
          const isBullishValley = prev <= -0.75 && curr > prev && prev <= older;
          // Zero-line cross upward
          const isZeroCrossUp = prev < 0 && curr >= 0;

          if (isBullishValley || isZeroCrossUp) {
            markers.push({
              time: bars[i].time as Time,
              position: 'belowBar',
              color: '#089981',
              shape: 'circle',
              size: 1,
              text: isBullishValley ? 'EBS Bottom' : 'EBS Cycle Up',
            });
          }

          // Bearish cycle peak inflection (turning down from overbought >= 0.75)
          const isBearishPeak = prev >= 0.75 && curr < prev && prev >= older;
          // Zero-line cross downward
          const isZeroCrossDown = prev > 0 && curr <= 0;

          if (isBearishPeak || isZeroCrossDown) {
            markers.push({
              time: bars[i].time as Time,
              position: 'aboveBar',
              color: '#f23645',
              shape: 'circle',
              size: 1,
              text: isBearishPeak ? 'EBS Peak' : 'EBS Cycle Down',
            });
          }
        }
      }
    }

    const lines: IndicatorLine[] = [];
    if (showCycleProjection && projectionLine.length > 0) {
      lines.push({
        id: 'ebs-projection',
        name: 'EBS Cycle Wave',
        color: '#ff9800', // Amber/orange cycle color
        lineWidth: 2,
        lineStyle: 0,
        data: projectionLine,
      });
    }

    return {
      lines,
      markers,
    };
  },
};
