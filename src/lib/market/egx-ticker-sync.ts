import { db } from '@/db';
import { tickers, systemLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { invalidateTickersMemCache } from '@/lib/utils/data-cache';
import { invalidatePrecomputedMarketCache } from '@/lib/handlers/sectors-handlers';

export interface ScannedEGXTicker {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  industry: string | null;
  currency: string;
  logoUrl: string | null;
}

export interface SyncEGXTickersResult {
  totalScanned: number;
  newlyAdded: string[];
  delisted: string[];
  reactivated: string[];
  skippedCount: number;
  error?: string;
}

const TV_TO_TICKNAL_SECTOR_MAP: Record<string, string> = {
  'Finance': 'Financials',
  'Commercial Services': 'Industrials',
  'Transportation': 'Industrials',
  'Producer Manufacturing': 'Industrials',
  'Non-Energy Minerals': 'Materials',
  'Process Industries': 'Materials',
  'Health Technology': 'Health Care',
  'Health Services': 'Health Care',
  'Technology Services': 'Information Technology',
  'Electronic Technology': 'Information Technology',
  'Communications': 'Communication Services',
  'Consumer Non-Durables': 'Consumer Staples',
  'Consumer Durables': 'Consumer Discretionary',
  'Consumer Services': 'Consumer Discretionary',
  'Retail Trade': 'Consumer Discretionary',
  'Distribution Services': 'Industrials',
  'Utilities': 'Utilities',
  'Energy Minerals': 'Energy',
  'Real Estate': 'Real Estate',
};

/**
 * Maps TradingView sector taxonomy to Ticknal canonical GICS sectors.
 */
export function mapTradingViewSector(sector: string | null | undefined): string {
  if (!sector || typeof sector !== 'string') return 'Industrials';
  const trimmed = sector.trim();
  return TV_TO_TICKNAL_SECTOR_MAP[trimmed] || trimmed;
}

/**
 * Normalizes and extracts an EGX ticker from TradingView scanner data format.
 */
export function parseTradingViewScannerItem(item: any): ScannedEGXTicker | null {
  if (!item || typeof item !== 'object') return null;

  const rawSymbol = item.d?.[0] || item.s;
  if (!rawSymbol || typeof rawSymbol !== 'string') return null;

  const cleanSymbol = rawSymbol
    .trim()
    .toUpperCase()
    .replace(/^EGX:/, '')
    .replace(/\.CA$/, '');

  if (!cleanSymbol) return null;

  const companyName = (item.d?.[1] && typeof item.d[1] === 'string' && item.d[1].trim())
    ? item.d[1].trim()
    : cleanSymbol;

  const rawSector = item.d?.[2];
  const sector = mapTradingViewSector(rawSector);

  const rawIndustry = item.d?.[3];
  const industry = typeof rawIndustry === 'string' && rawIndustry.trim() ? rawIndustry.trim() : null;

  const rawCurrency = item.d?.[4];
  const currency = typeof rawCurrency === 'string' && rawCurrency.trim() ? rawCurrency.trim().toUpperCase() : 'EGP';

  const logoid = item.d?.[5];
  const logoUrl = typeof logoid === 'string' && logoid.trim()
    ? `https://s3-symbol-logo.tradingview.com/${logoid.trim()}.svg`
    : null;

  return {
    symbol: cleanSymbol,
    companyName,
    exchange: 'EGX',
    sector,
    industry,
    currency,
    logoUrl,
  };
}

/**
 * Computes missing tickers given a list of scanned tickers and set of known symbols.
 */
export function computeMissingTickers(
  scanned: ScannedEGXTicker[],
  existingSymbols: Set<string>,
): ScannedEGXTicker[] {
  const missing: ScannedEGXTicker[] = [];
  const seen = new Set<string>();

  for (const item of scanned) {
    const sym = item.symbol.toUpperCase();
    if (!sym) continue;
    if (existingSymbols.has(sym)) continue;
    if (seen.has(sym)) continue;

    seen.add(sym);
    missing.push(item);
  }

  return missing;
}

/**
 * Computes active DB equities that are no longer listed/present in the exchange scan.
 * Exempts mutual funds, macro series, and market indices from delisting checks.
 */
export function computeDelistedTickers(
  scannedSymbols: Set<string>,
  activeDbTickers: { symbol: string; sector?: string | null; exchange?: string | null }[],
): string[] {
  const delisted: string[] = [];

  for (const t of activeDbTickers) {
    if (t.exchange !== 'EGX') continue;
    if (t.sector === 'Funds' || t.sector === 'Macro' || t.sector === 'Indices') continue;

    const cleanSymbol = t.symbol.toUpperCase().replace(/\.CA$/, '');
    if (!scannedSymbols.has(cleanSymbol)) {
      delisted.push(t.symbol);
    }
  }

  return delisted;
}

/**
 * Computes previously delisted DB tickers that have reappeared in the exchange scan.
 */
export function computeReactivatedTickers(
  scannedSymbols: Set<string>,
  delistedDbTickers: { symbol: string; sector?: string | null; exchange?: string | null }[],
): string[] {
  const reactivated: string[] = [];

  for (const t of delistedDbTickers) {
    const cleanSymbol = t.symbol.toUpperCase().replace(/\.CA$/, '');
    if (scannedSymbols.has(cleanSymbol)) {
      reactivated.push(t.symbol);
    }
  }

  return reactivated;
}

/**
 * Queries the official TradingView Egypt scanner API for all listed stocks.
 */
export async function fetchEGXScannerData(): Promise<ScannedEGXTicker[]> {
  const res = await fetch('https://scanner.tradingview.com/egypt/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Ticknal-Scanner/1.0',
    },
    body: JSON.stringify({
      filter: [{ left: 'type', operation: 'equal', right: 'stock' }],
      columns: ['name', 'description', 'sector', 'industry', 'currency', 'logoid'],
    }),
  });

  if (!res.ok) {
    throw new Error(`TradingView scanner responded with HTTP ${res.status}`);
  }

  const json = await res.json();
  const rawData: any[] = Array.isArray(json?.data) ? json.data : [];

  const results: ScannedEGXTicker[] = [];
  for (const item of rawData) {
    const parsed = parseTradingViewScannerItem(item);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Automatically reconciles newly listed, delisted, and reactivated EGX tickers into the database.
 */
export async function syncEGXTickersFromExchange(options?: {
  dryRun?: boolean;
}): Promise<SyncEGXTickersResult> {
  try {
    const scanned = await fetchEGXScannerData();
    if (scanned.length === 0) {
      return { totalScanned: 0, newlyAdded: [], delisted: [], reactivated: [], skippedCount: 0 };
    }

    const currentRows = await db.select({
      symbol: tickers.symbol,
      sector: tickers.sector,
      exchange: tickers.exchange,
      status: tickers.status,
    }).from(tickers);

    const scannedSymbols = new Set(scanned.map(s => s.symbol.toUpperCase()));
    const existingSymbols = new Set(
      currentRows
        .filter(r => r.symbol)
        .map(r => r.symbol.toUpperCase().replace(/\.CA$/, '')),
    );

    const missing = computeMissingTickers(scanned, existingSymbols);
    const activeRows = currentRows.filter(r => r.status === 'ACTIVE');
    const delistedRows = currentRows.filter(r => r.status === 'DELISTED');

    const delisted = computeDelistedTickers(scannedSymbols, activeRows);
    const reactivated = computeReactivatedTickers(scannedSymbols, delistedRows);

    if (missing.length === 0 && delisted.length === 0 && reactivated.length === 0) {
      return {
        totalScanned: scanned.length,
        newlyAdded: [],
        delisted: [],
        reactivated: [],
        skippedCount: scanned.length,
      };
    }

    if (options?.dryRun) {
      return {
        totalScanned: scanned.length,
        newlyAdded: missing.map(m => m.symbol),
        delisted,
        reactivated,
        skippedCount: scanned.length - missing.length,
      };
    }

    // 1. Insert newly listed tickers into the tickers table
    for (const item of missing) {
      await db.insert(tickers)
        .values({
          symbol: item.symbol,
          companyName: item.companyName,
          exchange: 'EGX',
          sector: item.sector,
          industry: item.industry,
          currency: item.currency,
          logoUrl: item.logoUrl,
          status: 'ACTIVE',
          delistedAt: null,
        })
        .onConflictDoNothing();
    }

    // 2. Mark delisted tickers
    for (const sym of delisted) {
      await db.update(tickers)
        .set({
          status: 'DELISTED',
          delistedAt: new Date(),
        })
        .where(eq(tickers.symbol, sym));
    }

    // 3. Reactivate previously delisted tickers that resumed trading
    for (const sym of reactivated) {
      await db.update(tickers)
        .set({
          status: 'ACTIVE',
          delistedAt: null,
        })
        .where(eq(tickers.symbol, sym));
    }

    // Record audit events in systemLogs
    if (missing.length > 0) {
      await db.insert(systemLogs).values({
        source: 'cron-ticker-sync',
        level: 'INFO',
        message: `Discovered and enrolled ${missing.length} new EGX listing(s): ${missing.map(m => m.symbol).join(', ')}`,
        metadata: {
          newTickersCount: missing.length,
          newTickers: missing,
        },
      }).catch(err => {
        console.error('Failed to write ticker discovery system log:', err);
      });
    }

    if (delisted.length > 0) {
      await db.insert(systemLogs).values({
        source: 'cron-ticker-sync',
        level: 'WARN',
        message: `Detected and marked ${delisted.length} delisted EGX ticker(s): ${delisted.join(', ')}`,
        metadata: {
          delistedTickersCount: delisted.length,
          delistedTickers: delisted,
        },
      }).catch(err => {
        console.error('Failed to write ticker delisting system log:', err);
      });
    }

    if (reactivated.length > 0) {
      await db.insert(systemLogs).values({
        source: 'cron-ticker-sync',
        level: 'INFO',
        message: `Reactivated ${reactivated.length} EGX ticker(s) that resumed trading: ${reactivated.join(', ')}`,
        metadata: {
          reactivatedTickersCount: reactivated.length,
          reactivatedTickers: reactivated,
        },
      }).catch(err => {
        console.error('Failed to write ticker reactivation system log:', err);
      });
    }

    // Invalidate local in-memory and edge caches so state updates immediately
    invalidateTickersMemCache();
    invalidatePrecomputedMarketCache();

    return {
      totalScanned: scanned.length,
      newlyAdded: missing.map(m => m.symbol),
      delisted,
      reactivated,
      skippedCount: scanned.length - missing.length,
    };
  } catch (error: any) {
    console.error('syncEGXTickersFromExchange failed:', error);
    return {
      totalScanned: 0,
      newlyAdded: [],
      delisted: [],
      reactivated: [],
      skippedCount: 0,
      error: error?.message || String(error),
    };
  }
}
