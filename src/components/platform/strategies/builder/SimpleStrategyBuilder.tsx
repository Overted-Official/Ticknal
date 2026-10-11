'use client';

import { useMemo, useState } from 'react';

import {
  Database,
  Plus,
  Target,
  TrendingUp,
} from '@/components/ui/icon-library';

import CompactStrategyBlockRow from './CompactStrategyBlockRow';
import IndicatorPicker from './IndicatorPicker';
import WorkflowPipelineCard from './WorkflowPipelineCard';
import { PipelineSplitConnector } from './WorkflowPipelineConnectors';
import type {
  StrategyBuilderIndicatorOption,
  StrategyDraft,
  StrategyRule,
  StrategyRuleConnector,
  StrategyRuleOperator,
  StrategyRuleSide,
} from './strategy-builder-model';
import type { StrategyInspectorTab } from './strategy-inspector-model';

interface SimpleStrategyBuilderProps {
  readonly draft: StrategyDraft;
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly locale: 'en' | 'ar';
  readonly pickerSide: StrategyRuleSide | null;
  readonly onPickerSideChange: (side: StrategyRuleSide | null) => void;
  readonly focusedRuleId?: string | null;
  readonly onFocusRule?: (ruleId: string | null) => void;
  readonly onInspectRule?: (
    side: StrategyRuleSide,
    rule: StrategyRule,
    indicator: StrategyBuilderIndicatorOption | null,
    tab: StrategyInspectorTab,
  ) => void;
  readonly onAddRule: (side: StrategyRuleSide, indicator: StrategyBuilderIndicatorOption) => void;
  readonly onUpdateRule: (
    side: StrategyRuleSide,
    ruleId: string,
    changes: Partial<Pick<StrategyRule, 'period' | 'operator' | 'value' | 'connector'>>,
  ) => void;
  readonly onRemoveRule: (side: StrategyRuleSide, ruleId: string) => void;
}

function getOperatorLabel(operator: StrategyRuleOperator, isAr: boolean): string {
  switch (operator) {
    case 'crossesAbove':
      return isAr ? 'يعبر لأعلى' : 'crosses above';
    case 'crossesBelow':
      return isAr ? 'يعبر لأسفل' : 'crosses below';
    case 'isAbove':
      return isAr ? 'أعلى من' : 'is above';
    case 'isBelow':
      return isAr ? 'أقل من' : 'is below';
  }
}

