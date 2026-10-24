import type { BacktestAssumptions } from '../../../../lib/strategies/run-simple-backtest';

export const DEFAULT_BACKTEST_ASSUMPTIONS: BacktestAssumptions = { initialCapital: 100_000, feeBps: 10 };

export function parseBacktestAssumptions(capital: string, feeBps: string): BacktestAssumptions | null {
  if (capital.trim() === '' || feeBps.trim() === '') return null;
  const initialCapital = Number(capital);
  const fee = Number(feeBps);
  if (!Number.isFinite(initialCapital) || initialCapital <= 0 || initialCapital > 1_000_000_000_000
    || !Number.isFinite(fee) || fee < 0 || fee > 1000) return null;
  return { initialCapital, feeBps: fee };
}

export function currentBacktestPeriod(today: string): { readonly startDate: string; readonly endDate: string } {
  return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today };
}
