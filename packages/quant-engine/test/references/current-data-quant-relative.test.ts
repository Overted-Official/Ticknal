import { describe, expect, it } from 'vitest';

import {
  createIndicatorInputBundle,
  type NumericSeriesFrame,
} from '../../src/canonical/contracts';
import { executeContextualIndicator } from '../../src/canonical/execution/execute-contextual-indicator';
import { QUANTITATIVE_DEFINITIONS } from '../../src/canonical/indicators/quantitative';
import { RELATIVE_INTERMARKET_DEFINITIONS } from '../../src/canonical/indicators/relative-intermarket';
import { FIVE_BAR_FRAME } from './five-bar-frame';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;
const QUANT_IDS = ['QNT-007', 'QNT-008', 'QNT-009', 'QNT-010'] as const;
const RELATIVE_IDS = [
  'REL-001', 'REL-002', 'REL-003', 'REL-004', 'REL-005', 'REL-006', 'REL-009',
  'REL-011', 'REL-012', 'REL-013', 'REL-014', 'REL-015', 'REL-016', 'REL-017',
  'REL-018', 'REL-019',
] as const;

function series(role: string, multiplier = 2): NumericSeriesFrame {
  return {
    domain: 'numeric-series',
    role,
    unit: 'price',
    points: FIVE_BAR_FRAME.bars.map((bar) => ({ time: bar.time, value: bar.close * multiplier })),
    provenance: {
      sourceId: `${role}-fixture`,
      sourceType: 'hand-calculated-reference',
      sourceRevision: `${role}-v1`,
      instrumentId: `${role}-instrument`,
      symbol: role.toUpperCase(),
      asOf: '2026-01-08T12:00:00.000Z',
      receivedAt: '2026-01-08T12:00:00.000Z',
    },
  };
}

const INPUTS = createIndicatorInputBundle({
  seriesByRole: {
    comparison: series('comparison'),
    benchmark: series('benchmark'),
    gold: series('gold'),
    usdEgp: series('usdEgp'),
  },
});

function byBacklogId(backlogId: string) {
  const definition = [...QUANTITATIVE_DEFINITIONS, ...RELATIVE_INTERMARKET_DEFINITIONS]
    .find((candidate) => candidate.backlogId === backlogId);
  if (definition === undefined) throw new Error(`Missing fixture definition ${backlogId}`);
  return definition;
}

function parameters(backlogId: string): Record<string, unknown> {
  if (backlogId === 'REL-001' || backlogId === 'REL-003') return {};
  if (backlogId === 'REL-006') return { period: 3, momentumPeriod: 2 };
  if (backlogId === 'REL-013') return { period: 3, maxLag: 1 };
  if (backlogId === 'REL-019') return { period: 1, currency: 'USD' };
  if (backlogId === 'QNT-009' || backlogId === 'QNT-010' || backlogId === 'REL-018') {
    return { period: 3, annualization: 252 };
  }
  return { period: 3 };
}

describe('current-data quantitative and relative indicators', () => {
  it.each([...QUANT_IDS, ...RELATIVE_IDS])('%s produces aligned non-placeholder output', (backlogId) => {
    const result = executeContextualIndicator(
      byBacklogId(backlogId),
      FIVE_BAR_FRAME,
      parameters(backlogId),
      INPUTS,
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(Object.values(result.outputs)).not.toHaveLength(0);
    for (const output of Object.values(result.outputs)) {
      expect(output).toHaveLength(FIVE_BAR_FRAME.bars.length);
      expect(output.some((value) => value !== null)).toBe(true);
    }
  });

  it('returns hand-checkable perfect pair statistics for a scaled comparison', () => {
    const correlation = executeContextualIndicator(
      byBacklogId('QNT-007'), FIVE_BAR_FRAME, { period: 3 }, INPUTS, CONTEXT,
    );
    const beta = executeContextualIndicator(
      byBacklogId('QNT-009'), FIVE_BAR_FRAME, { period: 3, annualization: 252 }, INPUTS, CONTEXT,
    );
    const ratio = executeContextualIndicator(
      byBacklogId('REL-001'), FIVE_BAR_FRAME, {}, INPUTS, CONTEXT,
    );

    expect(correlation.outputs.correlation?.at(-1)).toBeCloseTo(1, 12);
    expect(beta.outputs.beta?.at(-1)).toBeCloseTo(1, 12);
    expect(beta.outputs.alpha?.at(-1)).toBeCloseTo(0, 12);
    expect(ratio.outputs.ratio).toEqual([0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(ratio.outputs['normalized-ratio']).toEqual([100, 100, 100, 100, 100]);
  });

  it('does not use a future comparison point to fill an earlier missing date', () => {
    const sparse = createIndicatorInputBundle({
      seriesByRole: {
        comparison: {
          ...series('comparison'),
          points: [{ time: FIVE_BAR_FRAME.bars.at(-1)!.time, value: 230 }],
        },
      },
    });
    const result = executeContextualIndicator(
      byBacklogId('REL-001'), FIVE_BAR_FRAME, {}, sparse, CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.ratio?.slice(0, -1)).toEqual([null, null, null, null]);
  });

  it('reports a missing required role as unavailable', () => {
    const result = executeContextualIndicator(
      byBacklogId('REL-016'),
      FIVE_BAR_FRAME,
      { period: 3 },
      createIndicatorInputBundle({ seriesByRole: { benchmark: series('benchmark') } }),
      CONTEXT,
    );

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      code: 'DATA_CAPABILITY_MISSING',
      fields: expect.objectContaining({ role: 'gold' }),
    }));
  });
});
