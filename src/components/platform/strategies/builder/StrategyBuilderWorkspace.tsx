'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { ChevronLeft, ChevronRight, Layers, LayoutGrid, LineChart, Plus } from '@/components/ui/icon-library';
import StrategyConfigurationPanel from './StrategyConfigurationPanel';
import StrategyResultsDeck, { type StrategyResultsMode } from './StrategyResultsDeck';
import StrategySelectorDropdown from './StrategySelectorDropdown';
import StrategyTimeRangeSelector from './StrategyTimeRangeSelector';
import { projectSimpleDraftIntoAdvancedNodes } from './advanced-builder-state';
import { createAdvancedDraftNodes, TYPHON_BLUEPRINT_NODES, type AdvancedStrategyNode } from './advanced-strategy-model';
import { STRATEGY_PROFILE_ARABIC, STRATEGY_PROFILES } from './strategy-builder-fixtures';
import {
  addRuleToDraft,
  createEmptyStrategyDraft,
  isStrategyDraftTestable,
  localizeIndicatorCatalog,
  removeRuleFromDraft,
  updateStrategyRule,
  type StrategyBuilderIndicatorCatalogItem,
  type StrategyBuilderIndicatorOption,
  type StrategyRule,
  type StrategyRuleSide,
} from './strategy-builder-model';
import { getStrategyVisualizationModel } from './strategy-visualization-model';

interface StrategyBuilderWorkspaceProps {
  readonly indicatorCatalog: readonly StrategyBuilderIndicatorCatalogItem[];
}

