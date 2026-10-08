'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import StrategyBacktestPanel from './StrategyBacktestPanel';
import StrategyConfigurationPanel from './StrategyConfigurationPanel';
import StrategyStageNavigation from './StrategyStageNavigation';
import StrategyVisualizationPanel from './StrategyVisualizationPanel';
import { createAdvancedDraftNodes, TYPHON_BLUEPRINT_NODES } from './advanced-strategy-model';
import { STRATEGY_PROFILE_ARABIC, STRATEGY_PROFILES } from './strategy-builder-fixtures';
import { addRuleToDraft, createEmptyStrategyDraft, isStrategyDraftTestable, localizeIndicatorCatalog, removeRuleFromDraft, updateStrategyRule, type StrategyBuilderIndicatorCatalogItem, type StrategyBuilderIndicatorOption, type StrategyRule, type StrategyRuleSide } from './strategy-builder-model';
import { getStrategyStageStatuses, type StrategyWorkspaceStage } from './strategy-workspace-model';
import { getStrategyVisualizationModel } from './strategy-visualization-model';

interface StrategyBuilderWorkspaceProps { readonly indicatorCatalog: readonly StrategyBuilderIndicatorCatalogItem[] }

export default function StrategyBuilderWorkspace({ indicatorCatalog }: StrategyBuilderWorkspaceProps) {
  const { locale } = useTranslation();
  const builderLocale: 'en' | 'ar' = locale === 'ar' ? 'ar' : 'en';
  const [activeStage, setActiveStage] = useState<StrategyWorkspaceStage>('build');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('psi');
  const [draft, setDraft] = useState(createEmptyStrategyDraft);
  const [draftRevision, setDraftRevision] = useState(0);
  const [ticker, setTicker] = useState('COMI');
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const indicators = useMemo<readonly StrategyBuilderIndicatorOption[]>(() => localizeIndicatorCatalog(indicatorCatalog, builderLocale), [builderLocale, indicatorCatalog]);
  const selectedProfile = STRATEGY_PROFILES.find((profile) => profile.id === selectedStrategyId);
  const strategyName = selectedStrategyId === draft.id ? (builderLocale === 'ar' ? 'استراتيجية بلا اسم' : draft.name) : selectedProfile ? (builderLocale === 'ar' ? STRATEGY_PROFILE_ARABIC[selectedProfile.id].name : selectedProfile.name) : (builderLocale === 'ar' ? 'استراتيجية' : 'Strategy');
  const isProtected = selectedStrategyId !== draft.id;
  const complete = isProtected || isStrategyDraftTestable(draft);
  const statuses = getStrategyStageStatuses({ isProtected, hasBuyLogic: draft.buyRules.length > 0, hasSellLogic: draft.sellRules.length > 0 });
  const advancedNodes = selectedStrategyId === 'psi' ? TYPHON_BLUEPRINT_NODES : createAdvancedDraftNodes();
  const visualization = getStrategyVisualizationModel({ strategyId: selectedStrategyId, ticker, draft, advancedNodes, indicators });

  const selectStrategy = (strategyId: string) => { setSelectedStrategyId(strategyId); setActiveStage('build'); setFocusedBlockId(null); };
  const touchDraft = () => setDraftRevision((current) => current + 1);
  const handleAddRule = (side: StrategyRuleSide, indicator: StrategyBuilderIndicatorOption) => { setDraft((current) => addRuleToDraft(current, side, indicator)); touchDraft(); };
  const handleUpdateRule = (side: StrategyRuleSide, ruleId: string, changes: Partial<Pick<StrategyRule, 'period' | 'operator' | 'value' | 'connector'>>) => { setDraft((current) => updateStrategyRule(current, side, ruleId, changes)); touchDraft(); };
  const handleRemoveRule = (side: StrategyRuleSide, ruleId: string) => { setDraft((current) => removeRuleFromDraft(current, side, ruleId)); touchDraft(); };

  return (
    <div className="min-w-0 border-y border-white/10 bg-black">
      <StrategyStageNavigation activeStage={activeStage} statuses={statuses} locale={builderLocale} onSelect={setActiveStage} />
      <div id={`strategy-stage-panel-${activeStage}`} role="tabpanel" aria-labelledby={`strategy-stage-${activeStage}`}>
        {activeStage === 'build' && <StrategyConfigurationPanel profiles={STRATEGY_PROFILES} selectedStrategyId={selectedStrategyId} draft={draft} indicators={indicators} locale={builderLocale} onSelectStrategy={selectStrategy} onCreateNew={() => selectStrategy('custom-draft')} onAddRule={handleAddRule} onUpdateRule={handleUpdateRule} onRemoveRule={handleRemoveRule} />}
        {activeStage === 'visualize' && <StrategyVisualizationPanel model={visualization} ticker={ticker} focusedBlockId={focusedBlockId} locale={builderLocale} onTickerChange={setTicker} onFocusBlock={setFocusedBlockId} onBack={() => setActiveStage('build')} onContinue={() => setActiveStage('backtest')} />}
        {activeStage === 'backtest' && <div><StrategyBacktestPanel strategyId={selectedStrategyId} strategyName={strategyName} hasRules={complete} draftRevision={draftRevision} locale={builderLocale} /><div className="border-t border-white/10 px-4 py-4 sm:px-6"><button type="button" onClick={() => setActiveStage('visualize')} className="min-h-11 border border-white/15 px-4 text-xs font-semibold text-white hover:bg-white/[0.04]">{builderLocale === 'ar' ? 'العودة إلى التصور' : 'Return to Visualize'}</button></div></div>}
      </div>
    </div>
  );
}
