import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import StrategyStageNavigation from '../../src/components/platform/strategies/builder/StrategyStageNavigation';
import {
  getStrategyStageStatuses,
  transitionStrategyWorkspace,
  type StrategyWorkspaceState,
} from '../../src/components/platform/strategies/builder/strategy-workspace-model';

const INITIAL_STATE: StrategyWorkspaceState = {
  activeStage: 'build',
  selectedStrategyId: 'custom-draft',
  focusedBlockId: null,
  inspectorOpen: false,
};

describe('strategy workspace model', () => {
  it('marks custom visualize and backtest incomplete until both rule sides exist', () => {
    expect(getStrategyStageStatuses({ isProtected: false, hasBuyLogic: true, hasSellLogic: false })).toEqual({
      build: 'incomplete',
      visualize: 'incomplete',
      backtest: 'incomplete',
    });
    expect(getStrategyStageStatuses({ isProtected: false, hasBuyLogic: true, hasSellLogic: true })).toEqual({
      build: 'ready',
      visualize: 'ready',
      backtest: 'ready',
    });
  });

  it('keeps incomplete stages selectable through explicit state transitions', () => {
    const next = transitionStrategyWorkspace(INITIAL_STATE, { type: 'select-stage', stage: 'visualize' });

    expect(next).toEqual({ ...INITIAL_STATE, activeStage: 'visualize' });
    expect(INITIAL_STATE.activeStage).toBe('build');
  });

  it('marks all protected stages protected', () => {
    expect(getStrategyStageStatuses({ isProtected: true, hasBuyLogic: false, hasSellLogic: false })).toEqual({
      build: 'protected',
      visualize: 'protected',
      backtest: 'protected',
    });
  });

  it('clears inspector and focused block when strategy changes', () => {
    const active: StrategyWorkspaceState = {
      activeStage: 'visualize',
      selectedStrategyId: 'custom-draft',
      focusedBlockId: 'rsi-14',
      inspectorOpen: true,
    };

    expect(transitionStrategyWorkspace(active, { type: 'select-strategy', strategyId: 'psi' })).toEqual({
      activeStage: 'build',
      selectedStrategyId: 'psi',
      focusedBlockId: null,
      inspectorOpen: false,
    });
  });

  it('renders three bilingual stages with selected and textual status states', () => {
    const statuses = { build: 'ready', visualize: 'incomplete', backtest: 'protected' } as const;
    const english = renderToStaticMarkup(
      createElement(StrategyStageNavigation, { activeStage: 'build', statuses, locale: 'en', onSelect: () => undefined }),
    );
    const arabic = renderToStaticMarkup(
      createElement(StrategyStageNavigation, { activeStage: 'visualize', statuses, locale: 'ar', onSelect: () => undefined }),
    );

    expect(english).toContain('role="tablist"');
    expect(english).toContain('01 Build');
    expect(english).toContain('02 Visualize');
    expect(english).toContain('03 Backtest');
    expect(english).toContain('aria-selected="true"');
    expect(english).toContain('Ready');
    expect(english).toContain('Incomplete');
    expect(english).toContain('Protected');
    expect(arabic).toContain('01 البناء');
    expect(arabic).toContain('02 التصور');
    expect(arabic).toContain('03 الاختبار الخلفي');
  });
});
