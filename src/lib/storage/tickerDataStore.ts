'use client';

import { detectExtremeGap } from '@/lib/market/price-adjustments';

export type PriceBar = {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type SyncMeta = {
  lastDate: string;
  count: number;
  syncedAt: number;
  adjustmentRevision?: string | null;
};

const DB_NAME = 'ticknal_market_data_v1';
const DB_VERSION = 1;

const REQUIRED_ADJUSTMENT_REVISIONS: Record<string, string> = {
  POUL: '2026-09-27:',
};

const STORES = {
  CANDLES: 'candles',
  SYNC_META: 'sync_meta',
  MONTHLY_CLOSES: 'monthly_closes',
} as const;

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.CANDLES)) {
        db.createObjectStore(STORES.CANDLES);
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META);
      }
      if (!db.objectStoreNames.contains(STORES.MONTHLY_CLOSES)) {
        db.createObjectStore(STORES.MONTHLY_CLOSES);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function makeKey(symbol: string, timeframe: string = 'D'): string {
  const cleanSym = symbol.trim().toUpperCase().replace('.CA', '');
  return `${cleanSym}:${timeframe.toUpperCase()}`;
}

export const tickerDataStore = {
  /**
   * Retrieves locally stored price bars for a symbol and timeframe.
   */
  async getStoredBars(symbol: string, timeframe: string = 'D'): Promise<PriceBar[]> {
    if (!isIndexedDbSupported()) return [];
    try {
      const db = await openDb();
      return new Promise<PriceBar[]>((resolve) => {
        const tx = db.transaction(STORES.CANDLES, 'readonly');
        const store = tx.objectStore(STORES.CANDLES);
        const req = store.get(makeKey(symbol, timeframe));
        req.onsuccess = () => resolve((req.result as PriceBar[]) || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  },

  /**
   * Retrieves sync metadata (last synced date, row count, timestamp).
   */
  async getSyncMeta(symbol: string, timeframe: string = 'D'): Promise<SyncMeta | null> {
    if (!isIndexedDbSupported()) return null;
    try {
      const db = await openDb();
      return new Promise<SyncMeta | null>((resolve) => {
        const tx = db.transaction(STORES.SYNC_META, 'readonly');
        const store = tx.objectStore(STORES.SYNC_META);
        const req = store.get(makeKey(symbol, timeframe));
        req.onsuccess = () => resolve((req.result as SyncMeta) || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Saves price bars and updates sync metadata in IndexedDB.
   */
  async saveBars(
    symbol: string,
    bars: PriceBar[],
    timeframe: string = 'D',
    adjustmentRevision: string | null = null,
  ): Promise<void> {
    if (!isIndexedDbSupported() || bars.length === 0) return;
    try {
      const db = await openDb();
      const lastBar = bars[bars.length - 1];
      const lastDate = String(lastBar.time).split('T')[0];

      const tx = db.transaction([STORES.CANDLES, STORES.SYNC_META], 'readwrite');
      const candleStore = tx.objectStore(STORES.CANDLES);
      const metaStore = tx.objectStore(STORES.SYNC_META);
      const key = makeKey(symbol, timeframe);

      candleStore.put(bars, key);
      metaStore.put(
        {
          lastDate,
          count: bars.length,
          syncedAt: Date.now(),
          adjustmentRevision,
        } satisfies SyncMeta,
        key
      );

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn(`[tickerDataStore] Failed to save bars for ${symbol}:`, err);
    }
  },

  /**
   * High-performance Delta-Sync:
   * 1. Reads local bars from IndexedDB.
   * 2. If empty, fetches full history from `/api/history`.
   * 3. If exists, fetches only delta (`?since=${lastDate}`).
   * 4. Deduplicates and merges using a Map.
   * 5. Saves merged series back to IndexedDB asynchronously.
   * 6. Returns the complete, unbroken series to caller.
   */
  async syncTickerData(
    symbol: string,
    timeframe: string = 'D',
    options: { forceRefresh?: boolean; initialBars?: PriceBar[] } = {}
  ): Promise<{ bars: PriceBar[]; fromCache: boolean; deltaCount: number }> {
    const cleanSym = symbol.trim().toUpperCase().replace('.CA', '');
    const isClient = typeof window !== 'undefined';
    if (!isClient) {
      return { bars: options.initialBars || [], fromCache: false, deltaCount: 0 };
    }

    // 1. Check local IndexedDB cache unless force refresh
    let storedBars: PriceBar[] = [];
    let meta: SyncMeta | null = null;

    if (!options.forceRefresh) {
      [storedBars, meta] = await Promise.all([
        this.getStoredBars(cleanSym, timeframe),
        this.getSyncMeta(cleanSym, timeframe),
      ]);
    }

    const requiredRevisionPrefix = REQUIRED_ADJUSTMENT_REVISIONS[cleanSym];
    const requiresKnownRepairRefresh = Boolean(
      timeframe.toUpperCase() === 'D' &&
      requiredRevisionPrefix &&
      !meta?.adjustmentRevision?.startsWith(requiredRevisionPrefix),
    );
    const forceRefresh = Boolean(options.forceRefresh || requiresKnownRepairRefresh);
    if (forceRefresh) {
      storedBars = [];
      meta = null;
    }

    // Seed local store if empty and initialBars provided
    if (options.initialBars && options.initialBars.length > 0) {
      if (storedBars.length === 0) {
        storedBars = options.initialBars;
        this.saveBars(cleanSym, storedBars, timeframe, meta?.adjustmentRevision ?? null).catch(() => {});
      } else {
        const lastStored = storedBars[storedBars.length - 1];
        const lastInitial = options.initialBars[options.initialBars.length - 1];
        if (lastInitial && String(lastInitial.time) > String(lastStored.time)) {
          const barMap = new Map<string, PriceBar>();
          for (const bar of storedBars) barMap.set(String(bar.time), bar);
          for (const bar of options.initialBars) barMap.set(String(bar.time), bar);
          storedBars = Array.from(barMap.values()).sort((a, b) => {
            const timeA = typeof a.time === 'number' ? a.time : Date.parse(String(a.time));
            const timeB = typeof b.time === 'number' ? b.time : Date.parse(String(b.time));
            return timeA - timeB;
          });
          this.saveBars(cleanSym, storedBars, timeframe, meta?.adjustmentRevision ?? null).catch(() => {});
        }
      }
    }

    // If cache is fresh, avoid network ping entirely (12 hours for daily bars, 5 mins for intraday)
    const now = Date.now();
    const freshDuration = forceRefresh
      ? 0
      : (timeframe.toUpperCase() === 'D' ? 12 * 60 * 60 * 1000 : 5 * 60 * 1000);

    if (storedBars.length > 0 && meta && now - meta.syncedAt < freshDuration) {
      return { bars: storedBars, fromCache: true, deltaCount: 0 };
    }

    const lastDate = meta?.lastDate || (storedBars.length > 0 ? String(storedBars[storedBars.length - 1].time).split('T')[0] : null);

    try {
      const url = new URL('/api/history', window.location.origin);
      url.searchParams.set('ticker', cleanSym);
      url.searchParams.set('timeframe', timeframe);
      if (lastDate && !forceRefresh) {
        url.searchParams.set('since', lastDate);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        // Fallback to local cache if network fails
        if (storedBars.length > 0) {
          return { bars: storedBars, fromCache: true, deltaCount: 0 };
        }
        throw new Error(`Failed to fetch market history: ${response.statusText}`);
      }

      const data = await response.json();
      const incomingBars: PriceBar[] = data?.bars || [];
      const incomingAdjustmentRevision: string | null = data?.adjustmentRevision || null;

      const fetchFullHistory = async (): Promise<PriceBar[] | null> => {
        const refreshUrl = new URL('/api/history', window.location.origin);
        refreshUrl.searchParams.set('ticker', cleanSym);
        refreshUrl.searchParams.set('timeframe', timeframe);
        refreshUrl.searchParams.set('fresh', '1');
        const refreshResponse = await fetch(refreshUrl.toString(), { cache: 'no-store' });
        if (!refreshResponse.ok) return null;
        const refreshData = await refreshResponse.json();
        const refreshedBars: PriceBar[] = refreshData?.bars || [];
        if (refreshedBars.length === 0) return null;
        const refreshedRevision: string | null = refreshData?.adjustmentRevision || null;
        this.saveBars(cleanSym, refreshedBars, timeframe, refreshedRevision).catch(() => {});
        return refreshedBars;
      };

      // Case A: Full initial fetch (local was empty or forceRefresh)
      if (storedBars.length === 0 || forceRefresh) {
        if (incomingBars.length > 0) {
          // Asynchronously persist without blocking caller
          this.saveBars(cleanSym, incomingBars, timeframe, incomingAdjustmentRevision).catch(() => {});
        }
        return { bars: incomingBars, fromCache: false, deltaCount: incomingBars.length };
      }

      if (incomingAdjustmentRevision !== (meta?.adjustmentRevision ?? null)) {
        const refreshedBars = await fetchFullHistory();
        if (refreshedBars) {
          return { bars: refreshedBars, fromCache: false, deltaCount: refreshedBars.length };
        }
      }

      // Case B: Delta fetch (0 new bars returned)
      if (incomingBars.length === 0) {
        // Touch syncedAt so we don't spam network
        if (meta) {
          meta.syncedAt = Date.now();
          this.touchSyncMeta(cleanSym, meta, timeframe).catch(() => {});
        }
        return { bars: storedBars, fromCache: true, deltaCount: 0 };
      }

      // A corporate action may rewrite the units of the entire historical
      // series. A delta-only merge would combine old-unit cached bars with a
      // new-unit incoming bar, recreating the fake crash in the browser even
      // after the server fixed its canonical history. Detect that boundary and
      // replace the local series from a fresh, uncached full response.
      if (timeframe.toUpperCase() === 'D') {
        const lastStored = storedBars[storedBars.length - 1];
        const firstIncoming = incomingBars[0];
        if (lastStored && firstIncoming) {
          const discontinuity = detectExtremeGap(Number(lastStored.close), Number(firstIncoming.open));
          if (discontinuity) {
            const refreshedBars = await fetchFullHistory();
            if (refreshedBars) {
              return {
                bars: refreshedBars,
                fromCache: false,
                deltaCount: refreshedBars.length,
              };
            }
          }
        }
      }

      // Case C: Delta fetch with new bars -> Deduplicate and Merge
      const barMap = new Map<string, PriceBar>();
      for (const bar of storedBars) {
        barMap.set(String(bar.time), bar);
      }
      for (const bar of incomingBars) {
        barMap.set(String(bar.time), bar);
      }

      const mergedBars = Array.from(barMap.values()).sort((a, b) => {
        const timeA = typeof a.time === 'number' ? a.time : Date.parse(String(a.time));
        const timeB = typeof b.time === 'number' ? b.time : Date.parse(String(b.time));
        return timeA - timeB;
      });

      // Save asynchronously
      this.saveBars(cleanSym, mergedBars, timeframe, incomingAdjustmentRevision).catch(() => {});

      return {
        bars: mergedBars,
        fromCache: true,
        deltaCount: incomingBars.length,
      };
    } catch (error) {
      console.warn(`[tickerDataStore] Delta sync failed for ${cleanSym}, falling back to cache:`, error);
      return { bars: storedBars, fromCache: true, deltaCount: 0 };
    }
  },

  /**
   * Updates syncedAt timestamp without re-writing the entire candle array.
   */
  async touchSyncMeta(symbol: string, meta: SyncMeta, timeframe: string = 'D'): Promise<void> {
    if (!isIndexedDbSupported()) return;
    try {
      const db = await openDb();
      const tx = db.transaction(STORES.SYNC_META, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_META);
      store.put({ ...meta, syncedAt: Date.now() }, makeKey(symbol, timeframe));
    } catch {}
  },

  /**
   * Retrieves a cached monthly close (for Dashboard Net Worth calculations).
   */
  async getMonthlyClose(symbol: string, monthKey: string): Promise<number | null> {
    if (!isIndexedDbSupported()) return null;
    try {
      const db = await openDb();
      return new Promise<number | null>((resolve) => {
        const tx = db.transaction(STORES.MONTHLY_CLOSES, 'readonly');
        const store = tx.objectStore(STORES.MONTHLY_CLOSES);
        const req = store.get(`${symbol.toUpperCase()}:${monthKey}`);
        req.onsuccess = () => resolve(req.result?.close ?? null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Stores historical month-end closes.
   */
  async saveMonthlyCloses(
    entries: Array<{ symbol: string; monthKey: string; close: number; date: string }>
  ): Promise<void> {
    if (!isIndexedDbSupported() || entries.length === 0) return;
    try {
      const db = await openDb();
      const tx = db.transaction(STORES.MONTHLY_CLOSES, 'readwrite');
      const store = tx.objectStore(STORES.MONTHLY_CLOSES);
      for (const e of entries) {
        store.put({ close: e.close, date: e.date }, `${e.symbol.toUpperCase()}:${e.monthKey}`);
      }
    } catch {}
  },

  /**
   * Invalidates local cache for a specific ticker (e.g. after a stock split).
   */
  async invalidateTicker(symbol: string, timeframe: string = 'D'): Promise<void> {
    if (!isIndexedDbSupported()) return;
    try {
      const db = await openDb();
      const tx = db.transaction([STORES.CANDLES, STORES.SYNC_META], 'readwrite');
      const key = makeKey(symbol, timeframe);
      tx.objectStore(STORES.CANDLES).delete(key);
      tx.objectStore(STORES.SYNC_META).delete(key);
    } catch {}
  },

  /**
   * Clears the entire local database.
   */
  async clearAllCache(): Promise<void> {
    if (!isIndexedDbSupported()) return;
    try {
      const db = await openDb();
      const tx = db.transaction([STORES.CANDLES, STORES.SYNC_META, STORES.MONTHLY_CLOSES], 'readwrite');
      tx.objectStore(STORES.CANDLES).clear();
      tx.objectStore(STORES.SYNC_META).clear();
      tx.objectStore(STORES.MONTHLY_CLOSES).clear();
    } catch {}
  },

  /**
   * Background prefetching for symbols (e.g. user watchlist)
   * Fetches missing or stale tickers one at a time during browser idle time.
   */
  async prefetchSymbols(symbols: string[], timeframe: string = 'D'): Promise<void> {
    if (!isIndexedDbSupported() || symbols.length === 0) return;
    const cleanSymbols = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase().replace('.CA', ''))));

    for (const sym of cleanSymbols) {
      try {
        const meta = await this.getSyncMeta(sym, timeframe);
        const freshDuration = timeframe.toUpperCase() === 'D' ? 12 * 60 * 60 * 1000 : 5 * 60 * 1000;
        if (meta && Date.now() - meta.syncedAt < freshDuration) {
          continue; // Already fresh in IndexedDB
        }
        await this.syncTickerData(sym, timeframe);
        // Throttle slightly between requests to avoid saturating network
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        // Silently continue
      }
    }
  },

  /**
   * Retrieves high-level stats of locally stored data in IndexedDB.
   */
  async getStorageStats(): Promise<{
    cachedTickersCount: number;
    totalBarsCount: number;
    tickers: Array<{ symbol: string; timeframe: string; count: number; lastDate: string; syncedAt: number }>;
  }> {
    if (!isIndexedDbSupported()) {
      return { cachedTickersCount: 0, totalBarsCount: 0, tickers: [] };
    }
    try {
      const db = await openDb();
      return new Promise((resolve) => {
        const tx = db.transaction([STORES.SYNC_META], 'readonly');
        const metaStore = tx.objectStore(STORES.SYNC_META);
        const req = metaStore.openCursor();
        const list: Array<{ symbol: string; timeframe: string; count: number; lastDate: string; syncedAt: number }> = [];
        let totalBars = 0;

        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const key = String(cursor.key);
            const [sym, tf] = key.split(':');
            const val = cursor.value as SyncMeta;
            list.push({
              symbol: sym,
              timeframe: tf || 'D',
              count: val.count,
              lastDate: val.lastDate,
              syncedAt: val.syncedAt,
            });
            totalBars += val.count || 0;
            cursor.continue();
          } else {
            resolve({
              cachedTickersCount: list.length,
              totalBarsCount: totalBars,
              tickers: list,
            });
          }
        };
        req.onerror = () => resolve({ cachedTickersCount: 0, totalBarsCount: 0, tickers: [] });
      });
    } catch {
      return { cachedTickersCount: 0, totalBarsCount: 0, tickers: [] };
    }
  },
};
