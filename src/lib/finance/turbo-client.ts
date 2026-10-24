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
 * Actively held positions in the 10-slot Turbo portfolio (with 20% Sector Cap).
 */
export const TURBO_ACTIVE_POSITIONS: ReadonlySet<string> = new Set([
  'AALR',
  'CPCI',
  'GTWL',
  'OBRI',
  'SVCE',
  'GRCA',
  'AFMC',
  'ISMQ',
  'SMFR',
  'NINH',
]);

/**
 * Historical entries executed by the Turbo Portfolio manager (symbol:entryDate).
 */
export const TURBO_EXECUTED_ENTRIES: ReadonlySet<string> = new Set([
  'AALR:2026-08-06',
  'CPCI:2026-08-17',
  'GTWL:2026-08-26',
  'OBRI:2026-08-30',
  'SVCE:2026-09-01',
  'GRCA:2026-09-02',
  'AFMC:2026-09-08',
  'ISMQ:2026-09-16',
  'SMFR:2026-09-17',
  'NINH:2026-10-04',
  'SVCE:2025-11-30',
  'EBSC:2025-12-03',
  'IFAP:2025-11-23',
  'RMDA:2025-08-26',
  'ISMQ:2025-11-27',
  'CANA:2025-12-10',
  'GGRN:2025-12-04',
  'OCPH:2026-01-25',
  'INFI:2025-12-23',
  'GRCA:2026-03-08',
  'EGTS:2026-04-26',
  'MENA:2026-03-09',
  'UBEE:2026-06-02',
  'AFMC:2026-02-26',
  'GTWL:2026-05-18',
  'ISMQ:2026-04-09',
  'GTWL:2026-07-07',
  'ADRI:2026-06-03',
  'AALR:2026-05-10',
  'ADCI:2026-06-07',
  'CPCI:2026-07-07',
  'OBRI:2026-02-24',
  'EALR:2026-01-08',
  'GTWL:2026-07-26',
  'ADRI:2026-07-21',
  'GRCA:2026-06-17',
  'NINH:2026-08-20',
  'NCCW:2026-08-26',
  'TALM:2026-05-25',
  'CANA:2026-06-30',
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
 * Returns an array of all active Turbo qualified symbols.
 */
export function getTurboQualifiedSymbols(): string[] {
  return Array.from(TURBO_QUALIFIED_SYMBOLS);
}
