import type { SeriesMarker, Time } from 'lightweight-charts';
import type { ChartData } from '@/components/platform/chart/types';

export interface SmartMoneyPoint {
  time: Time;
  turnover: number;
  ats: number;
  atsMa20: number;
  tradesCount: number;
  hasRealTrades: boolean;
  absorptionRatio: number;
  clv: number;
  state:
    | 'ACCUMULATION_HEAVY'
    | 'ACCUMULATION_MODERATE'
    | 'DISTRIBUTION_HEAVY'
    | 'DISTRIBUTION_MODERATE'
    | 'NEUTRAL';
  color: string;
  stateLabel: string;
}

export interface SmartMoneyCalculationResult {
  points: SmartMoneyPoint[];
  markers: SeriesMarker<Time>[];
  hasAnyRealTrades: boolean;
  summary: {
    latestATS: number;
    latestTrades: number;
    hasRealTrades: boolean;
    latestState: string;
    latestAbsorption: number;
    atsRatioVsMa20: number;
  };
}

export interface SmartMoneyOptions {
  showMarkers?: boolean;
}

/**
 * Computes the Smart Money Flow indicator (Average Trade Size & Wyckoff Volume Absorption).
 *
 * STRICT POLICY: ZERO MOCK DATA.
 * - Volume, Spread, Turnover, CLV, and Absorption Ratio are 100% real derived from authentic OHLCV.
 * - Number of Trades & ATS are ONLY populated when verified exchange trade counts exist.
 * - No synthetic, power-law, or fabricated trade numbers are generated.
 */
