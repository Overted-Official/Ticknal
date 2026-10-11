import { describe, expect, it } from 'vitest';

import { getMockBacktestPreview } from './strategy-backtest-model';

describe('strategy backtest preview model', () => {
  it('withholds results for an empty custom draft', () => {
    expect(getMockBacktestPreview('custom-draft', 'all', 'sector', false, 'primary')).toBeNull();
  });

  it('uses different authored examples for all-history and chosen-date views', () => {
    const allHistory = getMockBacktestPreview('psi', 'all', 'sector', true, 'primary');
    const chosenDates = getMockBacktestPreview('psi', 'custom', 'sector', true, 'primary');

    expect(allHistory?.kpis.strategyReturn).toBe(18.4);
    expect(chosenDates?.kpis.strategyReturn).toBe(14);
  });

  it('keeps the unseen holdout example separate from the build-period example', () => {
    const buildPeriod = getMockBacktestPreview('psi', 'holdout', 'sector', true, 'primary');
    const unseenPeriod = getMockBacktestPreview('psi', 'holdout', 'sector', true, 'unseen');

    expect(buildPeriod?.kpis.strategyReturn).toBe(10.5);
    expect(unseenPeriod?.kpis.strategyReturn).toBe(5.7);
  });

  it('reuses explicitly authored example rows instead of calculating strategy results', () => {
    const typhon = getMockBacktestPreview('psi', 'all', 'ticker', true, 'primary');
    const hydra = getMockBacktestPreview('hydra', 'holdout', 'ticker', true, 'unseen');

    expect(typhon?.rows[0]?.returnPct).toBe(31.8);
    expect(hydra?.rows[0]?.returnPct).toBe(31.8);
  });

  it('provides hierarchical backtest groups with constituent tickers', () => {
    const preview = getMockBacktestPreview('psi', 'all', 'industryGroup', true, 'primary');
    expect(preview?.groups).toBeDefined();
    expect(preview?.groups.length).toBeGreaterThan(0);
    const banks = preview?.groups.find((g) => g.id === 'commercial-banks');
    expect(banks).toBeDefined();
    expect(banks?.tickers.length).toBeGreaterThanOrEqual(1);
    expect(banks?.tickers.some((t) => t.symbol === 'COMI')).toBe(true);
  });
});
