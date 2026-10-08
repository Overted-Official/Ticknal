'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import { ChevronDown, Lock, Plus, SlidersHorizontal } from '@/components/ui/icon-library';

import type {
  StrategyBuilderIndicatorOption,
  StrategyDraft,
  StrategyRule,
  StrategyRuleSide,
} from './strategy-builder-model';
import { STRATEGY_PROFILE_ARABIC, type StrategyProfile } from './strategy-builder-fixtures';
import AdvancedStrategyBuilder from './AdvancedStrategyBuilder';
import StrategyBlockInspector from './StrategyBlockInspector';
import StrategyRuleComposer from './StrategyRuleComposer';
import type { StrategyInspectorTab, StrategyInspectorTarget } from './strategy-inspector-model';

const IndicatorPicker = dynamic(() => import('./IndicatorPicker'), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="mt-4 border-t border-white/10 py-8 text-center text-xs text-[#787b86]">…</div>,
});

interface StrategyConfigurationPanelProps {
  readonly profiles: readonly StrategyProfile[];
  readonly selectedStrategyId: string;
  readonly draft: StrategyDraft;
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly locale: 'en' | 'ar';
  readonly onSelectStrategy: (strategyId: string) => void;
  readonly onCreateNew: () => void;
  readonly onAddRule: (side: StrategyRuleSide, indicator: StrategyBuilderIndicatorOption) => void;
  readonly onUpdateRule: (
    side: StrategyRuleSide,
    ruleId: string,
    changes: Partial<Pick<StrategyRule, 'period' | 'operator' | 'value' | 'connector'>>,
  ) => void;
  readonly onRemoveRule: (side: StrategyRuleSide, ruleId: string) => void;
}

