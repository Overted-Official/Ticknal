import { describe, expect, it } from 'vitest';
import { summarizeCompanyTrades } from '../../src/components/platform/strategies/builder/strategy-company-trade-metrics';

describe('advanced company analytics', () => {
  it('derives trade metrics from actual closed trades, not the universe mean', () => {
    const metrics = summarizeCompanyTrades([
      { entryTime: '2025-01-01', exitTime: '2025-01-11', returnPct: 10, maePct: -4, mfePct: 15 },
      { entryTime: '2025-02-01', exitTime: '2025-02-05', returnPct: -2, maePct: -8, mfePct: 3 },
    ]);
    expect(metrics).toEqual({ averageReturnPct: 4, averageMaePct: -6, averageMfePct: 9, averageHoldDays: 7 });
  });
  it('does not invent metrics when no trade has closed', () => {
    expect(summarizeCompanyTrades([])).toEqual({ averageReturnPct: null, averageMaePct: null, averageMfePct: null, averageHoldDays: null });
  });
});
