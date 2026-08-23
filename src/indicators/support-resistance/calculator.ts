import { ChartData } from '@/components/platform/ChartWidget';
import { Time, SeriesMarker } from 'lightweight-charts';
import { IndicatorLine } from '../index';
import { SwingPoint, PriceCluster, SROptionsState } from './types';
import { extractSwingPoints } from './swings';

/**
 * 1. Dynamic Rolling Step Channels (Adaptive Swing High/Low Step Envelopes)
 */
export function calculateDynamicStepChannels(
  bars: ChartData[],
  threshold: number
): { lines: IndicatorLine[]; markers: SeriesMarker<Time>[] } {
  if (bars.length < 2) return { lines: [], markers: [] };

  const resData: { time: Time; value: number }[] = [];
  const supData: { time: Time; value: number }[] = [];
  const midData: { time: Time; value: number }[] = [];
  const markers: SeriesMarker<Time>[] = [];

  let state = 1; // 1 = looking for high, -1 = looking for low
  let extremumIndex = 0;
  let extremumPrice = bars[0].close;

  let activeResistance: number = bars[0].high;
  let activeSupport: number = bars[0].low;

  for (let i = 0; i < bars.length; i++) {
    const currentBar = bars[i];
    const price = currentBar.close;

    if (i > 0) {
      if (state === 1) {
        if (price > extremumPrice) {
          extremumPrice = price;
          extremumIndex = i;
        } else if (price < extremumPrice * (1.0 - threshold)) {
          // Confirmed High at extremumIndex
          activeResistance = bars[extremumIndex].high ?? extremumPrice;
          state = -1;
          extremumIndex = i;
          extremumPrice = price;
        }
      } else {
        if (price < extremumPrice) {
          extremumPrice = price;
          extremumIndex = i;
        } else if (price > extremumPrice * (1.0 + threshold)) {
          // Confirmed Low at extremumIndex
          activeSupport = bars[extremumIndex].low ?? extremumPrice;
          state = 1;
          extremumIndex = i;
          extremumPrice = price;
        }
      }
    }

    const mid = (activeResistance + activeSupport) / 2;

    resData.push({ time: currentBar.time as Time, value: Number(activeResistance.toFixed(4)) });
    supData.push({ time: currentBar.time as Time, value: Number(activeSupport.toFixed(4)) });
    midData.push({ time: currentBar.time as Time, value: Number(mid.toFixed(4)) });
  }

  const lines: IndicatorLine[] = [
    {
      id: 'sr-step-res',
      name: 'Step Resistance',
      color: 'var(--plt-risk)',
      lineWidth: 2,
      lineStyle: 0, // Solid
      data: resData,
    },
    {
      id: 'sr-step-sup',
      name: 'Step Support',
      color: 'var(--plt-profit)',
      lineWidth: 2,
      lineStyle: 0, // Solid
      data: supData,
    },
    {
      id: 'sr-step-mid',
      name: 'Step Midline',
      color: 'var(--plt-violet)',
      lineWidth: 1,
      lineStyle: 1, // Dotted
      data: midData,
    },
  ];

  return { lines, markers };
}

/**
 * 2. Clustered S/R Zones (Multi-Touch Historical Price Density)
 */
export function calculateClusteredZones(
  bars: ChartData[],
  swings: SwingPoint[],
  threshold: number
): { lines: IndicatorLine[] } {
  if (bars.length < 2 || swings.length < 2) return { lines: [] };

  // Calculate average price to set clustering tolerance band
  const avgPrice = bars.reduce((acc, b) => acc + b.close, 0) / bars.length;
  const clusterTolerance = Math.max(avgPrice * (threshold * 0.4), avgPrice * 0.015);

  const clusters: PriceCluster[] = [];

  // Group swings into price clusters
  for (const swing of swings) {
    let matchedCluster = clusters.find(
      (c) => Math.abs(c.centerPrice - swing.price) <= clusterTolerance
    );

    if (matchedCluster) {
      matchedCluster.swings.push(swing);
      matchedCluster.touchCount++;
      matchedCluster.minPrice = Math.min(matchedCluster.minPrice, swing.price);
      matchedCluster.maxPrice = Math.max(matchedCluster.maxPrice, swing.price);
      matchedCluster.firstIndex = Math.min(matchedCluster.firstIndex, swing.index);
      matchedCluster.lastIndex = Math.max(matchedCluster.lastIndex, swing.index);
      matchedCluster.firstTime = bars[matchedCluster.firstIndex].time as Time;
      matchedCluster.lastTime = bars[matchedCluster.lastIndex].time as Time;
      // Update weighted center
      matchedCluster.centerPrice =
        matchedCluster.swings.reduce((sum, s) => sum + s.price, 0) / matchedCluster.swings.length;
    } else {
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        type: swing.type === 'high' ? 'resistance' : 'support',
        centerPrice: swing.price,
        minPrice: swing.price,
        maxPrice: swing.price,
        touchCount: 1,
        firstIndex: swing.index,
        firstTime: swing.time,
        lastIndex: swing.index,
        lastTime: swing.time,
        swings: [swing],
      });
    }
  }

  // Filter significant clusters with >= 2 touches (or highest touches if few)
  const multiTouchClusters = clusters.filter((c) => c.touchCount >= 2);
  const selectedClusters = (multiTouchClusters.length >= 2 ? multiTouchClusters : clusters)
    .sort((a, b) => b.touchCount - a.touchCount)
    .slice(0, 4); // Keep top 4 key price zones

  const currentPrice = bars[bars.length - 1].close;
  const lines: IndicatorLine[] = [];

  selectedClusters.forEach((cluster, idx) => {
    const isAboveCurrent = cluster.centerPrice >= currentPrice;
    const isResistance = isAboveCurrent || cluster.swings.filter((s) => s.type === 'high').length > cluster.swings.length / 2;
    const color = isResistance ? 'var(--plt-risk)' : 'var(--plt-profit)';

    // Draw horizontal line spanning from first swing touch to the latest candle
    const lineData: { time: Time; value: number }[] = [];
    const startIndex = Math.max(0, cluster.firstIndex);
    for (let i = startIndex; i < bars.length; i++) {
      lineData.push({
        time: bars[i].time as Time,
        value: Number(cluster.centerPrice.toFixed(4)),
      });
    }

    if (lineData.length > 0) {
      lines.push({
        id: `sr-zone-${idx + 1}`,
        name: `${isResistance ? 'Key Resistance' : 'Key Support'} (${cluster.touchCount}x @ ${cluster.centerPrice.toFixed(2)})`,
        color,
        lineWidth: 2,
        lineStyle: 2, // Dashed
        data: lineData,
      });
    }
  });

  return { lines };
}

