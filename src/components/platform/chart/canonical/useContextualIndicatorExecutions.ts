'use client';

import { useEffect, useMemo, useReducer } from 'react';
import type { Diagnostic } from '@ticknal/quant-engine/canonical';

import type { CanonicalIndicatorSelection } from '@/indicators/canonical/types';
import {
  contextualRequestReducer,
  type ContextualExecutionItem,
  type ContextualRequestState,
} from './contextual-execution';

interface UseContextualIndicatorExecutionsInput {
  readonly selections: readonly CanonicalIndicatorSelection[];
  readonly symbol: string;
  readonly timeframe: string;
}

type ContextualResponse =
  | { readonly status: 'ok'; readonly results: readonly ContextualExecutionItem[] }
  | { readonly status: 'unavailable'; readonly diagnostics?: readonly Diagnostic[]; readonly error?: string }
  | { readonly status: 'invalid' | 'unauthorized'; readonly error?: string };

export function useContextualIndicatorExecutions({
  selections,
  symbol,
  timeframe,
}: UseContextualIndicatorExecutionsInput): ContextualRequestState {
  const requestKey = useMemo(
    () => selections.length === 0
      ? null
      : JSON.stringify({ symbol, timeframe, selections }),
    [selections, symbol, timeframe],
  );
  const [store, dispatch] = useReducer(contextualRequestReducer, {
    currentRequestKey: null,
    state: { status: 'idle' },
  });

  useEffect(() => {
    if (!requestKey || selections.length === 0) {
      dispatch({ type: 'reset' });
      return;
    }

    const controller = new AbortController();
    dispatch({ type: 'begin', requestKey });

    const load = async () => {
      try {
        const response = await fetch('/api/indicators/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, timeframe, selections }),
          cache: 'no-store',
          signal: controller.signal,
        });
        const body = (await response.json()) as ContextualResponse;
        if (controller.signal.aborted) return;

        if (response.ok && body.status === 'ok' && Array.isArray(body.results)) {
          dispatch({
            type: 'settle', requestKey,
            state: { status: 'ok', items: body.results },
          });
          return;
        }
        if (response.status === 422 && body.status === 'unavailable' && body.diagnostics) {
          dispatch({
            type: 'settle', requestKey,
            state: { status: 'unavailable', diagnostics: body.diagnostics },
          });
          return;
        }
        dispatch({
          type: 'settle', requestKey,
          state: {
            status: 'error',
            message: ('error' in body ? body.error : undefined)
              ?? `Contextual indicator request failed (${response.status}).`,
          },
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({
          type: 'settle', requestKey,
          state: {
            status: 'error',
            message: error instanceof Error ? error.message : 'Contextual indicator request failed.',
          },
        });
      }
    };

    void load();
    return () => controller.abort();
  }, [requestKey, selections, symbol, timeframe]);

  return requestKey && store.currentRequestKey === requestKey
    ? store.state
    : requestKey
      ? { status: 'loading' }
      : { status: 'idle' };
}
