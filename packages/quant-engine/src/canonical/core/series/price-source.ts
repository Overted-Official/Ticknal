import type { MarketBar } from '../../contracts';

export const PRICE_SOURCES = [
  'open',
  'high',
  'low',
  'close',
  'hl2',
  'hlc3',
  'ohlc4',
  'hlcc4',
] as const;

export type PriceSource = (typeof PRICE_SOURCES)[number];

export function getPriceSource(bar: MarketBar, source: PriceSource): number {
  switch (source) {
    case 'open':
      return bar.open;
    case 'high':
      return bar.high;
    case 'low':
      return bar.low;
    case 'close':
      return bar.close;
    case 'hl2':
      return (bar.high + bar.low) / 2;
    case 'hlc3':
      return (bar.high + bar.low + bar.close) / 3;
    case 'ohlc4':
      return (bar.open + bar.high + bar.low + bar.close) / 4;
    case 'hlcc4':
      return (bar.high + bar.low + 2 * bar.close) / 4;
  }
}
