import { normalizeTickerSymbol, resolvePsiParams, type PsiStrategyParams } from "./psiStrategy";
import optimizedIntraday1hParams from "./optimized_intraday_1h_params.json";
import optimizedDailyParams from "./optimized_daily_params.json";

export type PsiParamsResolution = {
  params: PsiStrategyParams;
  parameterSource: string;
};

// In-memory cache for ultra-fast synchronous access: key is `${ticker}:${model}:${timeframe}`
const dbParamsCache = new Map<string, { params: Partial<PsiStrategyParams>; source: string; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function parseEntryLevels(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(Number).filter(Number.isFinite);
    } catch {}
  }
  return [14.6, 23.6, 38.2, 50.0, 61.8];
}

export async function fetchAndCachePsiCombinations(symbol?: string): Promise<void> {
  if (typeof window !== 'undefined') return;
  try {
    const { db } = await import('@/db');
    const { psiCombinations } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const cleanSym = symbol ? normalizeTickerSymbol(symbol) : null;
    const query = cleanSym
      ? db.select().from(psiCombinations).where(eq(psiCombinations.tickerSymbol, cleanSym))
      : db.select().from(psiCombinations);

    const rows = await query;
    for (const row of rows) {
      const sym = normalizeTickerSymbol(row.tickerSymbol);
      const model = (row.model?.toLowerCase() === 'psi40' ? 'psi40' : 'psi8') as 'psi8' | 'psi40';
      const key = `${sym}:${model}:D`;
      
      const entryLevels = parseEntryLevels(row.entryLevels);

      dbParamsCache.set(key, {
        params: {
          model,
          entryLevels,
          useAym: row.useAym,
          aymMultiplier: row.aymMultiplier !== null && row.aymMultiplier !== undefined ? Number(row.aymMultiplier) : null,
          aymLimit: row.aymLimit !== null && row.aymLimit !== undefined ? Number(row.aymLimit) : null,
          useAtr: row.useAtr,
          atrDistance: row.atrDistance !== null && row.atrDistance !== undefined ? Number(row.atrDistance) : null,
        },
        source: `db:psi_combinations (${model})`,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.error('Error fetching psi_combinations from DB:', err);
  }
}

export function resolvePsiParamsFromStore(
  symbol: string,
  overrides: Partial<PsiStrategyParams> = {},
  timeframe: string = 'D'
): PsiStrategyParams {
  return resolvePsiParamsWithSource(symbol, overrides, timeframe).params;
}

export function resolvePsiParamsWithSource(
  symbol: string,
  overrides: Partial<PsiStrategyParams> = {},
  timeframe: string = 'D'
): PsiParamsResolution {
  const ticker = normalizeTickerSymbol(symbol);
  const model = overrides.model ?? "psi8";

  // Check if 1-Hour Intraday
  const is1H = timeframe === '1H' || timeframe === '60' || timeframe === '1h';
  if (is1H) {
    const p1h = (optimizedIntraday1hParams as Record<string, any>)[ticker];
    if (p1h) {
      return {
        params: resolvePsiParams(ticker, {
          model: (p1h.model as 'psi8' | 'psi40') || 'psi8',
          entryLevels: p1h.entryLevels ?? [14.6],
          useAym: p1h.useAym ?? false,
          aymMultiplier: p1h.aymMultiplier ?? 8,
          aymLimit: p1h.aymLimit ?? 78.6,
          useAtr: p1h.useAtr ?? true,
          atrDistance: p1h.atrDistance ?? 4.0,
          ...overrides,
        }),
        parameterSource: "optimized-1h-intraday",
      };
    }
  }

  const cacheKey = `${ticker}:${model}:D`;
  const cached = dbParamsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      params: resolvePsiParams(ticker, { ...cached.params, ...overrides }),
      parameterSource: cached.source,
    };
  }

  // Check optimized daily parameter store
  const pDaily = (optimizedDailyParams as Record<string, any>)[ticker];
  if (pDaily) {
    return {
      params: resolvePsiParams(ticker, {
        model: (pDaily.model as 'psi8' | 'psi40') || model,
        entryLevels: pDaily.entryLevels ?? [14.6, 23.6, 38.2, 50.0, 61.8],
        useAym: pDaily.useAym ?? true,
        aymMultiplier: pDaily.aymMultiplier ?? 8,
        aymLimit: pDaily.aymLimit ?? 78.6,
        useAtr: pDaily.useAtr ?? true,
        atrDistance: pDaily.atrDistance ?? 4.0,
        ...overrides,
      }),
      parameterSource: "optimized-daily-preset",
    };
  }

  // Trigger background fetch if on server side and cache missing
  if (typeof window === 'undefined') {
    fetchAndCachePsiCombinations(ticker).catch(() => {});
  }

  return {
    params: resolvePsiParams(ticker, overrides),
    parameterSource: "ticker-preset-or-default",
  };
}

export async function resolvePsiParamsAsync(
  symbol: string,
  overrides: Partial<PsiStrategyParams> = {},
  timeframe: string = 'D'
): Promise<PsiParamsResolution> {
  const ticker = normalizeTickerSymbol(symbol);
  const model = overrides.model ?? "psi8";
  const cacheKey = `${ticker}:${model}:D`;

  if (!dbParamsCache.has(cacheKey) && timeframe !== '1H' && timeframe !== '60') {
    await fetchAndCachePsiCombinations(ticker);
  }

  return resolvePsiParamsWithSource(symbol, overrides, timeframe);
}
