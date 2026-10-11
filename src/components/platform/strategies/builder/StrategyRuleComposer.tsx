'use client';

import type { ReactNode } from 'react';

import { AlertTriangle, Plus } from '@/components/ui/icon-library';

import CompactStrategyBlockRow from './CompactStrategyBlockRow';
import type { StrategyInspectorTab } from './strategy-inspector-model';
import type { StrategyBuilderIndicatorOption, StrategyRule, StrategyRuleConnector, StrategyRuleSide } from './strategy-builder-model';

interface StrategyRuleComposerProps {
  readonly side: StrategyRuleSide;
  readonly rules: readonly StrategyRule[];
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly locale: 'en' | 'ar';
  readonly picker?: ReactNode;
  readonly focusedRuleId?: string | null;
  readonly onInspectRule?: (side: StrategyRuleSide, rule: StrategyRule, indicator: StrategyBuilderIndicatorOption | null, tab: StrategyInspectorTab) => void;
  readonly onAddRequest: (side: StrategyRuleSide) => void;
  readonly onUpdate: (side: StrategyRuleSide, ruleId: string, changes: Partial<Pick<StrategyRule, 'period' | 'operator' | 'value' | 'connector'>>) => void;
  readonly onRemove: (side: StrategyRuleSide, ruleId: string) => void;
}

export default function StrategyRuleComposer({ side, rules, indicators, locale, picker, focusedRuleId, onInspectRule, onAddRequest, onUpdate, onRemove }: StrategyRuleComposerProps) {
  const isAr = locale === 'ar';
  const isBuy = side === 'buy';
  const title = isBuy ? (isAr ? 'قواعد الشراء' : 'Buy rules') : (isAr ? 'قواعد البيع' : 'Sell rules');
  const subtitle = isBuy ? (isAr ? 'حدد متى تبدأ الصفقة.' : 'Define when a position should open.') : (isAr ? 'حدد متى تنتهي الصفقة.' : 'Define when a position should close.');
  const connectorLabel = (connector: StrategyRuleConnector) => connector === 'and' ? (isAr ? 'و' : 'AND') : (isAr ? 'أو' : 'OR');
  const operatorLabel = (operator: StrategyRule['operator']) => ({ crossesAbove: isAr ? 'يعبر لأعلى' : 'crosses above', crossesBelow: isAr ? 'يعبر لأسفل' : 'crosses below', isAbove: isAr ? 'أعلى من' : 'is above', isBelow: isAr ? 'أقل من' : 'is below' }[operator]);

  return (
    <section className="flex flex-col rounded-xl border border-white/10 bg-black p-4 sm:p-5 shadow-2xl" aria-labelledby={`${side}-rules-title`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isBuy ? 'bg-plt-profit' : 'bg-plt-risk'}`} />
            <h4 id={`${side}-rules-title`} className="font-sans text-sm font-semibold text-white">{title}</h4>
            <span className="tabular-nums font-sans text-[10px] text-plt-muted">{rules.length}</span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-plt-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => onAddRequest(side)}
          className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-plt-border bg-white/[0.04] px-3 font-sans text-xs font-semibold text-white transition-all hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.98]"
          aria-label={isAr ? `إضافة قاعدة إلى ${title}` : `Add ${side} rule`}
        >
          <Plus size={13} /><span className="hidden sm:inline">{isAr ? 'إضافة قاعدة' : 'Add rule'}</span>
        </button>
      </div>
      {rules.length === 0 ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-plt-warning-border bg-plt-warning-soft px-3 py-2.5 font-sans text-[11px] text-plt-warning">
            <AlertTriangle size={13} className="shrink-0" />
            <span>
              {isBuy
                ? (isAr ? 'قواعد الشراء مفقودة — يلزم إضافة قاعدة واحدة على الأقل لفتح الصفقات' : 'Missing Buy rules — add at least one condition to open positions')
                : (isAr ? 'قواعد البيع مفقودة — يلزم إضافة قاعدة واحدة على الأقل لإنهاء الصفقات' : 'Missing Sell rules — add at least one condition to close positions')}
            </span>
          </div>
          {picker ?? (
            <button
              type="button"
              onClick={() => onAddRequest(side)}
              className="flex min-h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 text-center transition-all hover:border-white/30 hover:bg-white/[0.05] active:scale-[0.99]"
            >
              <Plus size={16} className="text-plt-muted" />
              <span className="mt-2 font-sans text-xs font-semibold text-white">{isAr ? 'اختر مؤشراً' : 'Choose an indicator'}</span>
            </button>
          )}
        </div>
      ) : (
        <><div className="mt-3 space-y-2">
          {rules.map((rule, index) => {
            const indicator = indicators.find((item) => item.id === rule.indicatorId) ?? null;
            const name = indicator?.name ?? (isAr ? 'مؤشر غير معروف' : 'Unknown indicator');
            return <div key={rule.id}>
              {index > 0 && <div className="flex items-center gap-2 py-1">
                <span className="h-px flex-1 bg-plt-border" />
                <div className="pill-switch" aria-label={isAr ? 'رابط القاعدة' : 'Rule connector'}>
                  {(['and', 'or'] as const).map((connector) => (
                    <button
                      key={connector}
                      type="button"
                      onClick={() => onUpdate(side, rule.id, { connector })}
                      aria-pressed={rule.connector === connector}
                      className={`pill-switch-btn ${rule.connector === connector ? 'pill-switch-btn-active' : ''}`}
                    >
                      {connectorLabel(connector)}
                    </button>
                  ))}
                </div>
                <span className="h-px flex-1 bg-plt-border" />
              </div>}
              <CompactStrategyBlockRow id={`${side}-${rule.id}`} name={name} summary={`${name} (${rule.period}) ${operatorLabel(rule.operator)} ${rule.value}`} tone={isBuy ? 'buy' : 'sell'} readOnly={false} selected={focusedRuleId === rule.id} validationMessage={indicator ? undefined : (isAr ? 'اختر مؤشراً متاحاً' : 'Choose an available indicator')} onInspect={() => onInspectRule?.(side, rule, indicator, 'learn')} onConfigure={() => onInspectRule?.(side, rule, indicator, 'configure')} onRemove={() => onRemove(side, rule.id)} />
            </div>;
          })}
        </div>{picker}</>
      )}
    </section>
  );
}