export default function SimpleStrategyBuilder({
  draft,
  indicators,
  locale,
  pickerSide,
  onPickerSideChange,
  focusedRuleId,
  onFocusRule,
  onInspectRule,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
}: SimpleStrategyBuilderProps) {
  const isAr = locale === 'ar';
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (cardId: string) => {
    setCollapsedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Derive unique indicators configured in the strategy
  const activeIndicators = useMemo(() => {
    const ids = Array.from(new Set([...draft.buyRules, ...draft.sellRules].map((r) => r.indicatorId)));
    return ids.map((id) => {
      const indicator = indicators.find((item) => item.id === id);
      const buyCount = draft.buyRules.filter((r) => r.indicatorId === id).length;
      const sellCount = draft.sellRules.filter((r) => r.indicatorId === id).length;
      return {
        id,
        indicator: indicator ?? null,
        name: indicator?.name ?? (isAr ? 'مؤشر غير معروف' : 'Unknown indicator'),
        description: indicator?.description ?? '',
        buyCount,
        sellCount,
        totalCount: buyCount + sellCount,
      };
    });
  }, [draft.buyRules, draft.sellRules, indicators, isAr]);

  const selectedIds = useMemo(
    () => new Set(activeIndicators.map((item) => item.id)),
    [activeIndicators],
  );

  const handleAddFromPicker = (indicator: StrategyBuilderIndicatorOption) => {
    const side = pickerSide ?? 'buy';
    onAddRule(side, indicator);
    onPickerSideChange(null);
  };

  return (
    <div aria-label={isAr ? 'منشئ الاستراتيجية البسيط' : 'Simple strategy builder'}>
      {/* Node Canvas Surface */}
      <div
        data-testid="simple-workflow-canvas"
        className="relative w-full p-0.5 sm:p-1"
      >
        {/* 1. DATA & INDICATORS TIER (Centered, compact width) */}
        <div className="mx-auto w-full max-w-2xl">
          <WorkflowPipelineCard
            id="simple-pipeline-data-indicators"
            title={isAr ? 'البيانات والمؤشرات' : 'Data & Indicators'}
            subtitle={isAr ? 'المؤشرات الفنية المستخدمة في قواعد الاستراتيجية' : 'Technical indicators evaluated by your rules'}
            icon={Database}
            theme="blue"
            itemCount={activeIndicators.length}
            hasTopPort={false}
            hasBottomPort={true}
            isCollapsed={Boolean(collapsedCards['data-indicators'])}
            onToggleCollapse={() => toggleCard('data-indicators')}
          >
            <div className="space-y-1.5 p-2.5 sm:p-3">
              {activeIndicators.map((item) => (
                <CompactStrategyBlockRow
                  key={item.id}
                  id={`simple-indicator-${item.id}`}
                  name={item.name}
                  summary={
                    item.description
                      ? `${item.description} • ${isAr ? `مستخدم في ${item.totalCount} قاعدة` : `Used in ${item.totalCount} rule(s)`}`
                      : isAr ? `مستخدم في ${item.totalCount} قاعدة` : `Used in ${item.totalCount} rule(s)`
                  }
                  tone="input"
                  readOnly={false}
                  selected={false}
                  onInspect={() => {
                    const firstRule = draft.buyRules.find((r) => r.indicatorId === item.id)
                      ?? draft.sellRules.find((r) => r.indicatorId === item.id);
                    if (firstRule) {
                      const side: StrategyRuleSide = draft.buyRules.some((r) => r.id === firstRule.id) ? 'buy' : 'sell';
                      onInspectRule?.(side, firstRule, item.indicator, 'learn');
                      onFocusRule?.(firstRule.id);
                    }
                  }}
                  onConfigure={() => {
                    const firstRule = draft.buyRules.find((r) => r.indicatorId === item.id)
                      ?? draft.sellRules.find((r) => r.indicatorId === item.id);
                    if (firstRule) {
                      const side: StrategyRuleSide = draft.buyRules.some((r) => r.id === firstRule.id) ? 'buy' : 'sell';
                      onInspectRule?.(side, firstRule, item.indicator, 'configure');
                      onFocusRule?.(firstRule.id);
                    }
                  }}
                  onRemove={() => {
                    draft.buyRules.filter((r) => r.indicatorId === item.id).forEach((r) => onRemoveRule('buy', r.id));
                    draft.sellRules.filter((r) => r.indicatorId === item.id).forEach((r) => onRemoveRule('sell', r.id));
                  }}
                />
              ))}

              <button
                type="button"
                onClick={() => onPickerSideChange('buy')}
                aria-label={isAr ? 'إضافة مؤشر' : 'Add indicator'}
                className="flex min-h-7.5 w-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] font-sans text-[10px] font-medium text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
              >
                <Plus size={11} className="me-1" />
                <span>{isAr ? 'إضافة مؤشر' : 'Add indicator'}</span>
              </button>
            </div>
          </WorkflowPipelineCard>
        </div>

        {/* Connecting 1-to-2 Branching Line */}
        <PipelineSplitConnector label={isAr ? 'تدفق من المؤشرات إلى القواعد' : 'Flow from Indicators to Rules'} />

        {/* 2. EXECUTION TIER: Buy Rules & Sell Rules Side-by-Side */}
        <div className="grid w-full grid-cols-1 gap-2.5 md:grid-cols-2">
          {/* 2A: Buy Rules */}
          <WorkflowPipelineCard
            id="simple-pipeline-buy"
            title={isAr ? 'قواعد الشراء' : 'Buy Rules'}
            subtitle={isAr ? 'شروط وقواعد فتح الصفقات' : 'Conditions to open a position'}
            icon={TrendingUp}
            theme="green"
            itemCount={draft.buyRules.length}
            hasTopPort={true}
            hasBottomPort={false}
            isCollapsed={Boolean(collapsedCards['buy'])}
            onToggleCollapse={() => toggleCard('buy')}
          >
            <div className="space-y-1.5 p-2.5 sm:p-3">
              {draft.buyRules.map((rule, index) => {
                const indicator = indicators.find((item) => item.id === rule.indicatorId) ?? null;
                const name = indicator?.name ?? (isAr ? 'مؤشر غير معروف' : 'Unknown indicator');
                return (
                  <div key={rule.id}>
                    {index > 0 && (
                      <div className="flex items-center gap-2 py-0.5">
                        <span className="h-px flex-1 bg-white/10" />
                        <div className="pill-switch text-[8px]" aria-label={isAr ? 'رابط القاعدة' : 'Rule connector'}>
                          {(['and', 'or'] as const).map((connector: StrategyRuleConnector) => (
                            <button
                              key={connector}
                              type="button"
                              onClick={() => onUpdateRule('buy', rule.id, { connector })}
                              aria-pressed={rule.connector === connector}
                              className={`pill-switch-btn ${rule.connector === connector ? 'pill-switch-btn-active' : ''}`}
                            >
                              {connector === 'and' ? (isAr ? 'و' : 'AND') : (isAr ? 'أو' : 'OR')}
                            </button>
                          ))}
                        </div>
                        <span className="h-px flex-1 bg-white/10" />
                      </div>
                    )}
                    <CompactStrategyBlockRow
                      id={`buy-${rule.id}`}
                      name={name}
                      summary={`${name} (${rule.period}) ${getOperatorLabel(rule.operator, isAr)} ${rule.value}`}
                      tone="buy"
                      readOnly={false}
                      selected={focusedRuleId === rule.id}
                      validationMessage={indicator ? undefined : (isAr ? 'اختر مؤشراً متاحاً' : 'Choose an available indicator')}
                      onInspect={() => {
                        onInspectRule?.('buy', rule, indicator, 'learn');
                        onFocusRule?.(rule.id);
                      }}
                      onConfigure={() => {
                        onInspectRule?.('buy', rule, indicator, 'configure');
                        onFocusRule?.(rule.id);
                      }}
                      onRemove={() => onRemoveRule('buy', rule.id)}
                    />
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => onPickerSideChange('buy')}
                aria-label={isAr ? 'إضافة شرط شراء' : 'Add buy rule'}
                className="flex min-h-7.5 w-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] font-sans text-[10px] font-medium text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
              >
                <Plus size={11} className="me-1" />
                <span>{isAr ? 'إضافة شرط شراء' : 'Add buy rule'}</span>
              </button>
            </div>
          </WorkflowPipelineCard>

          {/* 2B: Sell Rules */}
          <WorkflowPipelineCard
            id="simple-pipeline-sell"
            title={isAr ? 'قواعد البيع' : 'Sell Rules'}
            subtitle={isAr ? 'أهداف الربح ووقف الخسارة وقواعد الخروج' : 'Conditions to close a position'}
            icon={Target}
            theme="red"
            itemCount={draft.sellRules.length}
            hasTopPort={true}
            hasBottomPort={false}
            isCollapsed={Boolean(collapsedCards['sell'])}
            onToggleCollapse={() => toggleCard('sell')}
          >
            <div className="space-y-1.5 p-2.5 sm:p-3">
              {draft.sellRules.map((rule, index) => {
                const indicator = indicators.find((item) => item.id === rule.indicatorId) ?? null;
                const name = indicator?.name ?? (isAr ? 'مؤشر غير معروف' : 'Unknown indicator');
                return (
                  <div key={rule.id}>
                    {index > 0 && (
                      <div className="flex items-center gap-2 py-0.5">
                        <span className="h-px flex-1 bg-white/10" />
                        <div className="pill-switch text-[8px]" aria-label={isAr ? 'رابط القاعدة' : 'Rule connector'}>
                          {(['and', 'or'] as const).map((connector: StrategyRuleConnector) => (
                            <button
                              key={connector}
                              type="button"
                              onClick={() => onUpdateRule('sell', rule.id, { connector })}
                              aria-pressed={rule.connector === connector}
                              className={`pill-switch-btn ${rule.connector === connector ? 'pill-switch-btn-active' : ''}`}
                            >
                              {connector === 'and' ? (isAr ? 'و' : 'AND') : (isAr ? 'أو' : 'OR')}
                            </button>
                          ))}
                        </div>
                        <span className="h-px flex-1 bg-white/10" />
                      </div>
                    )}
                    <CompactStrategyBlockRow
                      id={`sell-${rule.id}`}
                      name={name}
                      summary={`${name} (${rule.period}) ${getOperatorLabel(rule.operator, isAr)} ${rule.value}`}
                      tone="sell"
                      readOnly={false}
                      selected={focusedRuleId === rule.id}
                      validationMessage={indicator ? undefined : (isAr ? 'اختر مؤشراً متاحاً' : 'Choose an available indicator')}
                      onInspect={() => {
                        onInspectRule?.('sell', rule, indicator, 'learn');
                        onFocusRule?.(rule.id);
                      }}
                      onConfigure={() => {
                        onInspectRule?.('sell', rule, indicator, 'configure');
                        onFocusRule?.(rule.id);
                      }}
                      onRemove={() => onRemoveRule('sell', rule.id)}
                    />
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => onPickerSideChange('sell')}
                aria-label={isAr ? 'إضافة قاعدة بيع' : 'Add sell rule'}
                className="flex min-h-7.5 w-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] font-sans text-[10px] font-medium text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
              >
                <Plus size={11} className="me-1" />
                <span>{isAr ? 'إضافة قاعدة بيع' : 'Add sell rule'}</span>
              </button>
            </div>
          </WorkflowPipelineCard>
        </div>
      </div>

      {/* Floating Indicator Picker Modal */}
      {pickerSide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => onPickerSideChange(null)}
        >
          <div
            className="w-full max-w-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <IndicatorPicker
              indicators={indicators}
              selectedIds={selectedIds}
              locale={locale}
              onAdd={handleAddFromPicker}
              onClose={() => onPickerSideChange(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
