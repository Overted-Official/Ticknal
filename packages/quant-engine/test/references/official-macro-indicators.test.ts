import { describe, expect, it } from 'vitest';

import { createIndicatorInputBundle, type NumericSeriesFrame, type TimeSeriesFrame } from '../../src/canonical/contracts';
import { executeContextualIndicator } from '../../src/canonical/execution/execute-contextual-indicator';
import { EGYPT_DEFINITIONS } from '../../src/canonical/indicators/egypt';
import { RELATIVE_INTERMARKET_DEFINITIONS } from '../../src/canonical/indicators/relative-intermarket';
import { FIVE_BAR_META } from './five-bar-frame';

const dates = Array.from({ length: 25 }, (_, index) => new Date(Date.UTC(2024, index, 28)).toISOString().slice(0, 10));
const frame: TimeSeriesFrame = {
  domain: 'time-series',
  meta: {
    ...FIVE_BAR_META, symbol: 'COMI', exchange: 'EGX', asOf: dates.at(-1)!,
    fields: Object.fromEntries(Object.entries(FIVE_BAR_META.fields).map(([field, coverage]) => [
      field,
      coverage.coverage === 'observed'
        ? { ...coverage, observedCount: dates.length, missingCount: 0 }
        : { ...coverage, observedCount: 0, missingCount: dates.length },
    ])) as TimeSeriesFrame['meta']['fields'],
  },
  bars: dates.map((time, index) => ({ time, open: 100 + index * 2, high: 103 + index * 2, low: 99 + index * 2, close: 101 + index * 2, volume: 1_000_000, trades: null, finality: 'final' })),
};

function series(role: string, values: readonly number[], unit = 'percent'): NumericSeriesFrame {
  return {
    domain: 'numeric-series', role, unit,
    points: dates.map((time, index) => ({ time, value: values[index] ?? values.at(-1)! })),
    provenance: { sourceId: role, sourceType: 'official-fixture', sourceRevision: 'v1', asOf: dates.at(-1)!, receivedAt: dates.at(-1)! },
  };
}

const ramp = (start: number, step: number) => dates.map((_, index) => start + index * step);
const inputs = createIndicatorInputBundle({ seriesByRole: {
  egyptCpiIndex: series('egyptCpiIndex', ramp(100, 1), 'index'),
  usCpiIndex: series('usCpiIndex', ramp(100, 0.25), 'index'),
  egyptHeadlineInflationYoY: series('egyptHeadlineInflationYoY', ramp(12, 0.1)),
  cbePolicyRate: series('cbePolicyRate', ramp(20, 0.05)),
  treasury3mYield: series('treasury3mYield', ramp(24, 0.02)),
  treasury12mYield: series('treasury12mYield', ramp(27, 0.02)),
  netInternationalReserves: series('netInternationalReserves', ramp(40_000, 100), 'usd_millions'),
  usdEgp: series('usdEgp', ramp(48, 0.2), 'EGP-per-USD'),
  gold: series('gold', ramp(2_000, 20), 'USD-per-troy-ounce'),
  m2: series('m2', ramp(10_000, 100), 'EGP-billion'),
} });

const ids = ['REL-020', 'EGY-017', 'EGY-018', 'EGY-024', 'EGY-025', 'EGY-026', 'EGY-027', 'EGY-028', 'EGY-036'] as const;

describe('official macro indicators', () => {
  it.each(ids)('%s produces a real result from official-series roles', (backlogId) => {
    const definition = [...EGYPT_DEFINITIONS, ...RELATIVE_INTERMARKET_DEFINITIONS].find((item) => item.backlogId === backlogId)!;
    const result = executeContextualIndicator(definition, frame, {}, inputs, { calculatedAt: '2026-01-01T00:00:00.000Z' });
    expect(result.status).toBe('ok');
    expect(Object.values(result.outputs).some((values) => values.some((value) => value !== null))).toBe(true);
  });

  it('uses the Fisher equation for one-year real equity returns', () => {
    const definition = EGYPT_DEFINITIONS.find((item) => item.backlogId === 'EGY-028')!;
    const result = executeContextualIndicator(definition, frame, {}, inputs, { calculatedAt: '2026-01-01T00:00:00.000Z' });
    const expected = ((frame.bars[24]!.close / frame.bars[12]!.close) / (124 / 112) - 1) * 100;
    expect(result.outputs['real-return']?.[24]).toBeCloseTo(expected, 10);
  });

  it('reports the 12-month minus 3-month treasury slope', () => {
    const definition = EGYPT_DEFINITIONS.find((item) => item.backlogId === 'EGY-026')!;
    const result = executeContextualIndicator(definition, frame, {}, inputs, { calculatedAt: '2026-01-01T00:00:00.000Z' });
    expect(result.outputs.spreads?.[24]).toBeCloseTo(3, 10);
    expect(result.outputs['inversion-state']?.[24]).toBe('normal');
  });
});
