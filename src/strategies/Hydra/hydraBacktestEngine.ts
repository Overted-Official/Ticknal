import type { FullBacktestReport } from '@/strategies/registry';
import type { PriceBar } from '@/strategies/PSI/psiStrategy';
import { runHydraStrategy, type HydraStrategyOverrides } from './hydraStrategy';

/**
 * HYDRA BACKTEST ENGINE VERSION: 1.2
 * Internal tracking version for backtest engine synchronization.
 */
export const HYDRA_ENGINE_VERSION = '1.2';

/**
 * Runs a full HYDRA backtest over historical price bars, producing the complete
 * FullBacktestReport schema expected by the platform reporting system and UI drawers.
 */
export function runFullHydraBacktest(
  bars: PriceBar[],
  overrides?: HydraStrategyOverrides
): FullBacktestReport {
  const result = runHydraStrategy(bars, overrides);
  return {
    trades: result.trades,
    equityCurve: result.equityCurve,
    stats: result.stats,
    signals: result.signals,
  };
}
