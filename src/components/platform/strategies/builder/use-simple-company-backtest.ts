'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';

export type CompanyBacktestResult =
  | { readonly status: 'ready'; readonly symbol: string; readonly metrics: { readonly totalReturnPct: number; readonly maxDrawdownPct: number; readonly closedTrades: number; readonly winRatePct: number | null }; readonly sourceRevision: string; readonly asOf: string }
  | { readonly status: 'unavailable'; readonly code: string }
  | { readonly status: 'error' };

export type CompanyBacktestState = CompanyBacktestResult | { readonly status: 'idle' | 'loading' | 'unauthorized' };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseCompanyBacktestResponse(value: unknown, symbol: string): CompanyBacktestResult {
  if (!record(value) || value.status !== 'ok' || !Array.isArray(value.results) || value.results.length !== 1) return { status: 'error' };
  const item: unknown = value.results[0];
  if (!record(item) || item.symbol !== symbol) return { status: 'error' };
  if (item.status === 'unavailable' || item.status === 'invalid') {
    return { status: 'unavailable', code: typeof item.code === 'string' ? item.code : 'UNKNOWN' };
  }
  if (item.status !== 'ok' || !record(item.metrics)) return { status: 'error' };
  const metrics = item.metrics;
  if (typeof metrics.totalReturnPct !== 'number' || !Number.isFinite(metrics.totalReturnPct)
    || typeof metrics.maxDrawdownPct !== 'number' || !Number.isFinite(metrics.maxDrawdownPct)
    || typeof metrics.closedTrades !== 'number' || !Number.isSafeInteger(metrics.closedTrades) || metrics.closedTrades < 0
    || (metrics.winRatePct !== null && (typeof metrics.winRatePct !== 'number' || !Number.isFinite(metrics.winRatePct)))
    || typeof item.sourceRevision !== 'string' || typeof item.asOf !== 'string') return { status: 'error' };
  return {
    status: 'ready', symbol,
    metrics: { totalReturnPct: metrics.totalReturnPct, maxDrawdownPct: metrics.maxDrawdownPct, closedTrades: metrics.closedTrades, winRatePct: metrics.winRatePct as number | null },
    sourceRevision: item.sourceRevision, asOf: item.asOf,
  };
}

export function useSimpleCompanyBacktest({ enabled, program, symbol, startDate, endDate }: {
  readonly enabled: boolean;
  readonly program: ExecutableStrategyProgram | null;
  readonly symbol: string;
  readonly startDate: string;
  readonly endDate: string;
}): CompanyBacktestState {
  const requestKey = useMemo(() => enabled && program && startDate <= endDate
    ? JSON.stringify({ symbols: [symbol], program, assumptions: { initialCapital: 100_000, feeBps: 10 }, period: { startDate, endDate } })
    : null, [enabled, program, symbol, startDate, endDate]);
  const [resolved, setResolved] = useState<{ readonly key: string; readonly value: CompanyBacktestState } | null>(null);

  useEffect(() => {
    if (!requestKey) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/strategies/backtest', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestKey,
          cache: 'no-store', signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) { setResolved({ key: requestKey, value: { status: 'unauthorized' } }); return; }
        if (!response.ok) { setResolved({ key: requestKey, value: { status: 'error' } }); return; }
        const body: unknown = await response.json();
        if (!controller.signal.aborted) setResolved({ key: requestKey, value: parseCompanyBacktestResponse(body, symbol) });
      } catch {
        if (!controller.signal.aborted) setResolved({ key: requestKey, value: { status: 'error' } });
      }
    }, 400);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [requestKey, symbol]);

  if (!requestKey) return { status: 'idle' };
  return resolved?.key === requestKey ? resolved.value : { status: 'loading' };
}
