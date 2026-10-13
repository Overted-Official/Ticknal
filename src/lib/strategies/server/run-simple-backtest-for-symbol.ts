import { runSimpleBacktest, type BacktestAssumptions, type BacktestPeriod, type BacktestResult } from '../run-simple-backtest';
import { runAdvancedBacktest } from '../run-advanced-backtest';
import type { ExecutableStrategyProgram } from '../strategy-program';
import { loadStrategyDailyFrame } from './load-strategy-daily-frame';

export async function runSimpleBacktestForSymbol(
  symbol: string,
  program: ExecutableStrategyProgram,
  assumptions: BacktestAssumptions,
  period?: BacktestPeriod,
): Promise<BacktestResult> {
  const loaded = await loadStrategyDailyFrame(symbol);
  if (loaded.status !== 'ok') {
    return { status: 'unavailable', code: 'HISTORY_UNAVAILABLE', diagnostics: loaded.diagnostics };
  }
  return program.schemaVersion === 2
    ? runAdvancedBacktest(program, loaded.frame, assumptions, period)
    : runSimpleBacktest(program, loaded.frame, assumptions, period);
}
