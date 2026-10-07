'use client';

import { useMemo } from 'react';

import type {
  CanonicalIndicatorSelection,
  CanonicalIndicatorViewState,
} from '@/indicators/canonical/types';
import { useCanonicalIndicatorFrame } from '../useCanonicalIndicatorFrame';
import {
  mergeCanonicalIndicatorEvaluations,
  partitionCanonicalSelections,
} from './contextual-execution';
import { evaluateActiveIndicators } from './evaluate-active-indicators';
import { useContextualIndicatorExecutions } from './useContextualIndicatorExecutions';

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
  const partitioned = useMemo(() => partitionCanonicalSelections(selections), [selections]);
  const frameState = useCanonicalIndicatorFrame({
    enabled: partitioned.local.length > 0,
    symbol,
    timeframe,
  });
  const contextualState = useContextualIndicatorExecutions({
    selections: partitioned.contextual,
    symbol,
    timeframe,
  });

  return useMemo(() => {
    let localEvaluation;
    if (frameState.status === 'ok') {
      localEvaluation = evaluateActiveIndicators(
        partitioned.local,
        frameState.frame,
        new Date().toISOString(),
      );
    } else {
      const state: CanonicalIndicatorViewState = frameState.status === 'loading'
        ? { status: 'loading' }
        : frameState.status === 'unavailable'
          ? { status: 'unavailable', diagnostics: frameState.diagnostics }
          : { status: 'error', message: frameState.message };
      localEvaluation = {
        executions: [],
        states: Object.fromEntries(
          partitioned.local.map((selection) => [selection.instanceId, state]),
        ),
      };
    }
    return {
      frameState,
      ...mergeCanonicalIndicatorEvaluations(selections, localEvaluation, contextualState),
    };
  }, [contextualState, frameState, partitioned.local, selections]);
}