/**
 * 3. Trendline Channels (Consecutive Swing Slope Boundary Channels)
 */
export function calculateTrendlineChannels(
  bars: ChartData[],
  swings: SwingPoint[]
): { lines: IndicatorLine[] } {
  if (bars.length < 2) return { lines: [] };

  const highSwings = swings.filter((s) => s.type === 'high').sort((a, b) => a.index - b.index);
  const lowSwings = swings.filter((s) => s.type === 'low').sort((a, b) => a.index - b.index);

  const upperData: { time: Time; value: number }[] = [];
  const lowerData: { time: Time; value: number }[] = [];

  // 1. Build Upper Trendline (connecting consecutive swing highs)
  if (highSwings.length >= 2) {
    const firstHigh = highSwings[0];

    // Backfill from bar 0 to first swing high with first high price
    for (let i = 0; i < firstHigh.index; i++) {
      upperData.push({
        time: bars[i].time as Time,
        value: Number(firstHigh.price.toFixed(4)),
      });
    }

    // Connect consecutive swing highs
    for (let k = 0; k < highSwings.length - 1; k++) {
      const h1 = highSwings[k];
      const h2 = highSwings[k + 1];
      const span = h2.index - h1.index;
      const slope = span > 0 ? (h2.price - h1.price) / span : 0;

      for (let i = h1.index; i < h2.index; i++) {
        const val = h1.price + slope * (i - h1.index);
        upperData.push({
          time: bars[i].time as Time,
          value: Number(val.toFixed(4)),
        });
      }
    }

    // Project latest slope from last swing high to the end of bars
    const lastHigh = highSwings[highSwings.length - 1];
    const prevHigh = highSwings[highSwings.length - 2];
    const lastSpan = lastHigh.index - prevHigh.index;
    const lastSlope = lastSpan > 0 ? (lastHigh.price - prevHigh.price) / lastSpan : 0;

    for (let i = lastHigh.index; i < bars.length; i++) {
      const val = lastHigh.price + lastSlope * (i - lastHigh.index);
      upperData.push({
        time: bars[i].time as Time,
        value: Number(val.toFixed(4)),
      });
    }
  }

  // 2. Build Lower Trendline (connecting consecutive swing lows)
  if (lowSwings.length >= 2) {
    const firstLow = lowSwings[0];

    // Backfill from bar 0 to first swing low with first low price
    for (let i = 0; i < firstLow.index; i++) {
      lowerData.push({
        time: bars[i].time as Time,
        value: Number(firstLow.price.toFixed(4)),
      });
    }

    // Connect consecutive swing lows
    for (let k = 0; k < lowSwings.length - 1; k++) {
      const l1 = lowSwings[k];
      const l2 = lowSwings[k + 1];
      const span = l2.index - l1.index;
      const slope = span > 0 ? (l2.price - l1.price) / span : 0;

      for (let i = l1.index; i < l2.index; i++) {
        const val = l1.price + slope * (i - l1.index);
        lowerData.push({
          time: bars[i].time as Time,
          value: Number(val.toFixed(4)),
        });
      }
    }

    // Project latest slope from last swing low to the end of bars
    const lastLow = lowSwings[lowSwings.length - 1];
    const prevLow = lowSwings[lowSwings.length - 2];
    const lastSpan = lastLow.index - prevLow.index;
    const lastSlope = lastSpan > 0 ? (lastLow.price - prevLow.price) / lastSpan : 0;

    for (let i = lastLow.index; i < bars.length; i++) {
      const val = lastLow.price + lastSlope * (i - lastLow.index);
      lowerData.push({
        time: bars[i].time as Time,
        value: Number(val.toFixed(4)),
      });
    }
  }

  const lines: IndicatorLine[] = [];

  if (upperData.length > 0) {
    lines.push({
      id: 'sr-trend-res',
      name: 'Upper Channel Trendline',
      color: 'var(--plt-warning)',
      lineWidth: 2,
      lineStyle: 0, // Solid
      data: upperData,
    });
  }

  if (lowerData.length > 0) {
    lines.push({
      id: 'sr-trend-sup',
      name: 'Lower Channel Trendline',
      color: 'var(--plt-info)',
      lineWidth: 2,
      lineStyle: 0, // Solid
      data: lowerData,
    });
  }

  return { lines };
}
