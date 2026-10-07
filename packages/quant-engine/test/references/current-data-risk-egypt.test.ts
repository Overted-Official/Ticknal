import { describe, expect, it } from 'vitest';

import {
  createIndicatorInputBundle,
  type NumericSeriesFrame,
  type TimeSeriesFrame,
} from '../../src/canonical/contracts';
import { executeContextualIndicator } from '../../src/canonical/execution/execute-contextual-indicator';
import { EGYPT_DEFINITIONS } from '../../src/canonical/indicators/egypt';
import { RISK_PORTFOLIO_DEFINITIONS } from '../../src/canonical/indicators/risk-portfolio';
import { FIVE_BAR_FRAME } from './five-bar-frame';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;
const IDS = [
  'RSK-013', 'RSK-014', 'RSK-015', 'RSK-016',
  'EGY-016', 'EGY-021', 'EGY-022', 'EGY-029', 'EGY-030', 'EGY-032',
] as const;

function series(role: string, values: readonly number[], unit = 'price'): NumericSeriesFrame {
  return {
    domain: 'numeric-series', role, unit,
    points: FIVE_BAR_FRAME.bars.map((bar, index) => ({ time: bar.time, value: values[index]! })),
    provenance: {
      sourceId: `${role}-fixture`, sourceType: 'hand-calculated-reference', sourceRevision: `${role}-v1`,
      symbol: role.toUpperCase(), asOf: '2026-01-08T12:00:00.000Z', receivedAt: '2026-01-08T12:00:00.000Z',
    },
  };
}

const INPUTS = createIndicatorInputBundle({
  seriesByRole: {
    benchmark: series('benchmark', [100, 102, 101, 103, 104]),
    usdEgp: series('usdEgp', [50, 50, 50, 50, 50], 'EGP-per-USD'),
    gold: series('gold', [2000, 2000, 2000, 2000, 2000], 'USD-per-troy-ounce'),
    silver: series('silver', [25, 25, 25, 25, 25], 'USD-per-troy-ounce'),
    m2: series('m2', [100, 101, 103, 106, 110], 'EGP-billion'),
  },
});

const MONTHLY_DATES = Array.from({ length: 15 }, (_, index) => {
  const date = new Date(Date.UTC(2025, index, 15));
  return date.toISOString().slice(0, 10);
});
const MONTHLY_FRAME: TimeSeriesFrame = {
  ...FIVE_BAR_FRAME,
  meta: {
    ...FIVE_BAR_FRAME.meta,
    asOf: MONTHLY_DATES.at(-1)!,
    fields: Object.fromEntries(Object.entries(FIVE_BAR_FRAME.meta.fields).map(([field, coverage]) => [
      field,
      coverage.coverage === 'observed'
        ? { ...coverage, observedCount: MONTHLY_DATES.length, missingCount: 0 }
        : { ...coverage, observedCount: 0, missingCount: MONTHLY_DATES.length },
    ])) as TimeSeriesFrame['meta']['fields'],
  },
  bars: MONTHLY_DATES.map((time, index) => ({
    ...FIVE_BAR_FRAME.bars[index % FIVE_BAR_FRAME.bars.length]!,
    time,
    open: 100 + index * 5,
    high: 106 + index * 5,
    low: 96 + index * 5,
    close: 102 + index * 5,
  })),
};
const MONTHLY_M2: NumericSeriesFrame = {
  ...series('m2', MONTHLY_DATES.map((_, index) => 100 + index * 4), 'EGP-billion'),
  points: MONTHLY_DATES.map((time, index) => ({ time, value: 100 + index * 4 })),
};
const MONTHLY_INPUTS = createIndicatorInputBundle({ seriesByRole: { m2: MONTHLY_M2 } });

function definition(backlogId: string) {
  const found = [...RISK_PORTFOLIO_DEFINITIONS, ...EGYPT_DEFINITIONS]
    .find((candidate) => candidate.backlogId === backlogId);
  if (found === undefined) throw new Error(`Missing definition ${backlogId}`);
  return found;
}

