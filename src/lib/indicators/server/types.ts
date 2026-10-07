import type { Diagnostic, TimeSeriesFrame } from '@ticknal/quant-engine/canonical';
import type { ContextualEvaluationItem } from './evaluate-contextual-indicators';

export const LIVE_TIMEFRAMES = ['D', 'W', 'M', '1H', '15M'] as const;

export type LiveTimeframe = (typeof LIVE_TIMEFRAMES)[number];

export interface LiveTimeSeriesRequest {
  readonly symbol: string;
  readonly timeframe: LiveTimeframe;
}

export type FrameLoadResult =
  | { readonly status: 'ok'; readonly frame: TimeSeriesFrame }
  | { readonly status: 'unavailable'; readonly diagnostics: readonly Diagnostic[] };

export interface ContextualEvaluationResponse {
  readonly status: 'ok';
  readonly results: readonly ContextualEvaluationItem[];
}

const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9.!-]{0,19}$/;

export function normalizeLiveTicker(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return TICKER_PATTERN.test(normalized) ? normalized : null;
}

export function parseLiveTimeframe(value: string): LiveTimeframe | null {
  const normalized = value.trim().toUpperCase();
  return LIVE_TIMEFRAMES.includes(normalized as LiveTimeframe)
    ? (normalized as LiveTimeframe)
    : null;
}
