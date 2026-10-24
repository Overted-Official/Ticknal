import type { ExecutableStrategyProgram } from '../strategy-program';
import type { BacktestAssumptions, BacktestPeriod, BacktestResult } from '../run-simple-backtest';
import { normalizeLiveTicker } from '../../indicators/server/types';

export const MAX_UNIVERSE_SYMBOLS = 12;
const MAX_CONCURRENT_BACKTESTS = 3;

export interface UniverseBacktestRequest {
  readonly symbols: readonly string[];
  readonly program: ExecutableStrategyProgram;
  readonly assumptions: BacktestAssumptions;
  readonly period: BacktestPeriod;
  readonly detail?: boolean;
}

export type UniverseBacktestItem =
  | {
      readonly symbol: string;
      readonly status: 'ok';
      readonly metrics: Extract<BacktestResult, { status: 'ok' }>['metrics'];
      readonly sourceRevision: string;
      readonly asOf: string;
    }
  | { readonly symbol: string; readonly status: 'invalid' | 'unavailable'; readonly code: string };

export interface UniverseBacktestResult {
  readonly results: readonly UniverseBacktestItem[];
  readonly summary: {
    readonly requested: number;
    readonly completed: number;
    readonly unavailable: number;
    readonly positive: number;
  };
}

export async function runSimpleUniverseBacktest(
  request: UniverseBacktestRequest,
  runSymbol: (symbol: string, program: ExecutableStrategyProgram, assumptions: BacktestAssumptions, period: BacktestPeriod) => Promise<BacktestResult>,
): Promise<UniverseBacktestResult> {
  if (request.symbols.length === 0 || request.symbols.length > MAX_UNIVERSE_SYMBOLS) {
    throw new RangeError(`Select between 1 and at most ${MAX_UNIVERSE_SYMBOLS} symbols.`);
  }
  const symbols = request.symbols.map((raw) => {
    const symbol = normalizeLiveTicker(raw);
    if (!symbol) throw new RangeError('Invalid strategy symbol.');
    return symbol;
  });
  if (new Set(symbols).size !== symbols.length) throw new RangeError('The universe contains duplicate symbols.');

  const results: UniverseBacktestItem[] = new Array(symbols.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(MAX_CONCURRENT_BACKTESTS, symbols.length) }, async () => {
    while (nextIndex < symbols.length) {
      const index = nextIndex++;
      const symbol = symbols[index];
      try {
        const result = await runSymbol(symbol, request.program, request.assumptions, request.period);
        results[index] = result.status === 'ok'
          ? { symbol, status: 'ok', metrics: result.metrics, sourceRevision: result.provenance.sourceRevision, asOf: result.provenance.asOf }
          : { symbol, status: result.status, code: result.code };
      } catch {
        results[index] = { symbol, status: 'unavailable', code: 'BACKTEST_FAILED' };
      }
    }
  });
  await Promise.all(workers);
  return {
    results,
    summary: {
      requested: results.length,
      completed: results.filter((item) => item.status === 'ok').length,
      unavailable: results.filter((item) => item.status !== 'ok').length,
      positive: results.filter((item) => item.status === 'ok' && item.metrics.totalReturnPct > 0).length,
    },
  };
}
