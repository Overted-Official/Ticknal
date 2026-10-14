import type { ExecutableStrategyProgram } from '../strategy-program';
import type { SavedStrategyRecord } from './parse-saved-strategy';
import { getStrategyIndicatorCatalog } from '../../../components/platform/strategies/strategy-indicator-catalog';
import { compileAdvancedStrategy } from '../../../components/platform/strategies/builder/compile-advanced-strategy';
import { compileSimpleStrategy } from '../../../components/platform/strategies/builder/compile-simple-strategy';

export type CompiledSavedStrategy =
  | { readonly status: 'ready'; readonly program: ExecutableStrategyProgram }
  | { readonly status: 'invalid'; readonly message: string };

export function compileSavedStrategy(strategy: SavedStrategyRecord): CompiledSavedStrategy {
  const catalog = getStrategyIndicatorCatalog();
  if (strategy.mode === 'simple') {
    const result = compileSimpleStrategy(strategy.draft, catalog);
    return result.status === 'ready' ? { status: 'ready', program: result.program }
      : { status: 'invalid', message: result.diagnostics[0]?.code ?? 'The simple strategy is incomplete.' };
  }
  const result = compileAdvancedStrategy(strategy.nodes, catalog);
  return result.status === 'ready' ? { status: 'ready', program: result.program }
    : { status: 'invalid', message: result.diagnostics[0]?.message ?? 'The advanced workflow is incomplete.' };
}
