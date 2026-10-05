'use client';

import { useEffect, useReducer } from 'react';
import type { Diagnostic, TimeSeriesFrame } from '@ticknal/quant-engine/canonical';

export type FrameState =
  | { readonly status: 'loading' }
  | { readonly status: 'ok'; readonly frame: TimeSeriesFrame }
  | { readonly status: 'unavailable'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly status: 'error'; readonly message: string };

interface UseCanonicalIndicatorFrameInput {
  readonly enabled: boolean;
  readonly symbol: string;
  readonly timeframe: string;
}

type FrameResponse =
  | { readonly status: 'ok'; readonly frame: TimeSeriesFrame }
  | { readonly status: 'unavailable'; readonly diagnostics: readonly Diagnostic[] };

export interface FrameRequestStore {
  readonly currentRequestKey: string | null;
  readonly state: FrameState;
}

export type FrameRequestAction =
  | { readonly type: 'begin'; readonly requestKey: string }
  | { readonly type: 'settle'; readonly requestKey: string; readonly state: FrameState };

export function frameRequestReducer(
  store: FrameRequestStore,
  action: FrameRequestAction,
): FrameRequestStore {
  if (action.type === 'begin') {
    return { currentRequestKey: action.requestKey, state: { status: 'loading' } };
  }
  if (store.currentRequestKey !== action.requestKey) return store;
  return { currentRequestKey: store.currentRequestKey, state: action.state };
}

export function useCanonicalIndicatorFrame({
  enabled,
  symbol,
  timeframe,
}: UseCanonicalIndicatorFrameInput): FrameState {
  const requestKey = enabled ? `${symbol}:${timeframe}` : null;
  const [store, dispatch] = useReducer(frameRequestReducer, {
    currentRequestKey: null,
    state: { status: 'loading' },
  });

  useEffect(() => {
    if (!enabled || !requestKey) return;

    const controller = new AbortController();
    dispatch({ type: 'begin', requestKey });

    const load = async () => {
      try {
        const params = new URLSearchParams({ ticker: symbol, timeframe });
        const response = await fetch(`/api/indicators/frame?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const body = (await response.json()) as FrameResponse | { readonly error?: string };
        if (controller.signal.aborted) return;

        if (response.ok && 'status' in body && body.status === 'ok') {
          dispatch({ type: 'settle', requestKey, state: { status: 'ok', frame: body.frame } });
          return;
        }
        if (response.status === 422 && 'status' in body && body.status === 'unavailable') {
          dispatch({
            type: 'settle',
            requestKey,
            state: { status: 'unavailable', diagnostics: body.diagnostics },
          });
          return;
        }

        dispatch({
          type: 'settle',
          requestKey,
          state: {
            status: 'error',
            message:
              'error' in body && body.error
                ? body.error
                : `Frame request failed (${response.status}).`,
          },
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({
          type: 'settle',
          requestKey,
          state: {
            status: 'error',
            message: error instanceof Error ? error.message : 'Frame request failed.',
          },
        });
      }
    };

    void load();
    return () => controller.abort();
  }, [enabled, requestKey, symbol, timeframe]);

  return requestKey && store.currentRequestKey === requestKey
    ? store.state
    : { status: 'loading' };
}
