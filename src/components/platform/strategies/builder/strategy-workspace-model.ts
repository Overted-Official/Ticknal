export type StrategyWorkspaceStage = 'build' | 'visualize' | 'backtest';

export type StrategyStageStatus = 'incomplete' | 'ready' | 'protected';

export interface StrategyWorkspaceState {
  readonly activeStage: StrategyWorkspaceStage;
  readonly selectedStrategyId: string;
  readonly focusedBlockId: string | null;
  readonly inspectorOpen: boolean;
}

export type StrategyWorkspaceEvent =
  | { readonly type: 'select-stage'; readonly stage: StrategyWorkspaceStage }
  | { readonly type: 'select-strategy'; readonly strategyId: string }
  | { readonly type: 'focus-block'; readonly blockId: string }
  | { readonly type: 'close-inspector' };

export function getStrategyStageStatuses({
  isProtected,
  hasBuyLogic,
  hasSellLogic,
}: {
  readonly isProtected: boolean;
  readonly hasBuyLogic: boolean;
  readonly hasSellLogic: boolean;
}): Readonly<Record<StrategyWorkspaceStage, StrategyStageStatus>> {
  if (isProtected) {
    return { build: 'protected', visualize: 'protected', backtest: 'protected' };
  }

  const status: StrategyStageStatus = hasBuyLogic && hasSellLogic ? 'ready' : 'incomplete';
  return { build: status, visualize: status, backtest: status };
}

export function transitionStrategyWorkspace(
  state: StrategyWorkspaceState,
  event: StrategyWorkspaceEvent,
): StrategyWorkspaceState {
  switch (event.type) {
    case 'select-stage':
      return { ...state, activeStage: event.stage };
    case 'select-strategy':
      return {
        activeStage: 'build',
        selectedStrategyId: event.strategyId,
        focusedBlockId: null,
        inspectorOpen: false,
      };
    case 'focus-block':
      return { ...state, focusedBlockId: event.blockId, inspectorOpen: true };
    case 'close-inspector':
      return { ...state, inspectorOpen: false };
  }
}
