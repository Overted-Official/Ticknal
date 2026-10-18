import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/lib/i18n';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: () => {} }),
}));

import IndicatorPicker, { rankIndicatorSearchMatches } from './IndicatorPicker';
import AdvancedBlockLibraryModal from './AdvancedBlockLibraryModal';
import AdvancedNodeEditor from './AdvancedNodeEditor';
import StrategyBuilderWorkspace from './StrategyBuilderWorkspace';
import { createAdvancedIndicatorNode, createAdvancedNodeFromTemplate } from './advanced-builder-state';
import { ADVANCED_BLOCK_TEMPLATES } from './advanced-strategy-model';
import { getBlockEducation, getIndicatorEducation, getNodeEducation } from './strategy-library-education';
import { getIndicatorGuide } from './indicator-guides';

import {
  addRuleToDraft,
  createEmptyStrategyDraft,
  filterIndicatorOptions,
  isSimpleRuleIndicatorSupported,
  isStrategyDraftTestable,
  localizeIndicatorCatalog,
  removeRuleFromDraft,
  updateStrategyRule,
  type StrategyBuilderIndicatorOption,
} from './strategy-builder-model';

const INDICATORS: readonly StrategyBuilderIndicatorOption[] = [
  {
    id: 'relative-strength-index',
    formulaVersion: '1.0.0',
    backlogId: 'MOM-001',
    name: 'Relative Strength Index',
    description: 'Measures momentum on a bounded scale.',
    category: 'Momentum',
    available: true,
    defaultParameters: { period: 14 },
    outputs: [{ key: 'rsi', kind: 'number', unit: 'percent' }],
    requiredCapabilities: [],
  },
  {
    id: 'moving-average-convergence-divergence',
    formulaVersion: '1.0.0',
    backlogId: 'MOM-002',
    name: 'Moving Average Convergence Divergence',
    description: 'Compares fast and slow moving averages.',
    category: 'Momentum',
    available: true,
    defaultParameters: { fast: 12, slow: 26 },
    outputs: [{ key: 'macd', kind: 'number', unit: 'price' }, { key: 'signal', kind: 'number', unit: 'price' }],
    requiredCapabilities: [],
  },
  {
    id: 'egypt-investor-flow',
    formulaVersion: '1.0.0',
    backlogId: 'EGY-031',
    name: 'Egypt Investor Flow',
    description: 'Tracks local and foreign investor flows.',
    category: 'Egypt',
    available: false,
    defaultParameters: {},
    outputs: [],
    requiredCapabilities: ['market-flow'],
  },
];

