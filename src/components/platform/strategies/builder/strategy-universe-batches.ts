import type { UniverseBacktestItem } from '../../../../lib/strategies/server/run-simple-universe-backtest';
import type { ParsedUniverseBacktestResponse } from './strategy-universe-analytics';

export const MAX_SYMBOLS_PER_BACKTEST_REQUEST = 12;

export type UniverseBatchResponse = ParsedUniverseBacktestResponse | { readonly status: 'unauthorized' };

export function chunkUniverseSymbols(symbols: readonly string[]): readonly (readonly string[])[] {
  const batches: string[][] = [];
  for (let index = 0; index < symbols.length; index += MAX_SYMBOLS_PER_BACKTEST_REQUEST) {
    batches.push(symbols.slice(index, index + MAX_SYMBOLS_PER_BACKTEST_REQUEST));
  }
  return batches;
}

export async function runUniverseBatches(
  symbols: readonly string[],
  requestBatch: (symbols: readonly string[], signal: AbortSignal) => Promise<UniverseBatchResponse>,
  signal: AbortSignal,
  onProgress: (completed: number, results: readonly UniverseBacktestItem[]) => void,
): Promise<UniverseBatchResponse> {
  const results: UniverseBacktestItem[] = [];
  for (const batch of chunkUniverseSymbols(symbols)) {
    if (signal.aborted) throw new DOMException('Backtest cancelled.', 'AbortError');
    const response = await requestBatch(batch, signal);
    if (response.status !== 'ready') return response;
    results.push(...response.results);
    onProgress(results.length, [...results]);
  }
  return { status: 'ready', results };
}