export default function StrategyBuilderWorkspace({ indicatorCatalog }: StrategyBuilderWorkspaceProps) {
  const { locale } = useTranslation();
  const builderLocale: 'en' | 'ar' = locale === 'ar' ? 'ar' : 'en';
  const isAr = builderLocale === 'ar';

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('psi');
  const [draft, setDraft] = useState(createEmptyStrategyDraft);
  const [draftRevision, setDraftRevision] = useState(0);
  const [builderMode, setBuilderMode] = useState<'simple' | 'advanced'>('simple');
  const [advancedNodes, setAdvancedNodes] = useState<readonly AdvancedStrategyNode[]>(createAdvancedDraftNodes);
  const [ticker, setTicker] = useState('COMI');
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);
  const [resultsMode, setResultsMode] = useState<StrategyResultsMode>('market');
  const [startDate, setStartDate] = useState('2025-01-05');
  const [endDate, setEndDate] = useState('2025-12-28');

  const indicators = useMemo<readonly StrategyBuilderIndicatorOption[]>(
    () => localizeIndicatorCatalog(indicatorCatalog, builderLocale),
    [builderLocale, indicatorCatalog],
  );

  const selectedProfile = STRATEGY_PROFILES.find((profile) => profile.id === selectedStrategyId);
  const strategyName =
    selectedStrategyId === draft.id
      ? builderLocale === 'ar'
        ? 'استراتيجية بلا اسم'
        : draft.name
      : selectedProfile
      ? builderLocale === 'ar'
        ? STRATEGY_PROFILE_ARABIC[selectedProfile.id].name
        : selectedProfile.name
      : builderLocale === 'ar'
      ? 'استراتيجية'
      : 'Strategy';

  const isProtected = selectedStrategyId !== draft.id;
  const hasAdvancedBuy = advancedNodes.some((node) => node.stage === 'entry' && node.parameters?.actionSide !== 'sell');
  const hasAdvancedSell = advancedNodes.some((node) => node.stage === 'exit' || node.parameters?.actionSide === 'sell');
  const hasBuyLogic = draft.buyRules.length > 0 || hasAdvancedBuy;
  const hasSellLogic = draft.sellRules.length > 0 || hasAdvancedSell;
  const complete = isProtected || (hasBuyLogic && hasSellLogic);

  const visualizationNodes = selectedStrategyId === 'psi' ? TYPHON_BLUEPRINT_NODES : advancedNodes;
  const visualization = getStrategyVisualizationModel({
    strategyId: selectedStrategyId,
    ticker,
    draft:
      complete && selectedStrategyId === draft.id && !isStrategyDraftTestable(draft)
        ? {
            ...draft,
            buyRules: [{ id: 'advanced-buy', indicatorId: 'advanced', period: 1, operator: 'isAbove', value: 0, connector: 'and' }],
            sellRules: [{ id: 'advanced-sell', indicatorId: 'advanced', period: 1, operator: 'isBelow', value: 0, connector: 'and' }],
          }
        : draft,
    advancedNodes: visualizationNodes,
    indicators,
    startDate,
    endDate,
  });

  const selectStrategy = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    setFocusedBlockId(null);
  };

  const touchDraft = () => setDraftRevision((current) => current + 1);
  const handleAddRule = (side: StrategyRuleSide, indicator: StrategyBuilderIndicatorOption) => {
    setDraft((current) => addRuleToDraft(current, side, indicator));
    touchDraft();
  };
  const handleUpdateRule = (
    side: StrategyRuleSide,
    ruleId: string,
    changes: Partial<Pick<StrategyRule, 'period' | 'operator' | 'value' | 'connector'>>,
  ) => {
    setDraft((current) => updateStrategyRule(current, side, ruleId, changes));
    touchDraft();
  };
  const handleRemoveRule = (side: StrategyRuleSide, ruleId: string) => {
    setDraft((current) => removeRuleFromDraft(current, side, ruleId));
    touchDraft();
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-row overflow-hidden bg-black font-sans text-white">
      {/* Left Pane: Breadcrumbs + Header Bar + Results Deck (Treemap & Chart) */}
      <div className="flex-1 h-full min-w-0 flex flex-col overflow-y-auto custom-scrollbar">
        {/* 1. Strategies Page Breadcrumbs */}
        <header className="flex shrink-0 items-center justify-between gap-4 bg-plt-base px-[var(--space-page-x)] pb-1 pt-3">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Link
              href="/home"
              className="cursor-pointer font-normal text-text-muted transition-colors hover:text-text-primary"
            >
              {isAr ? 'الرئيسية' : 'Home'}
            </Link>
            <span className="text-text-muted">/</span>
            <h1 className="font-semibold text-text-primary">
              {isAr ? 'الاستراتيجيات' : 'Strategies'}
            </h1>
          </div>
        </header>

        {/* 2. Workspace Top Header Bar */}
        <div className="px-[var(--space-page-x)] pt-3 pb-3 shrink-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-border-subtle">
          <div className="min-w-0">
            <h2 className="section-title text-lg font-bold tracking-tight text-white sm:text-xl">
              {builderLocale === 'ar' ? 'استوديو الاستراتيجيات' : 'Strategy Studio'}
            </h2>
            <p className="section-subtitle mt-0.5 line-clamp-1 text-[11px] text-plt-muted">
              {builderLocale === 'ar'
                ? 'ابنِ استراتيجيتك بالقواعد المرئية وتابع نتائج الاختبار والرسم البياني مباشرة في شاشة واحدة.'
                : 'Build logic rules and inspect backtest results and multi-pane charts simultaneously in one portview.'}
            </p>
          </div>

          {/* Controls: Results Switch (Market | Companies) & Time Range Selector */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 1. Results View Mode Switch (Market vs Companies) */}
            <div className="seg-control" role="tablist" aria-label={isAr ? 'عرض النتائج' : 'Results view mode'}>
              <button
                type="button"
                role="tab"
                aria-selected={resultsMode === 'market'}
                onClick={() => setResultsMode('market')}
                className={`seg-control-btn inline-flex items-center gap-1.5 ${resultsMode === 'market' ? 'seg-control-btn-active active' : ''}`}
              >
                <LayoutGrid size={13} />
                <span>{builderLocale === 'ar' ? 'السوق' : 'Market'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={resultsMode === 'companies'}
                onClick={() => setResultsMode('companies')}
                className={`seg-control-btn inline-flex items-center gap-1.5 ${resultsMode === 'companies' ? 'seg-control-btn-active active' : ''}`}
              >
                <LineChart size={13} />
                <span>{builderLocale === 'ar' ? 'الشركات' : 'Companies'}</span>
              </button>
            </div>

            {/* 2. Sleek Interactive Time Range Selector */}
            <StrategyTimeRangeSelector
              startDate={startDate}
              endDate={endDate}
              locale={builderLocale}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>
        </div>

        {/* 3. Main Results Deck */}
        <main className="flex-1 min-w-0 flex flex-col px-[var(--space-page-x)] py-4 pb-12">
          <StrategyResultsDeck
            strategyId={selectedStrategyId}
            strategyName={strategyName}
            hasRules={complete}
            draftRevision={draftRevision}
            locale={builderLocale}
            visualizationModel={visualization}
            ticker={ticker}
            focusedBlockId={focusedBlockId}
            resultsMode={resultsMode}
            onResultsModeChange={setResultsMode}
            onTickerChange={setTicker}
            onFocusBlock={setFocusedBlockId}
          />
        </main>
      </div>

      {/* Right Column: Full-Height Strategy Studio Drawer (Right next to desktop navigation bar) */}
      {!isStudioCollapsed ? (
        <aside
          className="w-full lg:w-[480px] xl:w-[520px] 2xl:w-[560px] h-full shrink-0 flex flex-col min-w-0 bg-cold-gray-900 border-s border-white/10 rounded-none bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:20px_20px] select-none z-20"
          aria-label={isAr ? 'استوديو الاستراتيجية' : 'Strategy Studio'}
        >
          {/* Drawer Header Bar: Collapse button + Strategy Studio Title + Simple/Advanced switch */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-cold-gray-900/90 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStudioCollapsed(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 text-[11px] font-semibold text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors"
                title={isAr ? 'طي الاستوديو' : 'Collapse Studio'}
              >
                {isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                <span>{isAr ? 'طي المنشئ' : 'Collapse'}</span>
              </button>
              <span className="text-xs font-bold text-white">
                {isAr ? 'محرر القواعد' : 'Strategy Studio'}
              </span>
            </div>

            {/* Preserved Simple / Advanced Mode Switch */}
            <div
              className="seg-control"
              role="tablist"
              aria-label={builderLocale === 'ar' ? 'نوع منشئ الاستراتيجية' : 'Strategy builder type'}
            >
              <button
                type="button"
                role="tab"
                aria-selected={builderMode === 'simple'}
                onClick={() => setBuilderMode('simple')}
                className={`seg-control-btn ${builderMode === 'simple' ? 'seg-control-btn-active active' : ''}`}
              >
                <span>{builderLocale === 'ar' ? 'بسيط' : 'Simple'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={builderMode === 'advanced'}
                onClick={() => {
                  setAdvancedNodes(projectSimpleDraftIntoAdvancedNodes(draft, indicators, advancedNodes));
                  setBuilderMode('advanced');
                }}
                className={`seg-control-btn ${builderMode === 'advanced' ? 'seg-control-btn-active active' : ''}`}
              >
                <span>{builderLocale === 'ar' ? 'متقدم' : 'Advanced'}</span>
              </button>
            </div>
          </div>

          {/* Strategy Selector & New Action Toolbar inside Strategy Studio */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-black/60">
            <div className="flex-1 min-w-0">
              <StrategySelectorDropdown
                selectedStrategyId={selectedStrategyId}
                draft={draft}
                profiles={STRATEGY_PROFILES}
                locale={builderLocale}
                onSelect={selectStrategy}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                selectStrategy('custom-draft');
                setBuilderMode('advanced');
              }}
              className="btn-primary-cta shrink-0 h-9 px-3 text-xs flex items-center gap-1.5"
              title={builderLocale === 'ar' ? 'استراتيجية جديدة' : 'Create new'}
            >
              <Plus size={14} />
              <span>{builderLocale === 'ar' ? 'جديدة' : 'New'}</span>
            </button>
          </div>

          {/* Drawer Body: Strategy Configuration Panel */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4">
            <StrategyConfigurationPanel
              profiles={STRATEGY_PROFILES}
              selectedStrategyId={selectedStrategyId}
              draft={draft}
              indicators={indicators}
              locale={builderLocale}
              builderMode={builderMode}
              advancedNodes={advancedNodes}
              canContinue={complete}
              focusedBlockId={focusedBlockId}
              onContinueToVisualize={() => setIsStudioCollapsed(true)}
              onFocusBlock={setFocusedBlockId}
              onBuilderModeChange={setBuilderMode}
              onAdvancedNodesChange={(nodes) => {
                setAdvancedNodes(nodes);
                touchDraft();
              }}
              onSelectStrategy={selectStrategy}
              onCreateNew={() => selectStrategy('custom-draft')}
              onAddRule={handleAddRule}
              onUpdateRule={handleUpdateRule}
              onRemoveRule={handleRemoveRule}
            />
          </div>
        </aside>
      ) : (
        /* Full-Height Slim Vertical Rail: exact same width (45px) and color (bg-cold-gray-900) as right-side navigation bar */
        <aside
          onClick={() => setIsStudioCollapsed(false)}
          className="w-[45px] h-full shrink-0 flex flex-col items-center justify-between py-3.5 bg-cold-gray-900 border-s border-white/10 cursor-pointer hover:bg-white/[0.03] transition-colors select-none group z-20"
          title={isAr ? 'انقر لتوسيع استوديو الاستراتيجيات' : 'Click to expand Strategy Studio'}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsStudioCollapsed(false);
            }
          }}
        >
          {/* Top: Expand chevron button + Divider + Tool Icon */}
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsStudioCollapsed(false);
              }}
              className="w-[32px] h-[32px] rounded-md border border-white/10 bg-white/[0.04] text-[#dbdbdb] hover:text-white hover:bg-white/10 hover:border-white/20 flex items-center justify-center transition-all"
              title={isAr ? 'توسيع الاستوديو' : 'Expand Studio'}
            >
              {isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>

            <div className="w-5 h-px bg-white/10 my-0.5" />

            <div
              className="w-[32px] h-[32px] rounded-md flex items-center justify-center text-white/70 group-hover:text-white group-hover:scale-105 transition-all"
              title={isAr ? 'استوديو الاستراتيجية' : 'Strategy Studio'}
            >
              <Layers size={17} strokeWidth={1.5} />
            </div>
          </div>

          {/* Center: Vertical Rotated Label */}
          <div className="flex-1 flex items-center justify-center py-4">
            <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
              {isAr ? 'استوديو الاستراتيجية' : 'Strategy Studio'}
            </span>
          </div>

          {/* Bottom: Rule counter pill */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div className="w-5 h-px bg-white/10 my-0.5" />
            <span
              className="inline-flex items-center justify-center min-w-[22px] h-[19px] px-1 rounded-full border border-white/10 bg-white/[0.04] text-[9px] font-semibold text-white/70 tabular-nums font-sans"
              title={isAr ? 'عدد القواعد النشطة' : 'Active rules count'}
            >
              {builderMode === 'simple' ? draft.buyRules.length + draft.sellRules.length : advancedNodes.length}
            </span>
          </div>
        </aside>
      )}
    </div>
  );
}
