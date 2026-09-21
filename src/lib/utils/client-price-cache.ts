'use client';

import {
  tickerDataStore,
  type PriceBar,
  type SyncMeta,
} from '@/lib/storage/tickerDataStore';

export type { PriceBar, SyncMeta };

export interface CacheOptions {
  forceRefresh?: boolean;
  initialBars?: PriceBar[];
}

export interface ClientPriceCacheStats {
  cachedTickersCount: number;
  totalBarsCount: number;
  tickers: Array<{
    symbol: string;
    timeframe: string;
    count: number;
    lastDate: string;
    syncedAt: number;
  }>;
}

/**
 * High-performance client-side price caching helper.
 *
 * 1. Checks IndexedDB first (<10ms).
 * 2. If present and fresh (<12h for daily, <5m for intraday), returns instantly from local storage with ZERO network egress.
 * 3. If stale, queries only missing delta bars (?since=max_local_date), appends them, and saves to IndexedDB.
 * 4. If empty or forceRefresh, performs full initial fetch and saves to IndexedDB.
 */
export async function getCachedOrFetchDailyPrices(
  symbol: string,
  options?: CacheOptions
): Promise<{ bars: PriceBar[]; fromCache: boolean; deltaCount: number }> {
  return tickerDataStore.syncTickerData(symbol, 'D', options);
}

/**
 * Fetches or delta-syncs intraday 1H prices from IndexedDB/API.
 */
export async function getCachedOrFetchHourlyPrices(
  symbol: string,
  options?: CacheOptions
): Promise<{ bars: PriceBar[]; fromCache: boolean; deltaCount: number }> {
  return tickerDataStore.syncTickerData(symbol, '1H', options);
}

/**
 * Instantly reads local bars from IndexedDB without making any network requests.
 */
export async function getStoredDailyBars(symbol: string): Promise<PriceBar[]> {
  return tickerDataStore.getStoredBars(symbol, 'D');
}

/**
 * Pre-warms the local cache for a user's watchlist symbols in the background.
 * Uses idle execution to avoid interfering with chart interactions or UI rendering.
 */
export function prefetchWatchlist(symbols: string[], timeframe: string = 'D'): void {
  if (typeof window === 'undefined') return;

  const run = () => {
    tickerDataStore.prefetchSymbols(symbols, timeframe).catch(() => {});
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1500);
  }
}

/**
 * Invalidates local cached data for a specific ticker (e.g. after a stock split or corporate action).
 */
export async function invalidateTickerCache(symbol: string, timeframe: string = 'D'): Promise<void> {
  return tickerDataStore.invalidateTicker(symbol, timeframe);
}

/**
 * Clears the entire client-side price cache database.
 */
export async function clearAllPriceCache(): Promise<void> {
  return tickerDataStore.clearAllCache();
}

/**
 * Retrieves storage usage statistics.
 */
export async function getPriceCacheStats(): Promise<ClientPriceCacheStats> {
  return tickerDataStore.getStorageStats();
}

export { tickerDataStore };