describe('strategy builder model', () => {
  it('exposes a compact actions trigger for narrow Strategy Studio layouts', () => {
    const markup = renderToStaticMarkup(createElement(LocaleProvider, {
      initialLocale: 'en',
      children: createElement(StrategyBuilderWorkspace, {
        indicatorCatalog: [], universe: [], canViewProprietary: false,
        proprietaryAlertsEnabled: false, profiles: [], typhonNodes: [],
      }),
    }));
    expect(markup).toContain('aria-label="More strategy actions"');
  });
  it('shows only relevant indicator parameters with typed numeric controls and keeps identity edits tucked away', () => {
    const node = createAdvancedIndicatorNode(INDICATORS[1], 'macd-node');
    const markup = renderToStaticMarkup(createElement(AdvancedNodeEditor, {
      node, nodes: [node], indicators: INDICATORS, locale: 'en', onChange: () => {},
    }));
    expect(markup).toContain('Fast');
    expect(markup).toContain('Slow');
    expect(markup).toContain('Increment Fast');
    expect(markup).toContain('Change indicator');
    expect(markup).toContain('Name &amp; output');
    expect(markup).not.toContain('Block name');
    expect(markup).not.toContain('>Period<');
  });

  it('edits priority thresholds as separate numeric levels instead of comma-separated text', () => {
    const node = createAdvancedNodeFromTemplate(ADVANCED_BLOCK_TEMPLATES.find((template) => template.id === 'priority-trigger')!, 'levels');
    const markup = renderToStaticMarkup(createElement(AdvancedNodeEditor, {
      node, nodes: [node], indicators: INDICATORS, locale: 'en', onChange: () => {},
    }));
    expect(markup).toContain('Increment Priority level 1');
    expect(markup).toContain('Add level');
    expect(markup).not.toContain('placeholder="23.6, 14.6, 38.2"');
  });
  it('derives localized display metadata from stable catalog identities', () => {
    const catalog = [{
      id: 'relative-strength-index',
      formulaVersion: '1.0.0',
      backlogId: 'MOM-001',
      category: 'momentum',
      available: true,
      defaultParameters: { period: 14 },
      outputs: [{ key: 'rsi', kind: 'number', unit: 'percent' }],
      requiredCapabilities: [],
      name: { en: 'Relative Strength Index', ar: 'مؤشر القوة النسبية' },
      description: { en: 'Momentum oscillator.', ar: 'مذبذب الزخم.' },
    }] as const;

    expect(localizeIndicatorCatalog(catalog, 'ar')).toEqual([{
      id: 'relative-strength-index',
      formulaVersion: '1.0.0',
      backlogId: 'MOM-001',
      category: 'momentum',
      available: true,
      defaultParameters: { period: 14 },
      outputs: [{ key: 'rsi', kind: 'number', unit: 'percent' }],
      requiredCapabilities: [],
      name: 'مؤشر القوة النسبية',
      description: 'مذبذب الزخم.',
    }]);
  });

  it('filters the indicator picker by query and category without exposing unavailable indicators', () => {
    expect(filterIndicatorOptions(INDICATORS, 'strength', 'Momentum')).toEqual([
      INDICATORS[0],
    ]);
    expect(filterIndicatorOptions(INDICATORS, 'investor', 'all')).toEqual([]);
  });

  it('limits simple-rule choices to numeric indicators whose current controls can configure them', () => {
    expect(isSimpleRuleIndicatorSupported(INDICATORS[0])).toBe(true);
    expect(isSimpleRuleIndicatorSupported(INDICATORS[1])).toBe(false);
    expect(isSimpleRuleIndicatorSupported(INDICATORS[2])).toBe(false);
    expect(isSimpleRuleIndicatorSupported({ ...INDICATORS[0], repaintBehavior: 'confirmed-with-delay' })).toBe(false);
  });

  it('adds an indicator as a configurable buy rule only once per side', () => {
    const draft = createEmptyStrategyDraft();
    const added = addRuleToDraft(draft, 'buy', INDICATORS[0]);
    const duplicate = addRuleToDraft(added, 'buy', INDICATORS[0]);

    expect(duplicate.buyRules).toEqual([{
      id: 'buy-relative-strength-index-1',
      indicatorId: 'relative-strength-index',
      outputKey: 'rsi',
      period: 14,
      operator: 'crossesAbove',
      value: 30,
      connector: 'and',
    }]);
  });

  it('prefills the canonical period and single output when metadata is available', () => {
    const metadata = { ...INDICATORS[0], defaultParameters: { period: 21 }, outputs: [{ key: 'rsi', kind: 'number' as const, unit: 'percent' as const }] };
    const added = addRuleToDraft(createEmptyStrategyDraft(), 'buy', metadata);
    expect(added.buyRules[0]).toMatchObject({ period: 21, outputKey: 'rsi' });
  });

  it('allows the same indicator to have independent buy and sell rules', () => {
    const buyDraft = addRuleToDraft(createEmptyStrategyDraft(), 'buy', INDICATORS[0]);
    const completeDraft = addRuleToDraft(buyDraft, 'sell', INDICATORS[0]);

    expect(completeDraft.buyRules).toHaveLength(1);
    expect(completeDraft.sellRules).toHaveLength(1);
    expect(isStrategyDraftTestable(completeDraft)).toBe(true);
  });

  it('updates a rule without changing the other side', () => {
    const withBuy = addRuleToDraft(createEmptyStrategyDraft(), 'buy', INDICATORS[0]);
    const draft = addRuleToDraft(withBuy, 'sell', INDICATORS[1]);
    const updated = updateStrategyRule(draft, 'buy', 'buy-relative-strength-index-1', {
      period: 21,
      operator: 'crossesBelow',
      value: 70,
      connector: 'or',
    });

    expect(updated.buyRules[0]).toMatchObject({ period: 21, operator: 'crossesBelow', value: 70, connector: 'or' });
    expect(updated.sellRules).toEqual(draft.sellRules);
  });

  it('removes only the requested rule', () => {
    const first = addRuleToDraft(createEmptyStrategyDraft(), 'buy', INDICATORS[0]);
    const draft = addRuleToDraft(first, 'buy', INDICATORS[1]);
    const updated = removeRuleFromDraft(draft, 'buy', 'buy-relative-strength-index-1');

    expect(updated.buyRules.map((rule) => rule.indicatorId)).toEqual([INDICATORS[1].id]);
    expect(isStrategyDraftTestable(updated)).toBe(false);
  });
});

