import { db } from "@/db";
import { psiCombinations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeTickerSymbol, resolvePsiParams, type PsiStrategyParams } from "./psiStrategy";

export type PsiParamsResolution = {
  params: PsiStrategyParams;
  parameterSource: string;
};

// In-memory cache for ultra-fast synchronous access: key is `${ticker}:${model}`
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
  try {
    const cleanSym = symbol ? normalizeTickerSymbol(symbol) : null;
    const query = cleanSym
      ? db.select().from(psiCombinations).where(eq(psiCombinations.tickerSymbol, cleanSym))
      : db.select().from(psiCombinations);

    const rows = await query;
    for (const row of rows) {
      const sym = normalizeTickerSymbol(row.tickerSymbol);
      const model = (row.model?.toLowerCase() === 'psi40' ? 'psi40' : 'psi8') as 'psi8' | 'psi40';
      const key = `${sym}:${model}`;
      
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
): PsiStrategyParams {
  return resolvePsiParamsWithSource(symbol, overrides).params;
}

export function resolvePsiParamsWithSource(
  symbol: string,
  overrides: Partial<PsiStrategyParams> = {},
): PsiParamsResolution {
  const ticker = normalizeTickerSymbol(symbol);
  const model = overrides.model ?? "psi8";
  const cacheKey = `${ticker}:${model}`;
  const cached = dbParamsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      params: resolvePsiParams(ticker, { ...cached.params, ...overrides }),
      parameterSource: cached.source,
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
): Promise<PsiParamsResolution> {
  const ticker = normalizeTickerSymbol(symbol);
  const model = overrides.model ?? "psi8";
  const cacheKey = `${ticker}:${model}`;

  if (!dbParamsCache.has(cacheKey)) {
    await fetchAndCachePsiCombinations(ticker);
  }

  return resolvePsiParamsWithSource(symbol, overrides);
}
