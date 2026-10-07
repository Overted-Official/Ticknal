import { describe, expect, it } from 'vitest';

import { evaluateAlertComparison } from '../../src/canonical/consumers/evaluate-alert-comparison';
import { evaluateChartSeries } from '../../src/canonical/consumers/evaluate-chart-series';
import { evaluateRuleSeries } from '../../src/canonical/consumers/evaluate-rule-series';
import { evaluateScanValue } from '../../src/canonical/consumers/evaluate-scan-value';
import type { TimeSeriesFrame } from '../../src/canonical/contracts';
import { PERCENTAGE_CHANGE_DEFINITION } from '../../src/canonical/indicators/price-return/percentage-change';
import { cloneFiveBarFrame } from '../references/five-bar-frame';

const context = { calculatedAt: '2026-01-08T16:00:00.000Z' } as const;
const baseRequest = {
  definitionId: PERCENTAGE_CHANGE_DEFINITION.id,
  formulaVersion: PERCENTAGE_CHANGE_DEFINITION.formulaVersion,
  parameters: PERCENTAGE_CHANGE_DEFINITION.metadata.defaultParameters,
  context,
} as const;

function evidenceTuple(result: {
  readonly evidence: {
    readonly executionFingerprint: string;
    readonly identity: unknown;
    readonly normalizedParameters: unknown;
    readonly provenance: { readonly sourceRevision: string };
  };
}) {
  return {
    executionFingerprint: result.evidence.executionFingerprint,
    identity: result.evidence.identity,
    normalizedParameters: result.evidence.normalizedParameters,
    sourceRevision: result.evidence.provenance.sourceRevision,
  };
}

describe('canonical consumer parity', () => {
  it('carries identical execution evidence and final values across all consumers', () => {
    const frame = cloneFiveBarFrame();
    const chart = evaluateChartSeries({ ...baseRequest, frame });
    const rule = evaluateRuleSeries({ ...baseRequest, frame, outputKey: 'return_pct' });
    const scan = evaluateScanValue({ ...baseRequest, frame, outputKey: 'return_pct' });
    const alert = evaluateAlertComparison({
      ...baseRequest,
      frame,
      outputKey: 'return_pct',
      operator: 'gt',
      threshold: 0,
    });

    expect(chart.status).toBe('ok');
    expect(rule.status).toBe('ok');
    expect(scan.status).toBe('ok');
    expect(alert.evaluation).toBe('match');

    const chartValue = chart.series
      .find((series) => series.outputKey === 'return_pct')
      ?.points.at(-1)?.value;
    const ruleValue = rule.points.at(-1)?.value;
    expect(chartValue).toBeCloseTo(4.545454545454546, 12);
    expect(ruleValue).toBe(chartValue);
    expect(scan.value).toBe(chartValue);
    expect(alert.value).toBe(chartValue);

    const chartEvidence = evidenceTuple(chart);
    expect(evidenceTuple(rule)).toEqual(chartEvidence);
    expect(evidenceTuple(scan)).toEqual(chartEvidence);
    expect(evidenceTuple(alert)).toEqual(chartEvidence);
  });

  it('does not evaluate an alert against a provisional latest bar', () => {
    const frame = cloneFiveBarFrame();
    const bars = frame.bars.map((bar, index) =>
      index === frame.bars.length - 1 ? { ...bar, finality: 'provisional' as const } : bar,
    );
    const provisional: TimeSeriesFrame = {
      ...frame,
      meta: { ...frame.meta, sessionCompleteness: 'partial' },
      bars,
    };

    const alert = evaluateAlertComparison({
      ...baseRequest,
      frame: provisional,
      outputKey: 'return_pct',
      operator: 'gt',
      threshold: 0,
    });

    expect(alert.evaluation).toBe('not-evaluable');
    expect(alert.value).toBeNull();
  });

  it.each([
    ['gt', 4, undefined],
    ['gte', 4.545454545454541, undefined],
    ['lt', 5, undefined],
    ['lte', 4.545454545454541, undefined],
    ['eq-within-tolerance', 4.5, 0.05],
  ] as const)('supports the explicit %s comparison operator', (operator, threshold, tolerance) => {
    const alert = evaluateAlertComparison({
      ...baseRequest,
      frame: cloneFiveBarFrame(),
      outputKey: 'return_pct',
      operator,
      threshold,
      ...(tolerance === undefined ? {} : { tolerance }),
    });

    expect(alert.evaluation).toBe('match');
  });

  it('returns no-match for a completed comparison that does not pass', () => {
    const alert = evaluateAlertComparison({
      ...baseRequest,
      frame: cloneFiveBarFrame(),
      outputKey: 'return_pct',
      operator: 'gt',
      threshold: 10,
    });

    expect(alert.evaluation).toBe('no-match');
    expect(alert.value).not.toBeNull();
  });

  it('requires an explicit tolerance for equality comparisons', () => {
    expect(() =>
      evaluateAlertComparison({
        ...baseRequest,
        frame: cloneFiveBarFrame(),
        outputKey: 'return_pct',
        operator: 'eq-within-tolerance',
        threshold: 4.5,
      }),
    ).toThrow(/tolerance/);
  });

  it('rejects an output key that the definition does not publish', () => {
    expect(() =>
      evaluateRuleSeries({
        ...baseRequest,
        frame: cloneFiveBarFrame(),
        outputKey: 'not-a-real-output',
      }),
    ).toThrow(/not-a-real-output/);
  });
});
