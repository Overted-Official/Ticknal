import type {
  MarketBar,
  MarketFrameMeta,
  TimeSeriesFrame,
} from '../../src/canonical/contracts';

export const FIVE_BAR_BARS = [
  { time: '2026-01-04', open: 100, high: 110, low: 90, close: 105, volume: 1000 },
  { time: '2026-01-05', open: 106, high: 112, low: 101, close: 108, volume: 1200 },
  { time: '2026-01-06', open: 107, high: 115, low: 104, close: 114, volume: 800 },
  { time: '2026-01-07', open: 113, high: 118, low: 109, close: 110, volume: 1500 },
  { time: '2026-01-08', open: 111, high: 116, low: 107, close: 115, volume: 900 },
] as const;

export const FIVE_BAR_META: MarketFrameMeta = {
  instrumentId: 'reference-equity',
  symbol: 'REF',
  exchange: 'REFERENCE',
  assetClass: 'equity',
  quoteCurrency: 'EGP',
  requestedTimeframe: 'D',
  effectiveTimeframe: 'D',
  sourceId: 'five-bar-hand-calculation',
  sourceType: 'hand-calculated-reference',
  sourceRevision: 'five-bar-v1',
  asOf: '2026-01-08T12:00:00.000Z',
  receivedAt: '2026-01-08T12:00:00.000Z',
  timezone: 'Africa/Cairo',
  exchangeCalendar: 'REFERENCE_SUN_THU',
  sessionDefinition: 'reference-daily-close',
  adjustmentMode: 'raw',
  adjustmentRevision: null,
  sessionCompleteness: 'complete',
  continuityStatus: 'continuous',
  fields: {
    open: { coverage: 'observed', observedCount: 5, missingCount: 0 },
    high: { coverage: 'observed', observedCount: 5, missingCount: 0 },
    low: { coverage: 'observed', observedCount: 5, missingCount: 0 },
    close: { coverage: 'observed', observedCount: 5, missingCount: 0 },
    volume: { coverage: 'observed', observedCount: 5, missingCount: 0 },
    trades: { coverage: 'unavailable', observedCount: 0, missingCount: 5 },
  },
  transformations: [],
};

export const FIVE_BAR_FRAME: TimeSeriesFrame = {
  domain: 'time-series',
  meta: FIVE_BAR_META,
  bars: FIVE_BAR_BARS.map(
    (bar): MarketBar => ({
      ...bar,
      trades: null,
      finality: 'final',
    }),
  ),
};

export function cloneFiveBarFrame(): TimeSeriesFrame {
  return structuredClone(FIVE_BAR_FRAME);
}
