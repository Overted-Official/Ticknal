/**
 * @ticknal/quant-engine
 * Algorithmic Alpha & Indicator Math Core
 */

export * from './indicators';
export * from './strategies/registry';
export {
  runHydraStrategy,
  HYDRA_STRATEGY_VERSION,
  type HydraStrategyOverrides,
} from './strategies/Hydra/hydraStrategy';
export {
  runFullHydraBacktest,
  HYDRA_ENGINE_VERSION,
} from './strategies/Hydra/hydraBacktestEngine';
export {
  runPsiStrategy,
  type PsiSignal,
  type PsiSignalType,
} from './strategies/Typhon/typhonStrategy';
export {
  runFullStrategyBacktest as runFullPsiBacktest,
} from './strategies/Typhon/typhonBacktestEngine';
export {
  runPsiV2Strategy,
  type PsiV2StrategyOverrides,
} from './strategies/Cerberus/cerberusStrategy';
export {
  runFullPsiV2Backtest,
} from './strategies/Cerberus/cerberusBacktestEngine';
export {
  STRATEGY_REGISTRY as INTRADAY_STRATEGY_REGISTRY,
  type StrategyDefinition as IntradayStrategyDefinition,
} from './strategies/intraday/strategyRegistry';
