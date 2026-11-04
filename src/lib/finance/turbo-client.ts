/**
 * Client-safe utilities for Ticknal Turbo Portfolio Qualification.
 * Contains zero Node.js/fs dependencies, safe to use in 'use client' components.
 */

export const TURBO_QUALIFIED_SYMBOLS: ReadonlySet<string> = new Set([
  'AALR',
  'ABUK',
  'ACTF',
  'ADCI',
  'ADRI',
  'AFMC',
  'AMES',
  'AMIA',
  'AMII',
  'AXPH',
  'BIOC',
  'CANA',
  'CERA',
  'CPCI',
  'CPME',
  'EALR',
  'GBCO',
  'GGRN',
  'GOUR',
  'GRCA',
  'GTWL',
  'HBCO',
  'ISMQ',
  'MENA',
  'MIPH',
  'NINH',
  'OBRI',
  'OCPH',
  'PHTV',
  'RMDA',
  'SMFR',
  'TALM',
  'TWSA',
  'TYCN',
  'WKOL',
]);

/**
 * Actively held positions in the 10-slot Turbo portfolio (with 20% Sector Cap & 1.5-Sigma Stop Loss).
 */
export const TURBO_ACTIVE_POSITIONS: ReadonlySet<string> = new Set([
  'AALR',
  'BIOC',
  'CANA',
  'CPCI',
  'CPME',
  'OBRI',
  'SMFR',
  'SVCE',
  'TALM',
]);

/**
 * Historical entries executed by the Turbo Portfolio manager (symbol:entryDate).
 */
export const TURBO_EXECUTED_ENTRIES: ReadonlySet<string> = new Set([
  'AALR:2026-01-27',
  'AALR:2026-05-10',
  'AALR:2026-08-06',
  'ADCI:2026-06-07',
  'ADRI:2026-06-03',
  'ADRI:2026-07-21',
  'AFMC:2026-02-26',
  'AFMC:2026-09-08',
  'BIOC:2026-09-14',
  'CANA:2025-12-10',
  'CANA:2026-06-30',
  'CANA:2026-10-13',
  'CPCI:2026-07-07',
  'CPCI:2026-08-17',
  'CPME:2026-10-06',
  'EALR:2026-01-08',
  'EGTS:2026-04-26',
  'GRCA:2026-03-08',
  'GRCA:2026-06-17',
  'GRCA:2026-09-02',
  'GTWL:2026-05-18',
  'GTWL:2026-07-07',
  'GTWL:2026-07-26',
  'GTWL:2026-08-26',
  'HBCO:2026-10-15',
  'INFI:2025-12-23',
  'ISMQ:2026-04-09',
  'ISMQ:2026-09-16',
  'MENA:2026-03-09',
  'NCCW:2026-08-26',
  'NINH:2026-08-20',
  'OBRI:2026-02-24',
  'OBRI:2026-08-30',
  'OCPH:2026-01-25',
  'SMFR:2026-09-17',
  'SVCE:2026-09-01',
  'TALM:2026-05-25',
  'TALM:2026-10-04',
  'UBEE:2026-06-02',
]);

export type TurboSignalStatus = 'entered' | 'candidate' | 'none';

/**
 * Fast synchronous check whether a ticker is qualified in the active Ticknal Turbo basket.
 */
export function isTurboQualified(symbol?: string | null): boolean {
  if (!symbol) return false;
  const clean = symbol.replace(/\.CA$/i, '').trim().toUpperCase();
  return TURBO_QUALIFIED_SYMBOLS.has(clean);
}

/**
 * Checks whether a signal for a ticker was actively entered / allocated by the Turbo bot.
 * - 'entered': The bot executed an entry on or near that signal date (capital allocated).
 * - 'candidate': Qualified constituent in the Turbo basket, but no trade was entered on this signal (at capacity / 0 EGP allocated).
 * - 'none': Not in the Turbo qualified basket.
 */
export function getTurboSignalStatus(
  symbol?: string | null,
  signalDate?: string | null
): TurboSignalStatus {
  if (!symbol) return 'none';
  const clean = symbol.replace(/\.CA$/i, '').trim().toUpperCase();
  if (!TURBO_QUALIFIED_SYMBOLS.has(clean)) return 'none';

  if (signalDate) {
    const cleanDate = signalDate.split('T')[0];
    if (TURBO_EXECUTED_ENTRIES.has(`${clean}:${cleanDate}`)) {
      return 'entered';
    }

    // Check ±3 calendar days window to account for weekend / next-market-session executions
    const sigTime = Date.parse(cleanDate);
    if (!isNaN(sigTime)) {
      for (const entry of TURBO_EXECUTED_ENTRIES) {
        if (!entry.startsWith(`${clean}:`)) continue;
        const entryDate = entry.slice(clean.length + 1);
        const entryTime = Date.parse(entryDate);
        if (!isNaN(entryTime) && Math.abs(entryTime - sigTime) <= 3 * 86400000) {
          return 'entered';
        }
      }
    }
  } else if (TURBO_ACTIVE_POSITIONS.has(clean)) {
    return 'entered';
  }

  return 'candidate';
}

/**
 * Fast synchronous check if a symbol is actively held in the Turbo portfolio.
 */
export function isTurboActive(symbol: string): boolean {
  const clean = symbol.replace(/\.CA$/i, '').trim().toUpperCase();
  return TURBO_ACTIVE_POSITIONS.has(clean);
}

/**
 * Returns an array of all active Turbo qualified symbols.
 */
export function getTurboQualifiedSymbols(): string[] {
  return Array.from(TURBO_QUALIFIED_SYMBOLS);
}
