'use client';

import type { ReactNode } from 'react';

import { Plus } from '@/components/ui/icon-library';

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
    <section className="border-t border-white/10 pt-4" aria-labelledby={`${side}-rules-title`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isBuy ? '#089981' : '#f23645' }} />
            <h4 id={`${side}-rules-title`} className="text-sm font-semibold text-white">{title}</h4>
            <span className="text-[10px] tabular-nums text-[#787b86]">{rules.length}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#787b86]">{subtitle}</p>
        </div>
        <button type="button" onClick={() => onAddRequest(side)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 border border-white/15 px-3 text-[10px] font-semibold text-white hover:bg-white/[0.04]" aria-label={isAr ? `إضافة قاعدة إلى ${title}` : `Add ${side} rule`}>
          <Plus size={13} /><span className="hidden sm:inline">{isAr ? 'إضافة قاعدة' : 'Add rule'}</span>
        </button>
      </div>
      {rules.length === 0 ? (picker ?? (
        <button type="button" onClick={() => onAddRequest(side)} className="mt-3 flex min-h-20 w-full flex-col items-center justify-center border border-dashed border-white/15 bg-transparent px-4 text-center hover:border-white/30 hover:bg-white/[0.02]">
          <Plus size={16} className="text-[#787b86]" /><span className="mt-2 text-xs font-semibold text-white">{isAr ? 'اختر مؤشراً' : 'Choose an indicator'}</span>
        </button>
      )) : (
        <><div className="mt-3 space-y-2">
          {rules.map((rule, index) => {
            const indicator = indicators.find((item) => item.id === rule.indicatorId) ?? null;
            const name = indicator?.name ?? (isAr ? 'مؤشر غير معروف' : 'Unknown indicator');
            return <div key={rule.id}>
              {index > 0 && <div className="flex items-center gap-2 py-1">
                <span className="h-px flex-1 bg-white/10" />
                <div className="flex border border-white/10 bg-black p-0.5" aria-label={isAr ? 'رابط القاعدة' : 'Rule connector'}>
                  {(['and', 'or'] as const).map((connector) => <button key={connector} type="button" onClick={() => onUpdate(side, rule.id, { connector })} aria-pressed={rule.connector === connector} className={`min-h-9 min-w-11 px-2 text-[9px] font-semibold ${rule.connector === connector ? 'border border-white/25 text-white' : 'border border-transparent text-[#787b86]'}`}>{connectorLabel(connector)}</button>)}
                </div><span className="h-px flex-1 bg-white/10" />
              </div>}
              <CompactStrategyBlockRow id={`${side}-${rule.id}`} name={name} summary={`${name} (${rule.period}) ${operatorLabel(rule.operator)} ${rule.value}`} tone={isBuy ? 'buy' : 'sell'} readOnly={false} selected={focusedRuleId === rule.id} validationMessage={indicator ? undefined : (isAr ? 'اختر مؤشراً متاحاً' : 'Choose an available indicator')} onInspect={() => onInspectRule?.(side, rule, indicator, 'learn')} onConfigure={() => onInspectRule?.(side, rule, indicator, 'configure')} onRemove={() => onRemove(side, rule.id)} />
            </div>;
          })}
        </div>{picker}</>
      )}
    </section>
  );
}