export default function StrategyConfigurationPanel({
  profiles,
  selectedStrategyId,
  draft,
  indicators,
  locale,
  onSelectStrategy,
  onCreateNew,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
}: StrategyConfigurationPanelProps) {
  const isAr = locale === 'ar';
  const isCustom = selectedStrategyId === draft.id;
  const [pickerSide, setPickerSide] = useState<StrategyRuleSide | null>(null);
  const [builderMode, setBuilderMode] = useState<'simple' | 'advanced'>('simple');
  const [inspector, setInspector] = useState<{ target: StrategyInspectorTarget; tab: StrategyInspectorTab } | null>(null);
  const selectedProfile = profiles.find((profile) => profile.id === selectedStrategyId) ?? profiles[0];
  const selectedProfileCopy = selectedProfile && isAr
    ? { ...selectedProfile, ...STRATEGY_PROFILE_ARABIC[selectedProfile.id] }
    : selectedProfile;
  const selectedIds = useMemo(
    () => new Set((pickerSide === 'buy' ? draft.buyRules : draft.sellRules).map((rule) => rule.indicatorId)),
    [draft.buyRules, draft.sellRules, pickerSide],
  );

  const handleSelection = (strategyId: string) => {
    onSelectStrategy(strategyId);
    setPickerSide(null);
    setInspector(null);
  };

  const handleCreate = () => {
    onCreateNew();
    setPickerSide(null);
    setBuilderMode('advanced');
  };

  const handleAddFromPicker = (indicator: StrategyBuilderIndicatorOption) => {
    if (!pickerSide) return;
    onAddRule(pickerSide, indicator);
    setPickerSide(null);
  };

  const activePicker = pickerSide ? (
    <IndicatorPicker
      indicators={indicators}
      selectedIds={selectedIds}
      locale={locale}
      onAdd={handleAddFromPicker}
      onClose={() => setPickerSide(null)}
    />
  ) : null;

  return (
    <section className="min-w-0 bg-black px-4 py-5 sm:px-5 lg:px-6" aria-label={isAr ? 'منشئ الاستراتيجية' : 'Strategy builder'}>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-white/60" />
            <h2 className="text-base font-semibold tracking-tight text-white">{isAr ? 'منشئ الاستراتيجية' : 'Strategy builder'}</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#787b86]">
            {isAr ? 'راجع نموذجاً موجوداً أو ابدأ استراتيجية بدون كود.' : 'Inspect an existing model or start a zero-code strategy.'}
          </p>
        </div>
        <span className="shrink-0 border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#787b86]">
          MVP
        </span>
      </div>

      <div className="mt-4 grid max-w-xl grid-cols-[minmax(0,1fr)_auto] gap-2">
        <label className="relative min-w-0">
          <span className="sr-only">{isAr ? 'اختر استراتيجية' : 'Select strategy'}</span>
          <select
            value={selectedStrategyId}
            onChange={(event) => handleSelection(event.target.value)}
            className="min-h-11 w-full appearance-none rounded-none border border-white/10 bg-black px-3 pe-9 font-sans text-xs font-medium text-white outline-none transition-colors hover:border-white/20 focus:border-white/30"
          >
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{isAr ? STRATEGY_PROFILE_ARABIC[profile.id].name : profile.name}</option>)}
            <option value={draft.id}>{isAr ? 'استراتيجية بلا اسم' : draft.name}</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute end-3 top-3 text-white/40" />
        </label>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex min-h-11 items-center gap-1.5 border border-white/15 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/[0.04]"
        >
          <Plus size={14} />
          <span className="hidden xl:inline">{isAr ? 'استراتيجية جديدة' : 'Create new'}</span>
          <span className="xl:hidden">{isAr ? 'جديدة' : 'New'}</span>
        </button>
      </div>

      {isCustom ? (
        <div className="mt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#787b86]">{isAr ? 'مسودة مخصصة' : 'Custom draft'}</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">{isAr ? 'استراتيجية بلا اسم' : draft.name}</h3>
              <p className="mt-1 text-xs leading-5 text-[#787b86]">
                {builderMode === 'simple'
                  ? (isAr ? 'حدد قواعد واضحة للشراء والبيع بدون كتابة كود.' : 'Build clear buy and sell rules without writing code.')
                  : (isAr ? 'اربط البيانات والمؤشرات والقواعد والحماية في مسار مرئي.' : 'Connect data, indicators, rules and protection in a visual workflow.')}
              </p>
            </div>
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#787b86]">
              {builderMode === 'simple' ? `${draft.buyRules.length + draft.sellRules.length} ${isAr ? 'قواعد' : 'rules'}` : (isAr ? 'متقدم' : 'Advanced')}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 border border-white/10 p-0.5" role="tablist" aria-label={isAr ? 'نوع منشئ الاستراتيجية' : 'Strategy builder type'}>
            <button
              type="button"
              role="tab"
              aria-selected={builderMode === 'simple'}
              onClick={() => setBuilderMode('simple')}
              className={`flex min-h-14 flex-col items-start justify-center px-3 text-start transition-colors ${builderMode === 'simple' ? 'border border-white/25 text-white' : 'border border-transparent text-[#787b86] hover:text-white'}`}
            >
              <span className="text-[10px] font-semibold">{isAr ? 'بسيط' : 'Simple'}</span>
              <span className="mt-0.5 text-[9px] font-normal text-[#787b86]">{isAr ? 'قواعد شراء وبيع باستخدام و/أو' : 'Buy and sell rules using AND/OR'}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={builderMode === 'advanced'}
              onClick={() => {
                setBuilderMode('advanced');
                setPickerSide(null);
              }}
              className={`flex min-h-14 flex-col items-start justify-center px-3 text-start transition-colors ${builderMode === 'advanced' ? 'border border-white/25 text-white' : 'border border-transparent text-[#787b86] hover:text-white'}`}
            >
              <span className="text-[10px] font-semibold">{isAr ? 'متقدم' : 'Advanced'}</span>
              <span className="mt-0.5 text-[9px] font-normal text-[#787b86]">{isAr ? 'سير عمل بكتل مترابطة' : 'Connected block workflow'}</span>
            </button>
          </div>

          <div className={builderMode === 'simple' ? 'mt-5 grid gap-5 xl:grid-cols-2' : 'hidden'} aria-hidden={builderMode !== 'simple'}>
            <StrategyRuleComposer
              side="buy"
              rules={draft.buyRules}
              indicators={indicators}
              locale={locale}
              picker={pickerSide === 'buy' ? activePicker : null}
              onAddRequest={setPickerSide}
              focusedRuleId={inspector?.target.kind === 'simple-rule' ? inspector.target.rule.id : null}
              onInspectRule={(side, rule, indicator, tab) => setInspector({ target: { kind: 'simple-rule', side, rule, indicator }, tab })}
              onUpdate={onUpdateRule}
              onRemove={onRemoveRule}
            />
            <StrategyRuleComposer
              side="sell"
              rules={draft.sellRules}
              indicators={indicators}
              locale={locale}
              picker={pickerSide === 'sell' ? activePicker : null}
              onAddRequest={setPickerSide}
              focusedRuleId={inspector?.target.kind === 'simple-rule' ? inspector.target.rule.id : null}
              onInspectRule={(side, rule, indicator, tab) => setInspector({ target: { kind: 'simple-rule', side, rule, indicator }, tab })}
              onUpdate={onUpdateRule}
              onRemove={onRemoveRule}
            />
          </div>

          <div className={builderMode === 'advanced' ? '' : 'hidden'} aria-hidden={builderMode !== 'advanced'}>
            <AdvancedStrategyBuilder locale={locale} variant="editable" indicators={indicators} />
          </div>

        </div>
      ) : selectedProfileCopy ? (
        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="border border-white/10 px-2 py-1 text-[9px] font-semibold tracking-[0.12em] text-white/60">{selectedProfileCopy.shortName}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#787b86]"><Lock size={11} /> {isAr ? 'للقراءة فقط' : 'Read only'}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">{selectedProfileCopy.name}</h3>
            <p className="mt-1 text-xs leading-5 text-[#787b86]">{selectedProfileCopy.description}</p>
          </div>

          {selectedProfileCopy.id === 'psi' ? (
            <AdvancedStrategyBuilder locale={locale} variant="typhon" />
          ) : (
            <>
              <div className="border-y border-white/10 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#787b86]">{isAr ? 'الإشارات الأساسية' : 'Core signals'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedProfileCopy.coreSignals.map((signal) => (
                    <span key={signal} className="border border-white/10 px-2 py-1 text-[10px] font-medium text-white/65">{signal}</span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="border-l-2 border-[#089981] py-1 ps-3 rtl:border-l-0 rtl:border-r-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#089981]">{isAr ? 'منطق الشراء' : 'Buy logic'}</span>
                  <p className="mt-1 text-xs leading-5 text-white/70">{selectedProfileCopy.buyRule}</p>
                </div>
                <div className="border-l-2 border-[#f23645] py-1 ps-3 rtl:border-l-0 rtl:border-r-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f23645]">{isAr ? 'منطق البيع' : 'Sell logic'}</span>
                  <p className="mt-1 text-xs leading-5 text-white/70">{selectedProfileCopy.sellRule}</p>
                </div>
              </div>
            </>
          )}

          <p className="border-t border-white/10 pt-4 text-[10px] leading-4 text-[#787b86]">
            {isAr ? 'هذه النماذج الشخصية معروضة لفهم بنية المنشئ فقط ولم يتم تعديل منطقها.' : 'These personal models are shown only to demonstrate the builder structure. Their engine logic remains unchanged.'}
          </p>
        </div>
      ) : null}
      {inspector && (
        <StrategyBlockInspector
          target={inspector.target}
          tab={inspector.tab}
          nodes={[]}
          indicators={indicators}
          locale={locale}
          onTabChange={(tab) => setInspector((current) => current ? { ...current, tab } : current)}
          onChange={(change) => {
            if (change.kind === 'simple-rule' && inspector.target.kind === 'simple-rule') onUpdateRule(inspector.target.side, inspector.target.rule.id, change.changes);
          }}
          onClose={() => setInspector(null)}
        />
      )}
    </section>
  );
}
