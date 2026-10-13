'use client';

import { useEffect, useMemo, useState } from 'react';
import type { UniverseBacktestItem } from '../../../../lib/strategies/server/run-simple-universe-backtest';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import { parseUniverseBacktestResponse, type ParsedUniverseBacktestResponse } from './strategy-universe-analytics';
import { runUniverseBatches } from './strategy-universe-batches';

export type UniverseBacktestState = ParsedUniverseBacktestResponse
  | { readonly status: 'idle' | 'selection-required' | 'unauthorized' }
  | { readonly status: 'loading'; readonly completed: number; readonly total: number; readonly results: readonly UniverseBacktestItem[] };

export function useSimpleUniverseBacktest({ program, symbols, startDate, endDate }: {
  readonly program: ExecutableStrategyProgram;
  readonly symbols: readonly string[] | null;
  readonly startDate: string;
  readonly endDate: string;
}): UniverseBacktestState {
  const requestKey = useMemo(() => symbols && symbols.length > 0 && startDate <= endDate
    ? JSON.stringify({ symbols, program, assumptions: { initialCapital: 100_000, feeBps: 10 }, period: { startDate, endDate } })
    : null, [symbols, program, startDate, endDate]);
  const [resolved, setResolved] = useState<{ readonly key: string; readonly value: UniverseBacktestState } | null>(null);

  useEffect(() => {
    if (!requestKey || !symbols) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const result = await runUniverseBatches(symbols, async (batch, signal) => {
          const response = await fetch('/api/strategies/backtest', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols: batch, program, assumptions: { initialCapital: 100_000, feeBps: 10 }, period: { startDate, endDate } }),
            cache: 'no-store', signal,
          });
          if (response.status === 401) return { status: 'unauthorized' as const };
          if (!response.ok) return { status: 'error' as const };
          const body: unknown = await response.json();
          return parseUniverseBacktestResponse(body, batch);
        }, controller.signal, (completed, results) => {
          if (!controller.signal.aborted) setResolved({ key: requestKey, value: { status: 'loading', completed, total: symbols.length, results } });
        });
        if (!controller.signal.aborted) setResolved({ key: requestKey, value: result });
      } catch {
        if (!controller.signal.aborted) setResolved({ key: requestKey, value: { status: 'error' } });
      }
    }, 650);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [requestKey, symbols, program, startDate, endDate]);

  if (!symbols) return { status: 'idle' };
  if (symbols.length === 0) return { status: 'selection-required' };
  if (!requestKey) return { status: 'error' };
  return resolved?.key === requestKey ? resolved.value : { status: 'loading', completed: 0, total: symbols.length, results: [] };
}
