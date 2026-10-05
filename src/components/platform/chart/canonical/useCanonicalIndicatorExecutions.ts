'use client';

import { useMemo } from 'react';

import type {
  CanonicalIndicatorSelection,
  CanonicalIndicatorViewState,
} from '@/indicators/canonical/types';
import { useCanonicalIndicatorFrame } from '../useCanonicalIndicatorFrame';
import { evaluateActiveIndicators } from './evaluate-active-indicators';

interface UseCanonicalIndicatorExecutionsInput {
  readonly selections: readonly CanonicalIndicatorSelection[];
  readonly symbol: string;
  readonly timeframe: string;
}

export function useCanonicalIndicatorExecutions({
  selections,
  symbol,
  timeframe,
}: UseCanonicalIndicatorExecutionsInput) {
  const frameState = useCanonicalIndicatorFrame({
    enabled: selections.length > 0,
    symbol,
    timeframe,
  });

  return useMemo(() => {
    if (frameState.status === 'ok') {
      return { frameState, ...evaluateActiveIndicators(selections, frameState.frame, new Date().toISOString()) };
    }
    const state: CanonicalIndicatorViewState = frameState.status === 'loading'
      ? { status: 'loading' }
      : frameState.status === 'unavailable'
        ? { status: 'unavailable', diagnostics: frameState.diagnostics }
        : { status: 'error', message: frameState.message };
    return {
      frameState,
      executions: [],
      states: Object.fromEntries(selections.map((selection) => [selection.instanceId, state])),
    };
  }, [frameState, selections]);
}
