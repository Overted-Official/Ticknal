import { describe, expect, it } from 'vitest';
import { currentBacktestPeriod, parseBacktestAssumptions } from '../../src/components/platform/strategies/builder/strategy-backtest-assumptions';

describe('strategy backtest assumptions', () => {
  it('accepts report-comparable capital and zero commission', () => {
    expect(parseBacktestAssumptions('1000', '0')).toEqual({ initialCapital: 1000, feeBps: 0 });
  });
  it('rejects empty, fractional share-unrelated and out-of-range inputs instead of silently changing the test', () => {
    expect(parseBacktestAssumptions('', '0')).toBeNull();
    expect(parseBacktestAssumptions('0', '0')).toBeNull();
    expect(parseBacktestAssumptions('1000', '1001')).toBeNull();
  });
  it('opens on the actual calendar year rather than the old 2025 sample', () => {
    expect(currentBacktestPeriod('2026-10-23')).toEqual({ startDate: '2026-01-01', endDate: '2026-10-23' });
  });
});
