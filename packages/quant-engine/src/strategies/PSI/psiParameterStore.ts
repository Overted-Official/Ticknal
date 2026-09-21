import { normalizeTickerSymbol, resolvePsiParams, type PsiStrategyParams } from "./psiStrategy";
import optimizedIntraday1hParams from "./optimized_intraday_1h_params.json";
import optimizedDailyParams from "./optimized_daily_params.json";

export type PsiParamsResolution = {
  params: PsiStrategyParams;
  parameterSource: string;
};

/**
 * Synchronously resolves PSI strategy parameters from the unified parameter files.
 * 
 * 1. For 1-Hour Intraday: Reads from optimized_intraday_1h_params.json
 * 2. For Daily timeframe: Reads from optimized_daily_params.json
 * 3. Fallback: Uses ticker preset or default strategy parameters.
 */
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

  // Check optimized daily parameter file
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
        atrDistance: pDaily.useAtr ? (pDaily.atrDistance ?? 4.0) : null,
        ...overrides,
      }),
      parameterSource: "optimized-daily-file",
    };
  }

  // Fallback to built-in presets or default parameters
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
  return resolvePsiParamsWithSource(symbol, overrides, timeframe);
}
