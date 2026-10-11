'use client';

import { useRef, useState } from 'react';

import { Plus } from '@/components/ui/icon-library';

import AdvancedBlockLibraryModal from './AdvancedBlockLibraryModal';
import CompactAdvancedNodeCard from './CompactAdvancedNodeCard';
import StrategyBlockInspector from './StrategyBlockInspector';
import WorkflowPipelineCard from './WorkflowPipelineCard';
import {
  PipelineSplitConnector,
  PipelineVerticalConnector,
} from './WorkflowPipelineConnectors';
import {
  createAdvancedNodeFromTemplate,
  removeAdvancedNode,
  updateAdvancedNode,
} from './advanced-builder-state';
import {
  TYPHON_BLUEPRINT_NODES,
  createAdvancedDraftNodes,
  type AdvancedBlockTemplate,
  type AdvancedStrategyNode,
  type LocalizedAdvancedCopy,
} from './advanced-strategy-model';
import type { StrategyBuilderIndicatorOption } from './strategy-builder-model';
import type { StrategyInspectorTab } from './strategy-inspector-model';

export { default as StageBlockPicker } from './AdvancedBlockLibraryModal';

export type WorkflowAreaId = 'data' | 'calculations' | 'buy' | 'position' | 'sell';

interface AdvancedStrategyBuilderProps {
  readonly locale: 'en' | 'ar';
  readonly variant: 'editable' | 'typhon';
  readonly indicators?: readonly StrategyBuilderIndicatorOption[];
  readonly nodes?: readonly AdvancedStrategyNode[];
  readonly onNodesChange?: (nodes: readonly AdvancedStrategyNode[]) => void;
  readonly focusedNodeId?: string | null;
  readonly onFocusedNodeChange?: (nodeId: string | null) => void;
  readonly onInspectNode?: (node: AdvancedStrategyNode, tab: StrategyInspectorTab) => void;
}

interface LibraryModalState {
  readonly areaId: WorkflowAreaId;
  readonly templateIds: readonly string[];
  readonly title: LocalizedAdvancedCopy;
  readonly search: LocalizedAdvancedCopy;
}

