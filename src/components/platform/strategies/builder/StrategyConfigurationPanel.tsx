'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import { Lock } from '@/components/ui/icon-library';

import type {
  StrategyBuilderIndicatorOption,
  StrategyDraft,
  StrategyRule,
  StrategyRuleSide,
} from './strategy-builder-model';
import type { AdvancedStrategyNode } from './advanced-strategy-model';
import { STRATEGY_PROFILE_ARABIC, type StrategyProfile } from './strategy-builder-fixtures';
import AdvancedStrategyBuilder from './AdvancedStrategyBuilder';
import SimpleStrategyBuilder from './SimpleStrategyBuilder';
import StrategyBlockInspector from './StrategyBlockInspector';
import StrategyRuleComposer from './StrategyRuleComposer';
import type { StrategyInspectorTab, StrategyInspectorTarget } from './strategy-inspector-model';

const IndicatorPicker = dynamic(() => import('./IndicatorPicker'), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="mt-4 border-t border-white/10 py-8 text-center text-xs text-plt-muted">…</div>,
});

interface StrategyConfigurationPanelProps {
  readonly profiles: readonly StrategyProfile[];
  readonly selectedStrategyId: string;
  readonly draft: StrategyDraft;
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly locale: 'en' | 'ar';
  readonly builderMode: 'simple' | 'advanced';
  readonly advancedNodes: readonly AdvancedStrategyNode[];
  readonly canContinue?: boolean;
  readonly focusedBlockId?: string | null;
  readonly onContinueToVisualize?: () => void;
  readonly onFocusBlock?: (blockId: string | null) => void;
  readonly onBuilderModeChange: (mode: 'simple' | 'advanced') => void;
  readonly onAdvancedNodesChange: (nodes: readonly AdvancedStrategyNode[]) => void;
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
  builderMode,
  advancedNodes,
  canContinue = true,
  focusedBlockId = null,
  onContinueToVisualize,
  onFocusBlock,
  onBuilderModeChange,
  onAdvancedNodesChange,
  onSelectStrategy,
  onCreateNew,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
}: StrategyConfigurationPanelProps) {
  const isAr = locale === 'ar';
  const isCustom = selectedStrategyId === draft.id;
  const [pickerSide, setPickerSide] = useState<StrategyRuleSide | null>(null);
  const [inspector, setInspector] = useState<{ target: StrategyInspectorTarget; tab: StrategyInspectorTab } | null>(null);
  const selectedProfile = profiles.find((profile) => profile.id === selectedStrategyId) ?? profiles[0];
  const selectedProfileCopy = selectedProfile && isAr
    ? { ...selectedProfile, ...STRATEGY_PROFILE_ARABIC[selectedProfile.id] }
    : selectedProfile;
  const selectedIds = useMemo(
    () => new Set((pickerSide === 'buy' ? draft.buyRules : draft.sellRules).map((rule) => rule.indicatorId)),
    [draft.buyRules, draft.sellRules, pickerSide],
  );

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
    <div className="min-w-0 space-y-6" aria-label={isAr ? 'منشئ الاستراتيجية' : 'Strategy builder'}>
      {isCustom ? (
        <div>
          <div className={builderMode === 'simple' ? '' : 'hidden'} aria-hidden={builderMode !== 'simple'}>
            <SimpleStrategyBuilder
              draft={draft}
              indicators={indicators}
              locale={locale}
              pickerSide={pickerSide}
              onPickerSideChange={setPickerSide}
              focusedRuleId={focusedBlockId ?? (inspector?.target.kind === 'simple-rule' ? inspector.target.rule.id : null)}
              onFocusRule={onFocusBlock}
              onInspectRule={(side, rule, indicator, tab) => {
                setInspector({ target: { kind: 'simple-rule', side, rule, indicator }, tab });
                onFocusBlock?.(rule.id);
              }}
              onAddRule={onAddRule}
              onUpdateRule={onUpdateRule}
              onRemoveRule={onRemoveRule}
            />
          </div>

          <div className={builderMode === 'advanced' ? '' : 'hidden'} aria-hidden={builderMode !== 'advanced'}>
            <AdvancedStrategyBuilder
              locale={locale}
              variant="editable"
              indicators={indicators}
              nodes={advancedNodes}
              onNodesChange={onAdvancedNodesChange}
              focusedNodeId={focusedBlockId ?? (inspector?.target.kind === 'advanced-node' ? inspector.target.node.id : null)}
              onFocusedNodeChange={onFocusBlock}
              onInspectNode={(node, tab) => {
                setInspector({ target: { kind: 'advanced-node', node }, tab });
                onFocusBlock?.(node.id);
              }}
            />
          </div>

        </div>
      ) : selectedProfileCopy ? (
        <div className="space-y-4">
          {selectedProfileCopy.id === 'psi' ? (
            <AdvancedStrategyBuilder
              locale={locale}
              variant="typhon"
              focusedNodeId={focusedBlockId}
              onFocusedNodeChange={onFocusBlock}
              onInspectNode={(node, tab) => {
                setInspector({ target: { kind: 'advanced-node', node }, tab });
                onFocusBlock?.(node.id);
              }}
            />
          ) : (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-plt-muted">{isAr ? 'الإشارات الأساسية' : 'Core signals'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedProfileCopy.coreSignals.map((signal) => (
                    <span key={signal} className="rounded-lg border border-plt-border bg-white/[0.03] px-2.5 py-1 font-sans text-[10px] font-medium text-white/75">{signal}</span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 border-l-4 border-l-plt-profit rtl:border-l-0 rtl:border-r-4 rtl:border-r-plt-profit">
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-plt-profit">{isAr ? 'منطق الشراء' : 'Buy logic'}</span>
                  <p className="mt-1 font-sans text-xs leading-5 text-white/70">{selectedProfileCopy.buyRule}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 border-l-4 border-l-plt-risk rtl:border-l-0 rtl:border-r-4 rtl:border-r-plt-risk">
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-plt-risk">{isAr ? 'منطق البيع' : 'Sell logic'}</span>
                  <p className="mt-1 font-sans text-xs leading-5 text-white/70">{selectedProfileCopy.sellRule}</p>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      {inspector && (() => {
        const initialTarget = inspector.target;
        const liveTarget = initialTarget.kind === 'simple-rule'
          ? (() => {
              const rules = initialTarget.side === 'buy' ? draft.buyRules : draft.sellRules;
              const rule = rules.find((candidate) => candidate.id === initialTarget.rule.id) ?? initialTarget.rule;
              return { ...initialTarget, rule, indicator: indicators.find((candidate) => candidate.id === rule.indicatorId) ?? null } as StrategyInspectorTarget;
            })()
          : initialTarget;
        return (
        <StrategyBlockInspector
          target={liveTarget}
          tab={inspector.tab}
          nodes={[]}
          indicators={indicators}
          locale={locale}
          onTabChange={(tab) => setInspector((current) => current ? { ...current, tab } : current)}
          onChange={(change) => {
            if (change.kind === 'simple-rule' && liveTarget.kind === 'simple-rule') onUpdateRule(liveTarget.side, liveTarget.rule.id, change.changes);
          }}
          onClose={() => setInspector(null)}
        />
        );
      })()}
    </div>
  );
}