function parameters(backlogId: string): Record<string, unknown> {
  if (backlogId.startsWith('RSK-')) return { period: 3, annualization: 252, riskFreeAnnualPct: 0 };
  if (backlogId === 'EGY-016') return { period: 3, annualization: 252 };
  if (backlogId === 'EGY-029') return { monthPeriod: 1, yearPeriod: 2 };
  if (backlogId === 'EGY-030') return { period: 3, liquidityPeriod: 1 };
  if (backlogId === 'EGY-032') return { period: 3, annualization: 252, benchmarkSymbol: 'EGX30' };
  return { period: 1 };
}

describe('current-data benchmark risk and Egypt indicators', () => {
  it.each(IDS)('%s executes with its authentic contextual role', (backlogId) => {
    const usesMonthlyMacro = backlogId === 'EGY-029' || backlogId === 'EGY-030';
    const result = executeContextualIndicator(
      definition(backlogId),
      usesMonthlyMacro ? MONTHLY_FRAME : FIVE_BAR_FRAME,
      parameters(backlogId),
      usesMonthlyMacro ? MONTHLY_INPUTS : INPUTS,
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(Object.values(result.outputs)).not.toHaveLength(0);
    expect(Object.values(result.outputs).some((output) => output.some((value) => value !== null)))
      .toBe(true);
  });

  it('converts USD per troy ounce to EGP per gram exactly once', () => {
    const gold = executeContextualIndicator(
      definition('EGY-021'), FIVE_BAR_FRAME, { period: 1 }, INPUTS, CONTEXT,
    );
    const silver = executeContextualIndicator(
      definition('EGY-022'), FIVE_BAR_FRAME, { period: 1 }, INPUTS, CONTEXT,
    );

    expect(gold.outputs['egp-per-gram']?.[0]).toBeCloseTo(2000 * 50 / 31.1034768, 10);
    expect(silver.outputs['egp-per-gram']?.[0]).toBeCloseTo(25 * 50 / 31.1034768, 10);
    expect(gold.outputs['egp-per-gram']?.[0]).not.toBeCloseTo(2000 * 50 / (31.1034768 ** 2), 4);
  });

  it('requires the selected fund benchmark rather than inventing one', () => {
    const result = executeContextualIndicator(
      definition('EGY-032'),
      FIVE_BAR_FRAME,
      { period: 3, annualization: 252, benchmarkSymbol: 'EGX30' },
      createIndicatorInputBundle({ seriesByRole: { m2: series('m2', [1, 2, 3, 4, 5]) } }),
      CONTEXT,
    );

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      code: 'DATA_CAPABILITY_MISSING',
      fields: expect.objectContaining({ role: 'benchmark' }),
    }));
  });

  it('interprets M2 month and year periods as calendar months rather than chart bars', () => {
    const dates = ['2025-01-15', '2025-01-31', '2025-02-15', '2025-02-28', '2026-01-15'];
    const calendarFrame: TimeSeriesFrame = {
      ...FIVE_BAR_FRAME,
      meta: { ...FIVE_BAR_FRAME.meta, asOf: dates.at(-1)! },
      bars: FIVE_BAR_FRAME.bars.map((bar, index) => ({
        ...bar,
        time: dates[index]!,
      })),
    };
    const m2: NumericSeriesFrame = {
      ...series('m2', [100, 100, 110, 110, 120], 'EGP-billion'),
      points: dates.map((time, index) => ({
        time,
        value: [100, 100, 110, 110, 120][index]!,
      })),
    };
    const result = executeContextualIndicator(
      definition('EGY-029'),
      calendarFrame,
      { monthPeriod: 1, yearPeriod: 12 },
      createIndicatorInputBundle({ seriesByRole: { m2 } }),
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.mom?.[3]).toBeCloseTo(10, 10);
    expect(result.outputs.yoy?.[4]).toBeCloseTo(20, 10);
  });
});
