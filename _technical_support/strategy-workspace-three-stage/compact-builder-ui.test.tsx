import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import CompactStrategyBlockRow from '../../src/components/platform/strategies/builder/CompactStrategyBlockRow';
import StrategyBlockInspector from '../../src/components/platform/strategies/builder/StrategyBlockInspector';
import { createAdvancedDraftNodes } from '../../src/components/platform/strategies/builder/advanced-strategy-model';
import type { StrategyBuilderIndicatorOption, StrategyRule } from '../../src/components/platform/strategies/builder/strategy-builder-model';

const indicator: StrategyBuilderIndicatorOption = {
  id: 'rsi', backlogId: 'MOM-001', name: 'Relative Strength Index',
  description: 'Measures momentum on a bounded scale.', category: 'momentum', available: true,
};
const rule: StrategyRule = {
  id: 'buy-rsi-1', indicatorId: 'rsi', period: 14,
  operator: 'crossesAbove', value: 30, connector: 'and',
};

describe('compact strategy UI', () => {
  it('renders one-line content and accessible row actions', () => {
    const markup = renderToStaticMarkup(
      <CompactStrategyBlockRow
        id="rsi-row" name="Relative Strength Index" summary="RSI (14) crosses above 30"
        tone="buy" readOnly={false} selected={false}
        onInspect={vi.fn()} onConfigure={vi.fn()} onRemove={vi.fn()}
      />,
    );
    expect(markup).toContain('Relative Strength Index');
    expect(markup).toContain('RSI (14) crosses above 30');
    expect(markup).toContain('aria-label="Learn about Relative Strength Index"');
    expect(markup).toContain('aria-label="Configure Relative Strength Index"');
    expect(markup).toContain('aria-label="Remove Relative Strength Index"');
    expect(markup).not.toMatch(/<p[\s>]/);
  });

  it('removes mutation actions for protected rows and exposes validation in text', () => {
    const markup = renderToStaticMarkup(
      <CompactStrategyBlockRow
        id="locked" name="Protected formula" summary="Read only" tone="calculation"
        readOnly selected={false} validationMessage="Connect an input"
        onInspect={vi.fn()} onConfigure={vi.fn()} onRemove={vi.fn()}
      />,
    );
    expect(markup).toContain('Learn about Protected formula');
    expect(markup).not.toContain('Configure Protected formula');
    expect(markup).not.toContain('Remove Protected formula');
    expect(markup).toContain('Needs attention');
    expect(markup).toContain('Connect an input');
  });

  it('renders a square black inspector with learning visualization and usage', () => {
    const nodes = createAdvancedDraftNodes();
    const target = nodes[0];
    const dependent = { ...nodes[1], connections: [target.id] };
    const markup = renderToStaticMarkup(
      <StrategyBlockInspector
        target={{ kind: 'advanced-node', node: target }} tab="learn"
        nodes={[target, dependent]} indicators={[indicator]} locale="en"
        onTabChange={vi.fn()} onChange={vi.fn()} onClose={vi.fn()}
      />,
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('bg-black');
    expect(markup).toContain('rounded-none');
    expect(markup).toContain('>Learn<');
    expect(markup).toContain('role="img"');
    expect(markup).not.toContain('>Configure<');

    const usageMarkup = renderToStaticMarkup(
      <StrategyBlockInspector
        target={{ kind: 'advanced-node', node: target }} tab="usage"
        nodes={[target, dependent]} indicators={[indicator]} locale="en"
        onTabChange={vi.fn()} onChange={vi.fn()} onClose={vi.fn()}
      />,
    );
    expect(usageMarkup).toContain('Buy Logic');
  });

  it('handles unknown indicators without crashing', () => {
    const markup = renderToStaticMarkup(
      <StrategyBlockInspector
        target={{ kind: 'simple-rule', side: 'buy', rule, indicator: null }} tab="learn"
        nodes={[]} indicators={[]} locale="en"
        onTabChange={vi.fn()} onChange={vi.fn()} onClose={vi.fn()}
      />,
    );
    expect(markup).toContain('Unknown indicator');
  });
});