export function computeSmartMoneyFlow(
  bars: ChartData[],
  options?: SmartMoneyOptions
): SmartMoneyCalculationResult {
  if (!bars || bars.length === 0) {
    return {
      points: [],
      markers: [],
      hasAnyRealTrades: false,
      summary: {
        latestATS: 0,
        latestTrades: 0,
        hasRealTrades: false,
        latestState: 'NEUTRAL',
        latestAbsorption: 1,
        atsRatioVsMa20: 1,
      },
    };
  }

  const showMarkers = options?.showMarkers ?? true;
  const n = bars.length;
  const points: SmartMoneyPoint[] = [];
  const markers: SeriesMarker<Time>[] = [];

  const rawATS: number[] = new Array(n);
  const rawSpreads: number[] = new Array(n);
  const rawVolumes: number[] = new Array(n);
  const rawTrades: number[] = new Array(n);
  const hasTradesFlag: boolean[] = new Array(n);
  const rawCLV: number[] = new Array(n);

  let anyRealTradesFound = false;

  for (let i = 0; i < n; i++) {
    const b = bars[i];
    const high = Number(b.high);
    const low = Number(b.low);
    const close = Number(b.close);
    const volume = Number(b.volume || 0);

    const turnover = close * volume;
    const spread = Math.max(high - low, 0.0001);
    const clv = spread > 0 ? ((close - low) - (high - close)) / spread : 0;

    // Only read genuine, verified trade counts
    const verifiedTrades =
      b.trades !== undefined && b.trades !== null && Number(b.trades) > 0
        ? Number(b.trades)
        : 0;

    if (verifiedTrades > 0) {
      anyRealTradesFound = true;
      hasTradesFlag[i] = true;
      rawTrades[i] = verifiedTrades;
      rawATS[i] = turnover > 0 ? turnover / verifiedTrades : 0;
    } else {
      hasTradesFlag[i] = false;
      rawTrades[i] = 0;
      rawATS[i] = 0;
    }

    rawSpreads[i] = spread;
    rawVolumes[i] = volume;
    rawCLV[i] = clv;
  }

  // Calculate 20-period rolling statistics
  const PERIOD = 20;

  for (let i = 0; i < n; i++) {
    const b = bars[i];
    const time = b.time as Time;
    const close = Number(b.close);
    const volume = Number(b.volume || 0);
    const turnover = close * volume;
    const ats = rawATS[i];
    const trades = rawTrades[i];
    const hasRealTrades = hasTradesFlag[i];
    const clv = rawCLV[i];

    // Compute rolling 20-bar window for volume and spread
    const startIdx = Math.max(0, i - PERIOD + 1);
    const windowLen = i - startIdx + 1;

    let sumATS = 0;
    let countATS = 0;
    let sumVol = 0;
    let sumSpread = 0;

    for (let j = startIdx; j <= i; j++) {
      if (hasTradesFlag[j] && rawATS[j] > 0) {
        sumATS += rawATS[j];
        countATS++;
      }
      sumVol += rawVolumes[j];
      sumSpread += rawSpreads[j];
    }

    const atsMa20 = countATS > 0 ? sumATS / countATS : 0;
    const volMa20 = Math.max(sumVol / windowLen, 1);
    const spreadMa20 = Math.max(sumSpread / windowLen, 0.0001);

    const rVol = volume / volMa20;
    const rSpread = rawSpreads[i] / spreadMa20;

    // Absorption ratio: pure mathematical calculation on 100% real volume and spread
    const absorptionRatio = rVol / Math.max(rSpread, 0.2);

    let state: SmartMoneyPoint['state'] = 'NEUTRAL';
    let color = 'rgba(255, 255, 255, 0.22)';
    let stateLabel = 'Normal Retail Activity';

    if (volume > 0) {
      if (absorptionRatio >= 1.6 && clv >= 0.15) {
        state = 'ACCUMULATION_HEAVY';
        color = '#10b981'; // Emerald Green
        stateLabel = 'Institutional Accumulation';

        if (showMarkers && i > 0 && points[i - 1]?.state !== 'ACCUMULATION_HEAVY') {
          markers.push({
            time,
            position: 'belowBar',
            color: '#10b981',
            shape: 'arrowUp',
            text: 'SMART BUY',
          });
        }
      } else if (absorptionRatio >= 1.2 && clv > 0) {
        state = 'ACCUMULATION_MODERATE';
        color = '#14b8a6'; // Soft Teal
        stateLabel = 'Absorption Buy';
      } else if (absorptionRatio >= 1.6 && clv <= -0.15) {
        state = 'DISTRIBUTION_HEAVY';
        color = '#f43f5e'; // Crimson Red
        stateLabel = 'Institutional Distribution';

        if (showMarkers && i > 0 && points[i - 1]?.state !== 'DISTRIBUTION_HEAVY') {
          markers.push({
            time,
            position: 'aboveBar',
            color: '#f43f5e',
            shape: 'arrowDown',
            text: 'DISTRIBUTION',
          });
        }
      } else if (absorptionRatio >= 1.2 && clv < 0) {
        state = 'DISTRIBUTION_MODERATE';
        color = '#fb7185'; // Soft Rose
        stateLabel = 'Distribution Churn';
      }
    }

    points.push({
      time,
      turnover,
      ats,
      atsMa20,
      tradesCount: trades,
      hasRealTrades,
      absorptionRatio,
      clv,
      state,
      color,
      stateLabel,
    });
  }

  const latest = points[points.length - 1];
  const latestATS = latest ? latest.ats : 0;
  const latestTrades = latest ? latest.tradesCount : 0;
  const hasRealTrades = latest ? latest.hasRealTrades : false;
  const latestState = latest ? latest.stateLabel : 'Normal Retail Activity';
  const latestAbsorption = latest ? Math.round(latest.absorptionRatio * 100) / 100 : 1;
  const atsRatioVsMa20 =
    latest && latest.atsMa20 > 0 && latest.ats > 0
      ? Math.round((latest.ats / latest.atsMa20) * 100) / 100
      : 1;

  return {
    points,
    markers,
    hasAnyRealTrades: anyRealTradesFound,
    summary: {
      latestATS,
      latestTrades,
      hasRealTrades,
      latestState,
      latestAbsorption,
      atsRatioVsMa20,
    },
  };
}
