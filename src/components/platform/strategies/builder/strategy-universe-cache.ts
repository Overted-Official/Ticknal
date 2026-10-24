import type { ParsedUniverseBacktestResponse } from './strategy-universe-analytics';
import type { UniverseBacktestItem } from '../../../../lib/strategies/server/run-simple-universe-backtest';

type ReadyResult = Extract<ParsedUniverseBacktestResponse, { readonly status: 'ready' }>;
type PartialResult = { readonly status: 'loading'; readonly completed: number; readonly total: number; readonly results: readonly UniverseBacktestItem[] };
type CachedResult = ReadyResult | PartialResult;

export function createUniverseResultCache(ttlMs: number) {
  const entries = new Map<string, { readonly value: CachedResult; readonly expiresAt: number }>();
  const write = (key: string, value: CachedResult, now: number) => {
    if (entries.has(key)) entries.delete(key);
    if (entries.size >= 3) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    // A paused scan must not restart at symbol zero merely because the user
    // resumed after the short freshness window for completed results.
    entries.set(key, { value, expiresAt: value.status === 'loading' ? Number.POSITIVE_INFINITY : now + ttlMs });
  };
  return {
    get(key: string, now = Date.now()): CachedResult | null {
      const entry = entries.get(key);
      if (!entry) return null;
      if (now > entry.expiresAt) { entries.delete(key); return null; }
      return entry.value;
    },
    set(key: string, value: ReadyResult, now = Date.now()): void {
      write(key, value, now);
    },
    setPartial(key: string, results: readonly UniverseBacktestItem[], total: number, now = Date.now()): void {
      write(key, { status: 'loading', completed: results.length, total, results: [...results] }, now);
    },
  };
}
