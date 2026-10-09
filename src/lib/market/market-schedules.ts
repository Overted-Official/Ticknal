/**
 * Market schedules & asset classification for intraday live feeds.
 * Time calculations are strictly normalized to Egypt Time (Africa/Cairo).
 */

export type AssetClass = 'EGX' | 'METALS' | 'FUNDS' | 'EXCLUDED';

export interface CairoTimeInfo {
  weekday: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  hour: number;      // 0 - 23
  minute: number;    // 0 - 59
  dateStr: string;   // YYYY-MM-DD
}

/**
 * Extracts Cairo local time parts regardless of server timezone.
 */
export function getCairoTime(date: Date = new Date()): CairoTimeInfo {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekday = (map.weekday as CairoTimeInfo['weekday']) || 'Sun';
  const dayOfWeek = weekdayMap[weekday] ?? 0;
  const hour = parseInt(map.hour || '0', 10);
  const minute = parseInt(map.minute || '0', 10);
  const dateStr = `${map.year}-${map.month}-${map.day}`;

  return {
    weekday,
    dayOfWeek,
    hour,
    minute,
    dateStr,
  };
}

/**
 * Categorizes an instrument into its appropriate asset bucket.
 */
export function getAssetClass(symbol: string, sector?: string | null): AssetClass {
  const clean = symbol.replace('.CA', '').trim().toUpperCase();

  // 1. Excluded: Funds (NAV only, no intraday)
  if (sector === 'Funds' || clean.startsWith('SNDUK') || clean.includes('FUND')) {
    return 'FUNDS';
  }

  // 2. Metals & Commodities (24/5 global COMEX trading)
  if (clean === 'GC1!' || clean === 'SI1!' || clean === 'GOLD' || clean === 'SILVER') {
    return 'METALS';
  }

  // 3. Macro / Other
  if (sector === 'Macro' && clean !== 'USDEGP' && clean !== 'EUREGP') {
    return 'EXCLUDED';
  }

  // 4. Default: Egyptian Exchange equity or index
  return 'EGX';
}

/**
 * Returns true if the market for the specified asset class is actively trading.
 */
export function isMarketOpen(assetClass: AssetClass, date: Date = new Date()): boolean {
  if (assetClass === 'FUNDS' || assetClass === 'EXCLUDED') {
    return false;
  }

  const cairo = getCairoTime(date);

  // EGX Trading Hours:
  // Sunday through Thursday, 10:00 AM to 2:30 PM Cairo Time (buffer to 14:35)
  if (assetClass === 'EGX') {
    const isTradingDay = cairo.dayOfWeek >= 0 && cairo.dayOfWeek <= 4; // Sun (0) to Thu (4)
    if (!isTradingDay) return false;

    const timeInMinutes = cairo.hour * 60 + cairo.minute;
    const openTime = 10 * 60;      // 10:00 AM (600 mins)
    const closeTime = 14 * 60 + 35; // 02:35 PM (875 mins)

    return timeInMinutes >= openTime && timeInMinutes <= closeTime;
  }

  // Precious Metals (COMEX GC1!, SI1!) Global 24/5 Schedule:
  // Opens Sunday ~23:00 Cairo time, closes Friday ~23:00 Cairo time.
  // Saturday is closed. Sunday day is closed.
  if (assetClass === 'METALS') {
    // Saturday: closed all day
    if (cairo.dayOfWeek === 6) return false;

    // Sunday: closed until 23:00 Cairo
    if (cairo.dayOfWeek === 0) {
      return cairo.hour >= 23;
    }

    // Friday: closes at 23:00 Cairo
    if (cairo.dayOfWeek === 5) {
      return cairo.hour < 23;
    }

    // Monday to Thursday: open 24 hours (with brief 1-hr daily maintenance around 23:00-00:00)
    return true;
  }

  return false;
}

/**
 * Translates an internal symbol into its corresponding TradingView market symbol.
 */
export function getTradingViewSymbol(symbol: string): string {
  const clean = symbol.replace('.CA', '').trim().toUpperCase();

  if (clean === 'GC1!') return 'COMEX:GC1!';
  if (clean === 'SI1!') return 'COMEX:SI1!';
  if (clean === 'USDEGP') return 'FX_IDC:USDEGP';
  if (clean === 'EUREGP') return 'FX_IDC:EUREGP';
  if (clean === 'EGX30') return 'EGX:EGX30CAPPED';
  if (clean === 'EGX70') return 'EGX:EGX70EWI';
  if (clean === 'EGX100') return 'EGX:EGX100EWI';

  return `EGX:${clean}`;
}