export default function AdvancedStrategyBuilder({
  locale,
  variant,
  indicators = [],
  nodes: controlledNodes,
  onNodesChange,
  focusedNodeId,
  onFocusedNodeChange,
  onInspectNode,
}: AdvancedStrategyBuilderProps) {
  const isAr = locale === 'ar';
  const readOnly = variant === 'typhon';
  const nodeSequence = useRef(0);
  const [customNodes, setCustomNodes] = useState<readonly AdvancedStrategyNode[]>(createAdvancedDraftNodes);
  const [internalFocusedNodeId, setInternalFocusedNodeId] = useState<string | null>(null);
  const [internalInspectorTab, setInternalInspectorTab] = useState<StrategyInspectorTab>('learn');
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [libraryConfig, setLibraryConfig] = useState<LibraryModalState | null>(null);

  const toggleCard = (cardId: string) => {
    setCollapsedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const nodes = readOnly ? TYPHON_BLUEPRINT_NODES : (controlledNodes ?? customNodes);
  const activeNodeId = focusedNodeId === undefined ? internalFocusedNodeId : focusedNodeId;
  const activeNode = nodes.find((node) => node.id === activeNodeId) ?? null;

  const setNodes = (updater: (current: readonly AdvancedStrategyNode[]) => readonly AdvancedStrategyNode[]) => {
    const next = updater(nodes);
    if (onNodesChange) onNodesChange(next);
    else setCustomNodes(next);
  };

  const inspectNode = (node: AdvancedStrategyNode, tab: StrategyInspectorTab) => {
    onFocusedNodeChange?.(node.id);
    if (focusedNodeId === undefined) setInternalFocusedNodeId(node.id);
    if (onInspectNode) onInspectNode(node, tab);
    else setInternalInspectorTab(tab);
  };

  const addBlock = (template: AdvancedBlockTemplate, areaId: WorkflowAreaId) => {
    nodeSequence.current += 1;
    const createdNode = createAdvancedNodeFromTemplate(template, `custom-${template.id}-${nodeSequence.current}`);
    const node = template.stage === 'entry' && (areaId === 'buy' || areaId === 'sell')
      ? { ...createdNode, parameters: { ...createdNode.parameters, actionSide: areaId } }
      : createdNode;
    setNodes((current) => [...current, node]);
    inspectNode(node, 'configure');
    setLibraryConfig(null);
  };

  const removeNode = (nodeId: string) => {
    setNodes((current) => removeAdvancedNode(current, nodeId));
    if (activeNodeId === nodeId) {
      onFocusedNodeChange?.(null);
      setInternalFocusedNodeId(null);
    }
  };

  // Node partitions across the visual pipeline (excluding static background terminals)
  const dataNodes = nodes.filter(
    (node) => node.stage === 'inputs' && node.id !== 'custom-market-data' && node.title.en !== 'Primary market series' && node.templateId !== 'indicator',
  );
  const indicatorNodes = nodes.filter((node) => node.templateId === 'indicator');
  const calculationNodes = nodes.filter((node) => node.stage === 'signal' && node.templateId !== 'indicator');
  const buyNodes = nodes.filter((node) => node.stage === 'entry' && node.parameters?.actionSide !== 'sell');
  const positionNodes = nodes.filter((node) => node.stage === 'state');
  const sellNodes = nodes.filter((node) => node.stage === 'exit' || (node.stage === 'entry' && node.parameters?.actionSide === 'sell'));
  const visibleNodesCount = dataNodes.length + indicatorNodes.length + calculationNodes.length + buyNodes.length + positionNodes.length + sellNodes.length;

  return (
    <div aria-label={readOnly ? (isAr ? 'مخطط استراتيجية تايفون' : 'Typhon blueprint') : (isAr ? 'منشئ الاستراتيجية المتقدم' : 'Advanced strategy builder')}>
      {/* Node Canvas Surface */}
      <div
        data-testid="advanced-workflow-canvas"
        data-layout="setup-execution"
        className="relative w-full p-0.5 sm:p-1"
      >
        {/* Hidden accessible heading preserving setup test semantics */}
        <span className="sr-only">Setup</span>

        {/* 1. DATA & INDICATORS (Centered, compact width) */}
        <div className="mx-auto w-full max-w-2xl">
          <WorkflowPipelineCard
            id="pipeline-data-indicators"
            title={isAr ? 'البيانات والمؤشرات' : 'Data & Indicators'}
            subtitle={isAr ? 'السلاسل السعرية الأساسية ومعلمات السوق والمؤشرات الفنية' : 'Price series, parameters and indicators'}
            theme="blue"
            itemCount={dataNodes.length + indicatorNodes.length}
            hasTopPort={false}
            hasBottomPort={true}
            isCollapsed={Boolean(collapsedCards['data-indicators'])}
            onToggleCollapse={() => toggleCard('data-indicators')}
          >
            {/* Split boxes: Data and Indicators */}
            <div className="grid grid-cols-1 gap-2.5 p-2.5 md:grid-cols-2 sm:p-3">
              {/* Left Box: Data */}
              <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
                <header className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 mb-2">
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/70">
                    {isAr ? 'البيانات' : 'Data'}
                  </span>
                  <span className="tabular-nums font-sans text-[10px] text-white/40">{dataNodes.length}</span>
                </header>

                <div className="space-y-1.5">
                  {dataNodes.map((node) => (
                    <CompactAdvancedNodeCard
                      key={node.id}
                      node={node}
                      locale={locale}
                      readOnly={readOnly}
                      selected={activeNodeId === node.id}
                      onInspect={() => inspectNode(node, 'learn')}
                      onConfigure={() => inspectNode(node, 'configure')}
                      onRemove={() => removeNode(node.id)}
                    />
                  ))}

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setLibraryConfig({
                        areaId: 'data',
                        templateIds: ['market-input', 'parameter'],
                        title: { en: 'Data & Indicators', ar: 'البيانات والمؤشرات' },
                        search: { en: 'Search data and indicators', ar: 'ابحث في البيانات والمؤشرات' },
                      })}
                      aria-label={isAr ? 'إضافة بيانات أو مؤشر' : 'Add data or indicator'}
                      className="flex min-h-7.5 w-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] font-sans text-[10px] font-medium text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
                    >
                      <Plus size={11} className="me-1" />
                      <span>{isAr ? 'إضافة بيانات أو مؤشر' : 'Add data or indicator'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Box: Indicators */}
              <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
                <header className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 mb-2">
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/70">
                    {isAr ? 'المؤشرات' : 'Indicators'}
                  </span>
                  <span className="tabular-nums font-sans text-[10px] text-white/40">{indicatorNodes.length}</span>
                </header>

                <div className="space-y-1.5">
                  {indicatorNodes.map((node) => (
                    <CompactAdvancedNodeCard
                      key={node.id}
                      node={node}
                      locale={locale}
                      readOnly={readOnly}
                      selected={activeNodeId === node.id}
                      onInspect={() => inspectNode(node, 'learn')}
                      onConfigure={() => inspectNode(node, 'configure')}
                      onRemove={() => removeNode(node.id)}
                    />
                  ))}

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setLibraryConfig({
                        areaId: 'data',
                        templateIds: ['indicator'],
                        title: { en: 'Indicators', ar: 'المؤشرات' },
                        search: { en: 'Search indicators', ar: 'ابحث في المؤشرات' },
                      })}
                      aria-label={isAr ? 'إضافة مؤشر' : 'Add indicator'}
                      className="flex min-h-7.5 w-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] font-sans text-[10px] font-medium text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
                    >
                      <Plus size={11} className="me-1" />
                      <span>{isAr ? 'إضافة مؤشر' : 'Add indicator'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </WorkflowPipelineCard>
        </div>

        {/* Connecting Line 1 -> 2: Condensed vertical dotted line */}
        <PipelineVerticalConnector label={isAr ? 'تدفق من البيانات إلى الحسابات' : 'Flow from Data to Calculations'} />

        {/* 2. CALCULATIONS (Centered, compact width) */}
        <div className="mx-auto w-full max-w-2xl">
          <WorkflowPipelineCard
            id="pipeline-calculations"
            title={isAr ? 'الحسابات' : 'Calculations'}
            theme="purple"
            itemCount={calculationNodes.length}
            hasTopPort={true}
            hasBottomPort={true}
            isCollapsed={Boolean(collapsedCards['calculations'])}
            onToggleCollapse={() => toggleCard('calculations')}
          >
            <div className="space-y-1.5 p-2.5 sm:p-3">
              {calculationNodes.map((node) => (
                <CompactAdvancedNodeCard
                  key={node.id}
                  node={node}
                  locale={locale}
                  readOnly={readOnly}
                  selected={activeNodeId === node.id}
                  onInspect={() => inspectNode(node, 'learn')}
                  onConfigure={() => inspectNode(node, 'configure')}
                  onRemove={() => removeNode(node.id)}
                />
              ))}

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setLibraryConfig({
                    areaId: 'calculations',
                    templateIds: ['weighted-composite', 'transform', 'rolling-statistic', 'math-operation'],
                    title: { en: 'Calculations', ar: 'الحسابات' },
                    search: { en: 'Search calculations', ar: 'ابحث في الحسابات' },
                  })}
                  aria-label={isAr ? 'إضافة حساب' : 'Add calculation'}
                  className="flex min-h-7.5 w-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] font-sans text-[10px] font-medium text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
                >
                  <Plus size={11} className="me-1" />
                  <span>{isAr ? 'إضافة حساب' : 'Add calculation'}</span>
                </button>
              )}
            </div>
          </WorkflowPipelineCard>
        </div>

        {/* Connecting Line 2 -> 3: 1-to-2 Trunk to Buy Logic and Sell Logic */}
        <PipelineSplitConnector label={isAr ? 'تدفق من الإعداد إلى التنفيذ' : 'Flow from Setup to Execution'} />

        {/* 3. EXECUTION TIER (Buy Logic & Sell Logic Side-by-Side in 2 Columns) */}
        <span id="advanced-execution-heading" className="sr-only">Execution</span>
        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* 3A: Buy Logic */}
          <WorkflowPipelineCard
            id="pipeline-buy"
            title={isAr ? 'منطق الشراء' : 'Buy Logic'}
            theme="green"
            itemCount={buyNodes.length}
            hasTopPort={true}
            hasBottomPort={false}
            isCollapsed={Boolean(collapsedCards['buy'])}
            onToggleCollapse={() => toggleCard('buy')}
          >
            <div className="space-y-1.5 p-2.5">
              {buyNodes.map((node) => (
                <CompactAdvancedNodeCard
                  key={node.id}
                  node={node}
                  locale={locale}
                  readOnly={readOnly}
                  selected={activeNodeId === node.id}
                  onInspect={() => inspectNode(node, 'learn')}
                  onConfigure={() => inspectNode(node, 'configure')}
                  onRemove={() => removeNode(node.id)}
                />
              ))}

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setLibraryConfig({
                    areaId: 'buy',
                    templateIds: ['condition', 'priority-trigger'],
                    title: { en: 'Buy Logic', ar: 'منطق الشراء' },
                    search: { en: 'Search buy conditions', ar: 'ابحث في شروط الشراء' },
                  })}
                  aria-label={isAr ? 'إضافة شرط شراء' : 'Add buy condition'}
                  className="flex min-h-7.5 w-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] font-sans text-[10px] font-medium text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
                >
                  <Plus size={11} className="me-1" />
                  <span>{isAr ? 'إضافة شرط شراء' : 'Add buy condition'}</span>
                </button>
              )}
            </div>
          </WorkflowPipelineCard>

          {/* 3B: Sell Logic */}
          <WorkflowPipelineCard
            id="pipeline-sell"
            title={isAr ? 'منطق البيع' : 'Sell Logic'}
            theme="red"
            itemCount={sellNodes.length}
            hasTopPort={true}
            hasBottomPort={false}
            isCollapsed={Boolean(collapsedCards['sell'])}
            onToggleCollapse={() => toggleCard('sell')}
          >
            <div className="space-y-1.5 p-2.5">
              {sellNodes.map((node, index) => (
                <div key={node.id}>
                  {index > 0 && (
                    <div className="flex items-center gap-2 py-0.5">
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="font-sans text-[8px] font-semibold text-plt-risk px-1.5 py-0.5 rounded border border-plt-risk/20 bg-plt-risk/10">{isAr ? 'أو' : 'OR'}</span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                  )}
                  <CompactAdvancedNodeCard
                    node={node}
                    locale={locale}
                    readOnly={readOnly}
                    selected={activeNodeId === node.id}
                    onInspect={() => inspectNode(node, 'learn')}
                    onConfigure={() => inspectNode(node, 'configure')}
                    onRemove={() => removeNode(node.id)}
                  />
                </div>
              ))}

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setLibraryConfig({
                    areaId: 'sell',
                    templateIds: ['condition', 'dynamic-target', 'trailing-exit'],
                    title: { en: 'Sell Logic', ar: 'منطق البيع' },
                    search: { en: 'Search sell rules', ar: 'ابحث في قواعد البيع' },
                  })}
                  aria-label={isAr ? 'إضافة قاعدة بيع' : 'Add sell rule'}
                  className="flex min-h-7.5 w-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] font-sans text-[10px] font-medium text-white/50 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
                >
                  <Plus size={11} className="me-1" />
                  <span>{isAr ? 'إضافة قاعدة بيع' : 'Add sell rule'}</span>
                </button>
              )}
            </div>
          </WorkflowPipelineCard>
        </div>
      </div>

      {/* Floating Library Modal for Adding Blocks */}
      {libraryConfig && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLibraryConfig(null)}
        >
          <div
            className="w-full max-w-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <AdvancedBlockLibraryModal
              templateIds={libraryConfig.templateIds}
              title={libraryConfig.title}
              search={libraryConfig.search}
              locale={locale}
              onAdd={(template) => addBlock(template, libraryConfig.areaId)}
              onClose={() => setLibraryConfig(null)}
            />
          </div>
        </div>
      )}

      {/* Inspector Panel */}
      {!onInspectNode && activeNode && (
        <StrategyBlockInspector
          target={{ kind: 'advanced-node', node: activeNode }}
          tab={internalInspectorTab}
          nodes={nodes}
          indicators={indicators}
          locale={locale}
          onTabChange={setInternalInspectorTab}
          onChange={(change) => {
            if (change.kind === 'advanced-node') setNodes((current) => updateAdvancedNode(current, activeNode.id, change.changes));
          }}
          onClose={() => {
            onFocusedNodeChange?.(null);
            setInternalFocusedNodeId(null);
          }}
        />
      )}
    </div>
  );
}
