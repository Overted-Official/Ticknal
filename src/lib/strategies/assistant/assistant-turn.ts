import type { StrategyBuilderIndicatorOption } from '../../../components/platform/strategies/builder/strategy-builder-model';
import { applyStrategyActions, canEditStrategySnapshot, parseStrategyActions, type StrategyAction, type StrategyWorkspaceSnapshot } from './strategy-actions';
import { compileAdvancedStrategy, type CompileAdvancedResult } from '../../../components/platform/strategies/builder/compile-advanced-strategy';
import { compileSimpleStrategy, type CompileSimpleStrategyResult } from '../../../components/platform/strategies/builder/compile-simple-strategy';
import type { TickyMessage } from './chat-history';

export interface AssistantTurnInput {
  readonly snapshot: StrategyWorkspaceSnapshot;
  readonly message: string;
  readonly catalog: readonly StrategyBuilderIndicatorOption[];
  readonly history?: readonly TickyMessage[];
}

export interface AssistantProposal {
  readonly message: string;
  readonly actions: readonly StrategyAction[];
}

export type AssistantTurnResult =
  | { readonly status: 'ok'; readonly message: string; readonly actions: readonly StrategyAction[]; readonly snapshot: StrategyWorkspaceSnapshot; readonly compilation: CompileAdvancedResult | CompileSimpleStrategyResult }
  | { readonly status: 'invalid' | 'unavailable'; readonly error: string };

export async function runStrategyAssistantTurn(
  input: AssistantTurnInput,
  generate: (input: AssistantTurnInput) => Promise<unknown>,
): Promise<AssistantTurnResult> {
  if (!canEditStrategySnapshot(input.snapshot) || typeof input.message !== 'string' || input.message.trim().length < 2 || input.message.length > 2000) {
    return { status: 'invalid', error: 'Provide a valid user-owned draft and a short request.' };
  }
  let raw: unknown;
  try { raw = await generate(input); }
  catch { return { status: 'unavailable', error: 'The assistant is temporarily unavailable. Your draft was not changed.' }; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { status: 'invalid', error: 'The assistant returned an invalid response.' };
  const proposal = raw as Record<string, unknown>;
  if (typeof proposal.message !== 'string' || proposal.message.length < 1 || proposal.message.length > 2000 || !Array.isArray(proposal.actions)) {
    return { status: 'invalid', error: 'The assistant returned an invalid response.' };
  }
  const actions = proposal.actions.length ? parseStrategyActions(proposal.actions) : [];
  if (!actions) return { status: 'invalid', error: 'The assistant proposed an unsupported action. Your draft was not changed.' };
  const applied = actions.length ? applyStrategyActions(input.snapshot, actions, input.catalog) : { status: 'ok' as const, snapshot: input.snapshot };
  if (applied.status !== 'ok') return { status: 'invalid', error: applied.error };
  const { snapshot } = applied;
  try {
    const compilation = snapshot.mode === 'advanced'
      ? compileAdvancedStrategy(snapshot.nodes, input.catalog)
      : compileSimpleStrategy(snapshot.draft, input.catalog);
    return { status: 'ok', message: proposal.message, actions, snapshot, compilation };
  } catch {
    return { status: 'invalid', error: 'The proposed settings could not be compiled. Your draft was not changed.' };
  }
}
