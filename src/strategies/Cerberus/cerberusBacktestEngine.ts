import type { FullBacktestReport } from '@/strategies/registry';
import { type PriceBar } from './psiV2Engine';
import { runPsiV2Strategy, type PsiV2StrategyOverrides } from './cerberusStrategy';

/**
 * Runs a full PSI V2 backtest over historical price bars, producing the complete
 * FullBacktestReport schema expected by the platform reporting system and UI drawers.
 */
export function runFullPsiV2Backtest(
  bars: PriceBar[],
  overrides?: PsiV2StrategyOverrides
): FullBacktestReport {
  const result = runPsiV2Strategy(bars, overrides);
  return {
    trades: result.trades,
    equityCurve: result.equityCurve,
    stats: result.stats,
    signals: result.signals,
  };
}

export const runFullCerberusBacktest = runFullPsiV2Backtest;
