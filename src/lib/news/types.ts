/**
 * Ticknal News & Intelligence Engine Types Contract
 */

export type TicknalTakeType =
  | 'hot_money'
  | 'trade_summary'
  | 'market_breadth'
  | 'gainers_losers'
  | 'usd_egp_update';

export interface WireCandidate {
  id: string;
  tickerSymbol: string;
  headline: string;
  body: string;
  source: string;
  sourceUrl?: string;
  publishedAt: Date;
  eodContext?: {
    close: number;
    changePct: number;
    volume: number;
  };
}

export interface QuantitativeScreenResult {
  action: 'accept' | 'drop';
  summary?: string;
  sentiment: 'bullish' | 'neutral' | 'bearish';
  importance: 'critical' | 'high' | 'normal';
  reason?: string;
}

export interface SocialSharePayload {
  postId: string;
  title: string;
  summary: string;
  categoryLabel: string;
  tickers: string[];
  publishedAt: string;
  chartSvgDataUrl?: string;
}