describe('canvas indicator library', () => {
  it('ranks indicator name matches ahead of incidental description matches', () => {
    const incidentalMatch = { ...INDICATORS[0], id: 'wilder-average', name: 'Wilder Moving Average', description: 'Recursive smoother of closing prices.' };
    const incidentalNameMatch = { ...INDICATORS[0], id: 'mean-reversion', name: 'Mean-reversion score', description: 'Rolling AR decay.' };

    expect(rankIndicatorSearchMatches([incidentalMatch, incidentalNameMatch, INDICATORS[0]], 'rsi').map((indicator) => indicator.id)).toEqual([
      'relative-strength-index',
    ]);
  });

  it('gives the buy-rule picker a titled category browser with useful indicator context', () => {
    const markup = renderToStaticMarkup(createElement(IndicatorPicker, {
      indicators: INDICATORS,
      selectedIds: new Set<string>(),
      locale: 'en',
      presentation: 'canvas',
      ruleSide: 'buy',
      onAdd: () => {},
      onClose: () => {},
    }));

    expect(markup).toContain('Add a buy rule');
    expect(markup).toContain('Indicator categories');
    expect(markup).toContain('Measures momentum on a bounded scale.');
    expect(markup).toContain('Learn about Relative Strength Index');
  });

  it('gives the advanced indicator stage the same category browser without calling an indicator a buy rule', () => {
    const markup = renderToStaticMarkup(createElement(IndicatorPicker, {
      indicators: INDICATORS,
      selectedIds: new Set<string>(),
      locale: 'en',
      presentation: 'canvas',
      canvasPurpose: 'indicator',
      onAdd: () => {},
      onClose: () => {},
    }));

    expect(markup).toContain('Add an indicator');
    expect(markup).toContain('Indicator categories');
    expect(markup).toContain('Add Relative Strength Index');
    expect(markup).not.toContain('Add a buy rule');
  });

  it('provides an actionable RSI guide with thresholds, an illustrative chart, and a caution', () => {
    const guide = getIndicatorEducation(INDICATORS[0], 'en');
    expect(guide.visualization).toBe('rsi');
    expect(guide.levels.map((level: { value: number }) => level.value)).toEqual([70, 50, 30]);
    expect(guide.example).toContain('crosses above 30');
    expect(guide.caution).toContain('not an automatic');
  });

  it('uses each indicator’s own metadata rather than showing RSI guidance for another indicator', () => {
    const guide = getIndicatorEducation(INDICATORS[1], 'en');
    expect(guide.title).toBe('Moving Average Convergence Divergence');
    expect(guide.summary).toBe('Compares fast and slow moving averages.');
    expect(guide.visualization).toBeNull();
    expect(guide.parameters).toEqual(['fast: 12', 'slow: 26']);
    expect(guide.outputs).toEqual(['macd (price)', 'signal (price)']);
    expect(guide.example).not.toContain('30');
  });

  it('does not substitute the featured RSI lesson for an unrelated inspector item', () => {
    const guide = getIndicatorGuide('moving-average-convergence-divergence', {
      name: 'Moving Average Convergence Divergence',
      description: 'Compares fast and slow moving averages.',
      category: 'Momentum',
    });
    expect(guide.name.en).toBe('Moving Average Convergence Divergence');
    expect(guide.summary.en).toBe('Compares fast and slow moving averages.');
    expect(guide.keyZones).toEqual([]);
    expect(guide.setups).toEqual([]);
  });

  it('explains every advanced library block and gives calculations distinct guidance', () => {
    for (const template of ADVANCED_BLOCK_TEMPLATES) {
      const guide = getBlockEducation(template, 'en');
      expect(guide.title).toBe(template.title.en);
      expect(guide.howToUse.length).toBeGreaterThan(20);
      expect(guide.caution.length).toBeGreaterThan(20);
    }
    expect(getBlockEducation(ADVANCED_BLOCK_TEMPLATES.find((template) => template.id === 'weighted-composite')!, 'en').howToUse).toContain('weights');
  });

  it('explains a canvas data source as a source, not as an RSI oscillator or downstream consumer', () => {
    const guide = getNodeEducation({
      id: 'custom-market-data',
      stage: 'inputs',
      kind: 'input',
      title: { en: 'Primary market series', ar: 'سلسلة السوق الأساسية' },
      summary: { en: 'OHLCV data for the ticker.', ar: 'بيانات OHLCV للسهم.' },
      parameters: { series: 'ohlcv' },
      outputName: 'market_ohlcv',
    }, INDICATORS, 'en');
    expect(guide.title).toBe('Primary market series');
    expect(guide.howToUse).toContain('source block supplies market data');
    expect(guide.visualization).toBeNull();
  });

  it('offers a separate learning action for advanced blocks without adding them', () => {
    const markup = renderToStaticMarkup(createElement(AdvancedBlockLibraryModal, {
      templateIds: ['weighted-composite'],
      title: { en: 'Calculations', ar: 'الحسابات' },
      search: { en: 'Search cards', ar: 'ابحث عن بطاقة' },
      locale: 'en',
      onAdd: () => {},
      onClose: () => {},
    }));
    expect(markup).toContain('Learn about Weighted calculation');
    expect(markup).toContain('Add Weighted calculation');
  });

  it('browses only the categories available in the selected advanced stage', () => {
    const markup = renderToStaticMarkup(createElement(AdvancedBlockLibraryModal, {
      templateIds: ['condition', 'priority-trigger'],
      title: { en: 'Buy conditions', ar: 'شروط الشراء' },
      search: { en: 'Search cards', ar: 'ابحث عن بطاقة' },
      locale: 'en',
      onAdd: () => {},
      onClose: () => {},
    }));

    expect(markup).toContain('strategy-library-browser');
    expect(markup).toContain('Block categories');
    expect(markup).toContain('Create a rule');
    expect(markup).toContain('Combine rules');
    expect(markup).not.toContain('Market data');
  });
});
