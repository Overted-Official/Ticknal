'use client';

import { useEffect, useMemo, useState } from 'react';
import type { UniverseBacktestItem } from '../../../../lib/strategies/server/run-simple-universe-backtest';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import type { BacktestAssumptions } from '../../../../lib/strategies/run-simple-backtest';
import { parseUniverseBacktestResponse, type ParsedUniverseBacktestResponse } from './strategy-universe-analytics';
import { runUniverseBatches } from './strategy-universe-batches';
import { createUniverseResultCache } from './strategy-universe-cache';

const completedResults = createUniverseResultCache(5 * 60_000);

export type UniverseBacktestState = ParsedUniverseBacktestResponse
  | { readonly status: 'idle' | 'selection-required' | 'unauthorized' }
  | { readonly status: 'loading'; readonly completed: number; readonly total: number; readonly results: readonly UniverseBacktestItem[] }
  | { readonly status: 'failed'; readonly completed: number; readonly total: number; readonly results: readonly UniverseBacktestItem[]; readonly retry: () => void };

export function useSimpleUniverseBacktest({ program, symbols, startDate, endDate, assumptions }: {
  readonly program: ExecutableStrategyProgram;
  readonly symbols: readonly string[] | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly assumptions: BacktestAssumptions;
}): UniverseBacktestState {
  const requestKey = useMemo(() => symbols && symbols.length > 0 && startDate <= endDate
    ? JSON.stringify({ symbols, program, assumptions, period: { startDate, endDate } })
    : null, [symbols, program, assumptions, startDate, endDate]);
  const [resolved, setResolved] = useState<{ readonly key: string; readonly value: UniverseBacktestState } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retry = () => setRetryCount((value) => value + 1);
  const cachedResult = requestKey ? completedResults.get(requestKey) : null;

  useEffect(() => {
    if (!requestKey || !symbols) return;
    const cached = completedResults.get(requestKey);
    if (cached?.status === 'ready') return;
    const priorResults = cached?.status === 'loading' ? cached.results : [];
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const result = await runUniverseBatches(symbols.slice(priorResults.length), async (batch, signal) => {
          const response = await fetch('/api/strategies/backtest', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols: batch, program, assumptions, period: { startDate, endDate } }),
            cache: 'no-store', signal,
          });
          if (response.status === 401) return { status: 'unauthorized' as const };
          if (!response.ok) return { status: 'error' as const };
          const body: unknown = await response.json();
          return parseUniverseBacktestResponse(body, batch);
        }, controller.signal, (_completed, results) => {
          if (!controller.signal.aborted) {
            const merged = [...priorResults, ...results];
            completedResults.setPartial(requestKey, merged, symbols.length);
            setResolved({ key: requestKey, value: { status: 'loading', completed: merged.length, total: symbols.length, results: merged } });
          }
        });
        if (!controller.signal.aborted) {
          const mergedResults = [...priorResults, ...result.results];
          if (result.status === 'ready') {
            const ready = { status: 'ready' as const, results: mergedResults };
            completedResults.set(requestKey, ready);
            setResolved({ key: requestKey, value: ready });
          } else if (result.status === 'unauthorized') {
            setResolved({ key: requestKey, value: { status: 'unauthorized' } });
          } else {
            completedResults.setPartial(requestKey, mergedResults, symbols.length);
            setResolved({ key: requestKey, value: { status: 'failed', completed: mergedResults.length, total: symbols.length, results: mergedResults, retry } });
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          const partial = completedResults.get(requestKey);
          const results = partial?.status === 'loading' ? partial.results : priorResults;
          setResolved({ key: requestKey, value: { status: 'failed', completed: results.length, total: symbols.length, results, retry } });
        }
      }
    }, 650);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [requestKey, symbols, program, assumptions, startDate, endDate, retryCount]);

  if (!symbols) return { status: 'idle' };
  if (symbols.length === 0) return { status: 'selection-required' };
  if (!requestKey) return { status: 'error' };
  return resolved?.key === requestKey ? resolved.value : cachedResult ?? { status: 'loading', completed: 0, total: symbols.length, results: [] };
}
