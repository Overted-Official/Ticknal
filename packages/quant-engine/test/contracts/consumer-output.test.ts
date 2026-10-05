import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { evaluateChartSeries } from '../../src/canonical/consumers/evaluate-chart-series';
import type { MarketBar, TimeSeriesFrame } from '../../src/canonical/contracts';
import { PRICE_RETURN_DEFINITIONS } from '../../src/canonical/indicators/price-return';
import { FIVE_BAR_META } from '../references/five-bar-frame';

const CHART_BACKLOG_IDS = new Set([
  'PRC-001',
  'PRC-002',
  'PRC-003',
  'PRC-004',
  'PRC-005',
  'PRC-006',
  'PRC-007',
  'PRC-016',
  'PRC-020',
]);

function chartFrame(): TimeSeriesFrame {
  const bars: MarketBar[] = Array.from({ length: 25 }, (_, index) => {
    const base = 100 + index;
    return {
      time: `2026-01-${String(index + 1).padStart(2, '0')}`,
      open: base,
      high: base + 3,
      low: base - 2,
      close: base + 1,
      volume: 1_000 + index * 10,
      trades: null,
      finality: 'final',
    };
  });

  return {
    domain: 'time-series',
    meta: {
      ...FIVE_BAR_META,
      sourceRevision: 'sha256:chart-consumer-reference',
      asOf: '2026-01-25',
      fields: {
        open: { coverage: 'observed', observedCount: 25, missingCount: 0 },
        high: { coverage: 'observed', observedCount: 25, missingCount: 0 },
        low: { coverage: 'observed', observedCount: 25, missingCount: 0 },
        close: { coverage: 'observed', observedCount: 25, missingCount: 0 },
        volume: { coverage: 'observed', observedCount: 25, missingCount: 0 },
        trades: { coverage: 'unavailable', observedCount: 0, missingCount: 25 },
      },
    },
    bars,
  };
}

describe('canonical chart consumer', () => {
  it('publishes aligned numeric overlay series and execution evidence for all nine entries', () => {
    const frame = chartFrame();
    const definitions = PRICE_RETURN_DEFINITIONS.filter((definition) =>
      CHART_BACKLOG_IDS.has(definition.backlogId),
    );

    expect(definitions).toHaveLength(9);
    for (const definition of definitions) {
      const result = evaluateChartSeries({
        definitionId: definition.id,
        formulaVersion: definition.formulaVersion,
        frame,
        parameters: definition.metadata.defaultParameters,
        context: { calculatedAt: '2026-01-25T16:00:00.000Z' },
      });

      expect(result.status, definition.backlogId).toBe('ok');
      expect(result.series.length, definition.backlogId).toBeGreaterThan(0);
      for (const series of result.series) {
        expect(series.kind).toBe('number');
        expect(series.placement).toBe('overlay');
        expect(series.points).toHaveLength(frame.bars.length);
        expect(series.points.map((point) => point.time)).toEqual(
          frame.bars.map((bar) => bar.time),
        );
      }
      expect(result.evidence.identity).toEqual({
        backlogId: definition.backlogId,
        id: definition.id,
        formulaVersion: '1.0.0',
        definitionSchemaVersion: 1,
      });
      expect(result.evidence.executionFingerprint).toMatch(/^ce1-[0-9a-f]{16}$/);
      expect(result.evidence.provenance.sourceRevision).toBe(frame.meta.sourceRevision);
      expect(result.evidence.calculatedAt).toBe('2026-01-25T16:00:00.000Z');
    }
  });

  it('preserves categorical chart outputs without coercing them to numbers', () => {
    const result = evaluateChartSeries({
      definitionId: 'gap-percentage',
      formulaVersion: '1.0.0',
      frame: chartFrame(),
      parameters: {},
      context: { calculatedAt: '2026-01-25T16:00:00.000Z' },
    });

    const direction = result.series.find((series) => series.outputKey === 'direction');
    expect(direction?.kind).toBe('category');
    expect(direction?.points.at(-1)?.value).toBe('flat');
  });

  it('keeps chart-library and framework dependencies outside the neutral adapter', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../src/canonical/consumers/evaluate-chart-series.ts', import.meta.url)),
      'utf8',
    );

    expect(source).not.toMatch(/lightweight-charts|react|next\//);
  });
});
