import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import IndicatorPicker from '../../src/components/platform/strategies/builder/IndicatorPicker';
import StrategyRuleComposer from '../../src/components/platform/strategies/builder/StrategyRuleComposer';
import type {
  StrategyBuilderIndicatorOption,
  StrategyRule,
} from '../../src/components/platform/strategies/builder/strategy-builder-model';

const rsi: StrategyBuilderIndicatorOption = {
  id: 'rsi',
  backlogId: 'MOM-001',
  name: 'Relative Strength Index',
  description: 'Measures momentum on a bounded scale.',
  category: 'momentum',
  available: true,
};

const momentum: StrategyBuilderIndicatorOption = {
  id: 'momentum-index',
  backlogId: 'MOM-002',
  name: 'Momentum Index',
  description: 'Compares recent price movement.',
  category: 'momentum',
  available: true,
};

const rsiRule: StrategyRule = {
  id: 'buy-rsi-1',
  indicatorId: 'rsi',
  period: 14,
  operator: 'crossesAbove',
  value: 30,
  connector: 'and',
};

function renderRuleComposer() {
  return renderToStaticMarkup(
    <StrategyRuleComposer
      side="buy"
      rules={[rsiRule]}
      indicators={[rsi]}
      locale="en"
      onAddRequest={vi.fn()}
      onUpdate={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
}

describe('StrategyRuleComposer', () => {
  it('renders the active indicator picker inside its rule section', () => {
    const markup = renderToStaticMarkup(
      <StrategyRuleComposer
        side="buy"
        rules={[]}
        indicators={[]}
        locale="en"
        onAddRequest={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
        picker={<div aria-label="Indicator library">Picker</div>}
      />,
    );

    expect(markup).toMatch(
      /<section[^>]*aria-labelledby="buy-rules-title"[^>]*>[\s\S]*aria-label="Indicator library"[\s\S]*<\/section>/,
    );
  });

  it('renders configure and delete icon actions for a selected indicator', () => {
    const markup = renderRuleComposer();

    expect(markup).toContain('aria-label="Configure Relative Strength Index"');
    expect(markup).toContain('aria-label="Remove Relative Strength Index"');
  });

  it('keeps indicator settings in the contextual inspector instead of inline', () => {
    const markup = renderRuleComposer();

    expect(markup).not.toContain('>Period<');
    expect(markup).not.toContain('>Condition<');
    expect(markup).not.toContain('>Level<');
    expect(markup).toContain('Relative Strength Index (14) crosses above 30');
  });
});

describe('IndicatorPicker', () => {
  it('renders as an inline searchable combobox', () => {
    const markup = renderToStaticMarkup(
      <IndicatorPicker
        indicators={[rsi, momentum]}
        selectedIds={new Set(['rsi'])}
        locale="en"
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-label="Search and select indicator"');
  });

  it('groups unselected indicators behind expandable category rows before the user types', () => {
    const markup = renderToStaticMarkup(
      <IndicatorPicker
        indicators={[rsi, momentum]}
        selectedIds={new Set(['rsi'])}
        locale="en"
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('>Momentum<');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain('Momentum Index');
    expect(markup).not.toContain('Relative Strength Index');
  });
});
