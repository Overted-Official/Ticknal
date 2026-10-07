import { describe, expect, it } from 'vitest';

import { FIVE_BAR_FRAME } from '../../../../packages/quant-engine/test/references/five-bar-frame';
import { buildIndicatorConsensusContext } from './build-indicator-consensus-context';
import {
  extractStrategyOutputSnapshots,
  mapStrategyAnalysesToModelOutputs,
} from './build-strategy-output-context';

describe('strategy output context adapter', () => {
  it('maps app-layer strategy analyses into versioned output-only frames', () => {
    const result = mapStrategyAnalysesToModelOutputs({
      observationTime: FIVE_BAR_FRAME.bars.at(-1)!.time,
      receivedAt: '2026-01-08T12:01:00.000Z',
      typhon: { modelVersion: 'psi-v9', values: { masterIndex: 55, adjustedIndex: 57, rawIndex: 48, levelsCrossed: 2, vote: 1 } },
      psi40: { modelVersion: 'psi40-v1', values: { score: 72, categorySubscores: 68, agreementCount: 29 } },
      cerberus: { modelVersion: 'psi-v2', values: { zone: 61, up: 70, down: 30, regimeDirection: 'up', stateChanges: 'hold', vote: 1 } },
      hydra: { modelVersion: 'hydra-v1', values: { positionState: 'invested', regimeValue: 'bullish', dynamicTheta: 0.4, entryExitEvent: false, vote: 1 } },
      champion: { modelVersion: 'champion-v1', values: { winningModel: 'hydra', alpha: 12, confidence: 0.75, comparisonMetrics: 3 } },
    });

    expect(result.hydra?.points[0]?.values.positionState).toBe('invested');
    expect(result.hydra?.provenance.modelVersion).toBe('hydra-v1');
    expect(result.champion?.provenance.sourceRevision).toContain('champion-v1');
  });

  it('omits unavailable protected analyses instead of manufacturing neutral outputs', () => {
    const snapshots = extractStrategyOutputSnapshots({
      observationTime: FIVE_BAR_FRAME.bars.at(-1)!.time,
      receivedAt: '2026-01-08T12:01:00.000Z',
      champion: { strategyId: 'psi', alpha: 0, analyses: [] },
      psi40: { latestMasterIndex: null },
    });

    expect(snapshots.typhon).toBeUndefined();
    expect(snapshots.psi40).toBeUndefined();
    expect(snapshots.cerberus).toBeUndefined();
    expect(snapshots.hydra).toBeUndefined();
    expect(snapshots.champion).toBeUndefined();
  });

  it('derives only the exact PSI 40 agreement count and leaves unavailable subscores null', () => {
    const snapshots = extractStrategyOutputSnapshots({
      observationTime: FIVE_BAR_FRAME.bars.at(-1)!.time,
      receivedAt: '2026-01-08T12:01:00.000Z',
      champion: { strategyId: 'psi', alpha: 0, analyses: [] },
      psi40: { latestMasterIndex: 72.5 },
    });

    expect(snapshots.psi40?.values).toEqual({
      score: 72.5,
      categorySubscores: null,
      agreementCount: 29,
    });
  });

  it('keeps model votes null when a protected strategy does not expose a signal', () => {
    const snapshots = extractStrategyOutputSnapshots({
      observationTime: FIVE_BAR_FRAME.bars.at(-1)!.time,
      receivedAt: '2026-01-08T12:01:00.000Z',
      champion: {
        strategyId: 'psi',
        alpha: 5,
        analyses: [{
          strategyId: 'psi',
          parameterVersion: 'psi-v9',
          rawResult: { latestMasterIndex: 70, latestMasterIndexAdjusted: 72, signals: [] },
          metrics: { alpha: 5 },
        }],
      },
      psi40: { latestMasterIndex: null },
    });

    expect(snapshots.typhon?.values.vote).toBeNull();
  });
});

describe('indicator consensus context', () => {
  it('rejects direct/indirect cycles and insufficient coverage', () => {
    expect(() => buildIndicatorConsensusContext({
      consensusIndicatorId: 'ticknal-indicator-consensus-score',
      selectedIndicatorIds: ['ticknal-indicator-consensus-score'],
      frames: [], minimumCoverage: 0.5, minimumInputs: 1,
    })).toThrow(/cycle/i);

    expect(() => buildIndicatorConsensusContext({
      consensusIndicatorId: 'ticknal-indicator-consensus-score',
      selectedIndicatorIds: ['alpha'],
      frames: [{
        domain: 'indicator-output', indicatorId: 'alpha', observationTimes: [1, 2],
        outputs: { normalizedScore: [null, null] },
        provenance: { sourceId: 'alpha', sourceType: 'canonical-indicator', sourceRevision: 'v1', asOf: '2026-01-08', receivedAt: '2026-01-08' },
      }],
      minimumCoverage: 0.5, minimumInputs: 1,
    })).toThrow(/coverage/i);
  });
});
