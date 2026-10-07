import { describe, expect, it } from 'vitest';

import {
  createIndicatorInputBundle,
  type IndicatorOutputFrame,
  type ModelOutputFrame,
} from '../../src/canonical/contracts';
import { executeContextualIndicator } from '../../src/canonical/execution/execute-contextual-indicator';
import { TICKNAL_COMPOSITE_DEFINITIONS } from '../../src/canonical/indicators/ticknal-composites';
import { FIVE_BAR_FRAME } from './five-bar-frame';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;
const IDS = ['TKL-001', 'TKL-002', 'TKL-003', 'TKL-004', 'TKL-005', 'TKL-007', 'TKL-009'] as const;

function model(modelId: string, values: Record<string, number | boolean | string | null>): ModelOutputFrame {
  return {
    domain: 'model-output', modelId,
    points: FIVE_BAR_FRAME.bars.map((bar) => ({ time: bar.time, values })),
    provenance: {
      sourceId: `${modelId}-adapter`, sourceType: 'protected-model-output', sourceRevision: `${modelId}-v1`,
      modelVersion: `${modelId}-model-v1`, asOf: '2026-01-08T12:00:00.000Z', receivedAt: '2026-01-08T12:00:00.000Z',
    },
  };
}

function indicator(indicatorId: string, score: number): IndicatorOutputFrame {
  return {
    domain: 'indicator-output', indicatorId,
    observationTimes: FIVE_BAR_FRAME.bars.map((bar) => bar.time),
    outputs: { normalizedScore: FIVE_BAR_FRAME.bars.map(() => score) },
    provenance: {
      sourceId: indicatorId, sourceType: 'canonical-indicator', sourceRevision: `${indicatorId}-v1`,
      asOf: '2026-01-08T12:00:00.000Z', receivedAt: '2026-01-08T12:00:00.000Z',
    },
  };
}

const INPUTS = createIndicatorInputBundle({
  modelOutputsById: {
    typhon: model('typhon', { rawIndex: 48, masterIndex: 55, adjustedIndex: 57, levelsCrossed: 2, vote: 1 }),
    psi40: model('psi40', { score: 72, categorySubscores: 68, agreementCount: 29 }),
    cerberus: model('cerberus', { zone: 61, up: 70, down: 30, regimeDirection: 'up', stateChanges: 'hold', vote: 1 }),
    hydra: model('hydra', { positionState: 'invested', regimeValue: 'bullish', dynamicTheta: 0.4, entryExitEvent: false, vote: 1 }),
    champion: model('champion', { winningModel: 'hydra', alpha: 12, confidence: 0.75, comparisonMetrics: 3 }),
  },
  indicatorOutputsById: {
    alpha: indicator('alpha', 0.8),
    beta: indicator('beta', -0.2),
  },
});

function definition(backlogId: string) {
  const found = TICKNAL_COMPOSITE_DEFINITIONS.find((candidate) => candidate.backlogId === backlogId);
  if (found === undefined) throw new Error(`Missing definition ${backlogId}`);
  return found;
}

function parameters(backlogId: string): Record<string, unknown> {
  return backlogId === 'TKL-009'
    ? { bullishThreshold: 0.2, bearishThreshold: -0.2, minimumCoverage: 0.5, minimumInputs: 2 }
    : {};
}

describe('Ticknal contextual composites', () => {
  it.each(IDS)('%s consumes output-only model or indicator frames', (backlogId) => {
    const result = executeContextualIndicator(
      definition(backlogId), FIVE_BAR_FRAME, parameters(backlogId), INPUTS, CONTEXT,
    );
    expect(result.status).toBe('ok');
    expect(Object.values(result.outputs).every((output) => output.length === FIVE_BAR_FRAME.bars.length))
      .toBe(true);
    expect(Object.values(result.outputs).some((output) => output.some((value) => value !== null)))
      .toBe(true);
  });

  it('passes the Typhon values through without recomputing protected logic', () => {
    const result = executeContextualIndicator(
      definition('TKL-001'), FIVE_BAR_FRAME, {}, INPUTS, CONTEXT,
    );
    expect(result.outputs['raw-index']).toEqual([48, 48, 48, 48, 48]);
    expect(result.outputs['master-index']).toEqual([55, 55, 55, 55, 55]);
    expect(result.outputs['adjusted-index']).toEqual([57, 57, 57, 57, 57]);
    expect(result.outputs['levels-crossed']).toEqual([2, 2, 2, 2, 2]);
  });

  it('requires every protected model used by strategy consensus', () => {
    const missingHydra = createIndicatorInputBundle({
      modelOutputsById: {
        typhon: INPUTS.modelOutputsById.typhon!,
        cerberus: INPUTS.modelOutputsById.cerberus!,
      },
    });
    const result = executeContextualIndicator(
      definition('TKL-007'), FIVE_BAR_FRAME, {}, missingHydra, CONTEXT,
    );
    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      code: 'DATA_CAPABILITY_MISSING', fields: expect.objectContaining({ modelId: 'hydra' }),
    }));
  });

  it('does not treat missing model votes as neutral participation', () => {
    const partialVotes = createIndicatorInputBundle({
      modelOutputsById: {
        typhon: model('typhon', { vote: null }),
        cerberus: model('cerberus', { vote: 1 }),
        hydra: model('hydra', { vote: -1 }),
      },
    });
    const partial = executeContextualIndicator(
      definition('TKL-007'), FIVE_BAR_FRAME, {}, partialVotes, CONTEXT,
    );
    expect(partial.outputs['vote-count']).toEqual([0, 0, 0, 0, 0]);
    expect(partial.outputs['consensus-state']).toEqual([
      'neutral', 'neutral', 'neutral', 'neutral', 'neutral',
    ]);
    expect(partial.outputs.disagreement).toEqual([1, 1, 1, 1, 1]);

    const noVotes = createIndicatorInputBundle({
      modelOutputsById: {
        typhon: model('typhon', { vote: null }),
        cerberus: model('cerberus', { vote: null }),
        hydra: model('hydra', { vote: null }),
      },
    });
    const unavailable = executeContextualIndicator(
      definition('TKL-007'), FIVE_BAR_FRAME, {}, noVotes, CONTEXT,
    );
    expect(unavailable.outputs['vote-count']).toEqual([null, null, null, null, null]);
    expect(unavailable.outputs['consensus-state']).toEqual([null, null, null, null, null]);
    expect(unavailable.outputs.disagreement).toEqual([null, null, null, null, null]);
  });
});
