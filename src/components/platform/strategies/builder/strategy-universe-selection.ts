import { BACKTEST_GROUPS } from './strategy-builder-fixtures';

export const UNIVERSE_STORAGE_PREFIX = 'ticknal.strategy-studio.company-universe.v1.';
export const STRATEGY_UNIVERSE_SYMBOLS = BACKTEST_GROUPS.flatMap((group) => group.tickers.map((ticker) => ticker.symbol));

export function parseSelectedUniverse(raw: string | null, knownSymbols: readonly string[] = STRATEGY_UNIVERSE_SYMBOLS): string[] {
  if (raw === null) return [...knownSymbols];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...knownSymbols];
    const known = new Set(knownSymbols);
    return [...new Set(parsed.filter((value): value is string => typeof value === 'string' && known.has(value)))];
  } catch {
    return [...knownSymbols];
  }
}

export function readSelectedUniverse(strategyId: string, knownSymbols: readonly string[] = STRATEGY_UNIVERSE_SYMBOLS): string[] {
  if (typeof window === 'undefined') return [...knownSymbols];
  try {
    return parseSelectedUniverse(localStorage.getItem(`${UNIVERSE_STORAGE_PREFIX}${strategyId}`), knownSymbols);
  } catch {
    return [...knownSymbols];
  }
}
