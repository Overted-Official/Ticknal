'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  BaseEdge,
  Controls,
  Handle,
  Position,
  ReactFlow,
  applyNodeChanges,
  getSmoothStepPath,
  getViewportForBounds,
  useReactFlow,
  useStore,
  type Connection,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ChevronDown, ChevronLeft, Info, Layers, Plus, Settings, Trash2, X } from '@/components/ui/icon-library';
import AdvancedBlockLibraryModal from './AdvancedBlockLibraryModal';
import AdvancedNodeEditor from './AdvancedNodeEditor';
import IndicatorPicker from './IndicatorPicker';
import StrategyLibraryEducationDrawer from './StrategyLibraryEducationDrawer';
import { ADVANCED_BLOCK_TEMPLATES, getStrategyNodeParameterRows, localize, type AdvancedStrategyNode } from './advanced-strategy-model';
import { getAvailableUpstreamNodes, createAdvancedIndicatorNode, createAdvancedNodeFromTemplate, createMarketInputBundle, duplicateAdvancedModule, getMarketInputBundle, isAdvancedNodeReferenced, updateMarketInputBundle, type MarketInputField } from './advanced-builder-state';
import { buildStrategyFlow, canGroupStrategyNodes, canRemoveOptionalStage, getConnectableModulePairs, getEdgeAttachment, getFocusedModuleViewport, getModuleRuleSummary, getReadableStrategyViewport, getStageTemplateIds, reconcileStrategyFlowLayout, resolveModuleNameDraft, toggleGroupCardSelection, type OptionalStrategyStageId, type StrategyCanvasModule, type StrategyCanvasStage, type StrategyCanvasStageId } from './strategy-flow-model';
import { isSimpleRuleIndicatorSupported, type StrategyBuilderIndicatorOption, type StrategyRuleSide } from './strategy-builder-model';
import { getNodeEducation } from './strategy-library-education';

type NodeChange = Partial<Pick<AdvancedStrategyNode, 'customName' | 'outputName' | 'connections' | 'parameters'>>;

interface CardData extends Record<string, unknown> {
  strategyNode: AdvancedStrategyNode;
  nodes: readonly AdvancedStrategyNode[];
  indicators: readonly StrategyBuilderIndicatorOption[];
  locale: 'en' | 'ar';
  editable: boolean;
  expanded: boolean;
  previewExpanded: boolean;
  canGroupSelect: boolean;
  selectedForGroup: boolean;
  module?: StrategyCanvasModule;
  activeHandles: ReadonlySet<string>;
  onToggleSettings: (id: string) => void;
  onTogglePreview: (id: string) => void;
  onToggleGroupSelection: (id: string) => void;
  onOpenModule: (id: string) => void;
  onInfo: (node: AdvancedStrategyNode) => void;
  onChange: (id: string, changes: NodeChange) => void;
  onRemove: (id: string) => void;
}

type CardNode = Node<CardData, 'strategy'>;

interface StageData extends Record<string, unknown> {
  stage: StrategyCanvasStage;
  number: number;
  locale: 'en' | 'ar';
  editable: boolean;
  canRemove: boolean;
  onAdd: (id: StrategyCanvasStageId) => void;
  onRemove: (id: OptionalStrategyStageId) => void;
}

type StageNode = Node<StageData, 'stage'>;

const StageRegion = memo(function StageRegion({ data }: NodeProps<StageNode>) {
  const { stage, locale, editable, canRemove } = data;
  const isAr = locale === 'ar';
  const title = localize(stage.title, locale);
  return (
    <section className="strategy-flow-stage" role="group" aria-label={title} style={{ width: stage.width, height: stage.height }}>
      <header className="strategy-flow-stage-header">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="strategy-flow-stage-number tabular-nums">{String(data.number).padStart(2, '0')}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-semibold leading-5 text-plt-text">{title}</h2>
            <p className="mt-1 text-[11px] leading-4 text-plt-faint">{localize(stage.description, locale)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] tabular-nums text-plt-faint">{stage.count} {isAr ? 'كتل' : stage.count === 1 ? 'card' : 'cards'}</span>
          <div className="flex items-center gap-1">
            {editable && stage.optional && <button type="button" className="nodrag strategy-flow-stage-action" disabled={!canRemove} title={!canRemove ? (isAr ? 'احذف البطاقات أولاً' : 'Remove cards from this stage first') : undefined} aria-label={`${isAr ? 'إزالة مرحلة' : 'Remove'} ${title} ${isAr ? '' : 'stage'}`} onClick={() => data.onRemove(stage.id as OptionalStrategyStageId)}><Trash2 size={12} /></button>}
            {editable && <button type="button" className="nodrag strategy-flow-stage-action strategy-flow-stage-add" aria-label={`${isAr ? 'إضافة بطاقة إلى' : 'Add card to'} ${title}`} onClick={() => data.onAdd(stage.id)}><Plus size={13} /><span>{isAr ? 'إضافة' : 'Add'}</span></button>}
          </div>
        </div>
      </header>
      {stage.count === 0 && <p className="strategy-flow-stage-empty">{editable ? (isAr ? 'أضف أول بطاقة في هذه المرحلة' : 'Add the first card in this stage') : (isAr ? 'لا توجد بطاقات في هذه المرحلة' : 'No cards in this stage')}</p>}
    </section>
  );
});

const NODE_ACCENTS: Readonly<Record<AdvancedStrategyNode['kind'], string>> = {
  input: '#168bf0',
  calculation: '#aa4df1',
  decision: '#eaa842',
  state: '#56a9bb',
  exit: '#ef5366',
  output: '#17b989',
};

const CARD_HANDLES: readonly { type: 'source' | 'target'; position: Position; id: string }[] = [
  { type: 'target', position: Position.Left, id: 'in-left' },
  { type: 'target', position: Position.Right, id: 'in-right' },
  { type: 'target', position: Position.Top, id: 'in-top' },
  { type: 'target', position: Position.Bottom, id: 'in-bottom' },
  { type: 'source', position: Position.Left, id: 'out-left' },
  { type: 'source', position: Position.Right, id: 'out-right' },
  { type: 'source', position: Position.Top, id: 'out-top' },
  { type: 'source', position: Position.Bottom, id: 'out-bottom' },
];

const StrategyCard = memo(function StrategyCard({ data, selected }: NodeProps<CardNode>) {
  const { strategyNode: node, locale, editable, expanded, previewExpanded, module } = data;
  const isAr = locale === 'ar';
  const accent = NODE_ACCENTS[node.kind];
  const name = node.customName || localize(node.title, locale);
  if (module) {
    const ruleSummary = getModuleRuleSummary(module, data.nodes, locale);
    return <article className={`strategy-flow-card strategy-flow-module-card ${selected ? 'strategy-flow-card-selected' : ''}`} style={{ '--node-accent': accent } as React.CSSProperties} aria-label={name}>
      {CARD_HANDLES.map((handle) => <Handle key={handle.id} id={handle.id} type={handle.type} position={handle.position} className={`strategy-flow-handle ${data.activeHandles.has(handle.id) ? '' : 'strategy-flow-handle-idle'}`} isConnectable={editable} />)}
      <div className="strategy-flow-card-heading">
        <span className="strategy-flow-card-dot" />
        <div className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-plt-text">{name}</span><span className="text-[10px] text-plt-faint">{module.memberIds.length} {isAr ? 'خطوات' : module.memberIds.length === 1 ? 'step' : 'steps'} · {module.inputIds.length} {isAr ? 'مدخلات' : module.inputIds.length === 1 ? 'input' : 'inputs'} · {module.outputIds.length} {isAr ? 'مخرجات' : module.outputIds.length === 1 ? 'output' : 'outputs'}</span></div>
        <button type="button" className="nodrag strategy-flow-icon" aria-label={`${isAr ? 'افتح مجموعة' : 'Open module'} ${name}`} onClick={() => data.onOpenModule(module.id)}><ChevronLeft className={isAr ? '' : 'rotate-180'} size={15} /></button>
      </div>
      <div className="strategy-flow-card-content"><div className="strategy-flow-card-inset strategy-flow-module-inset">
        <span className="text-[10px] text-plt-muted">{ruleSummary ? (isAr ? 'الشروط' : 'Checks') : (isAr ? 'المخرج' : 'Output')}</span>
        <span className={`min-w-0 text-xs font-medium text-plt-text ${ruleSummary ? 'text-right leading-4' : 'truncate'}`}>{ruleSummary ?? module.outputIds.map((id) => data.nodes.find((candidate) => candidate.id === id)?.customName || id).join(', ')}</span>
      </div></div>
    </article>;
  }
  const selectedIndicator = node.templateId === 'indicator' ? data.indicators.find((indicator) => indicator.id === node.parameters?.indicatorId) : undefined;
  const summary = selectedIndicator?.description || localize(node.summary, locale);
  const parameterRows = getStrategyNodeParameterRows(node, locale, !selectedIndicator || selectedIndicator.outputs.filter((output) => output.kind === 'number').length > 1);

  return (
    <article className={`strategy-flow-card ${selected || data.selectedForGroup ? 'strategy-flow-card-selected' : ''}`} style={{ '--node-accent': accent } as React.CSSProperties} aria-label={name}>
      {CARD_HANDLES.map((handle) => <Handle key={handle.id} id={handle.id} type={handle.type} position={handle.position} className={`strategy-flow-handle ${data.activeHandles.has(handle.id) ? '' : 'strategy-flow-handle-idle'}`} isConnectable={editable} />)}
      <div className="strategy-flow-card-heading">
        <span className="strategy-flow-card-dot" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-plt-text">{name}</span>
        {data.canGroupSelect && <button type="button" className={`nodrag strategy-flow-icon strategy-flow-group-select ${data.selectedForGroup ? 'strategy-flow-group-select-active' : ''}`} aria-label={`${data.selectedForGroup ? (isAr ? 'إلغاء تحديد' : 'Deselect') : (isAr ? 'تحديد للتجميع' : 'Select for grouping')} ${name}`} aria-pressed={data.selectedForGroup} title={isAr ? 'تجميع البطاقات' : 'Group with other cards'} onClick={() => data.onToggleGroupSelection(node.id)}><Layers size={12} /></button>}
        <button type="button" className="nodrag strategy-flow-icon" aria-label={`${previewExpanded ? (isAr ? 'إخفاء التفاصيل' : 'Hide details for') : (isAr ? 'عرض التفاصيل' : 'Show details for')} ${name}`} aria-expanded={previewExpanded || expanded} onClick={() => data.onTogglePreview(node.id)}><ChevronDown size={13} className={`transition-transform ${(previewExpanded || expanded) ? 'rotate-180' : ''}`} /></button>
        <button type="button" className="nodrag strategy-flow-icon" aria-label={`${isAr ? 'معلومات عن' : 'Learn about'} ${name}`} title={isAr ? 'معلومات' : 'Learn'} onClick={() => data.onInfo(node)}><Info size={13} /></button>
        <button type="button" className={`nodrag strategy-flow-icon ${expanded ? 'text-plt-text' : ''}`} aria-label={`${isAr ? 'إعدادات' : 'Settings for'} ${name}`} aria-expanded={expanded} title={isAr ? 'الإعدادات' : 'Settings'} onClick={() => data.onToggleSettings(node.id)}><Settings size={13} /></button>
        {editable && !node.protected && <button type="button" className="nodrag strategy-flow-icon hover:text-plt-risk" aria-label={`${isAr ? 'حذف' : 'Remove'} ${name}`} onClick={() => data.onRemove(node.id)}><Trash2 size={12} /></button>}
      </div>
      {(previewExpanded || expanded) && <div className="strategy-flow-card-content">
        <div className="strategy-flow-card-inset">
        <p className="strategy-flow-card-summary">{summary}</p>
        {!expanded && node.tags && node.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{node.tags.slice(0, 4).map((tag) => <span key={tag} className="strategy-flow-chip">{tag}</span>)}</div>}
        {!expanded && parameterRows.length > 0 && <div className="mt-3 space-y-1 border-t border-plt-border-soft pt-2.5">{parameterRows.map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3 text-xs"><span className="capitalize text-plt-faint">{key.replace(/([A-Z])/gu, ' $1')}</span><span className="truncate text-plt-subtle tabular-nums">{value}</span></div>)}</div>}
        {!expanded && node.metrics && <div className="mt-3 space-y-1 border-t border-plt-border-soft pt-2.5">{node.metrics.slice(0, 4).map((metric) => <div key={metric.label.en} className="flex justify-between gap-3 text-xs"><span className="truncate text-plt-faint">{localize(metric.label, locale)}</span><span className="text-plt-subtle tabular-nums">{metric.value}</span></div>)}</div>}
        {expanded && <div className="nodrag nowheel strategy-flow-settings">
          <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-plt-muted"><span>{isAr ? 'إعدادات العقدة' : 'Node settings'}</span><button type="button" aria-label={isAr ? 'إغلاق الإعدادات' : 'Close settings'} onClick={() => data.onToggleSettings(node.id)}><X size={12} /></button></div>
          {editable && !node.protected ? <AdvancedNodeEditor node={node} nodes={data.nodes} indicators={data.indicators} locale={locale} onChange={(changes) => data.onChange(node.id, changes)} /> : <div className="space-y-2">{(node.details ?? []).map((detail) => <div key={detail.label.en} className="flex justify-between gap-3 text-[11px]"><span className="text-plt-faint">{localize(detail.label, locale)}</span><span className="text-right text-plt-subtle">{localize(detail.value, locale)}</span></div>)}{!node.details?.length && <p className="text-[11px] leading-4 text-plt-muted">{isAr ? 'هذه الاستراتيجية محمية للعرض فقط.' : 'This strategy is read-only. Create a new strategy to edit its logic.'}</p>}</div>}
        </div>}
        </div>
      </div>}
    </article>
  );
});

const NODE_TYPES = { stage: StageRegion, strategy: StrategyCard };

function ModuleNameEditor({ name, isAr, onCommit }: { readonly name: string; readonly isAr: boolean; readonly onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  const commit = () => {
    const resolved = resolveModuleNameDraft(draft, name);
    setDraft(resolved);
    if (resolved !== name) onCommit(resolved);
  };
  return <input className="input-token min-w-0 flex-1 text-xs" aria-label={isAr ? 'اسم المجموعة' : 'Module name'} maxLength={100} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') setDraft(name);
  }} />;
}

function StrategyConnection({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data }: EdgeProps) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12 });
  return <>
    <BaseEdge id={id} path={path} style={style} />
    {data?.active && <path d={path} pathLength={100} className="strategy-flow-current" stroke={String(style?.stroke ?? '#528bd1')} style={{ animationDelay: String(data.delay ?? '0s') }} aria-hidden="true" />}
  </>;
}

const EDGE_TYPES = { strategyConnection: StrategyConnection };

function FitFlowToPane({ resizeSignal, topologySignal, stages, focused, expandedCardTop }: { readonly resizeSignal: number; readonly topologySignal: string; readonly stages: readonly StrategyCanvasStage[]; readonly focused: boolean; readonly expandedCardTop?: number }) {
  const { setViewport } = useReactFlow();
  const paneWidth = useStore((state) => state.width);
  const paneHeight = useStore((state) => state.height);
  const minX = Math.min(...stages.map((stage) => stage.position.x));
  const minY = Math.min(...stages.map((stage) => stage.position.y));
  const maxX = Math.max(...stages.map((stage) => stage.position.x + stage.width));
  const maxY = Math.max(...stages.map((stage) => stage.position.y + stage.height));
  const stageCount = stages.length;
  useEffect(() => {
    if (!paneWidth || !paneHeight || stageCount === 0) return;
    const timer = window.setTimeout(() => {
      const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      const overview = getViewportForBounds(bounds, paneWidth, paneHeight, 0.35, 0.95, 0.075);
      const readable = getReadableStrategyViewport(overview, bounds, stageCount);
      const viewport = focused ? getFocusedModuleViewport(bounds, expandedCardTop) : readable;
      void setViewport(viewport, { duration: 180 });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [resizeSignal, topologySignal, stageCount, minX, minY, maxX, maxY, paneWidth, paneHeight, setViewport, focused, expandedCardTop]);
  return null;
}

interface StrategyFlowCanvasProps {
  readonly strategyNodes: readonly AdvancedStrategyNode[];
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly locale: 'en' | 'ar';
  readonly protectedBlueprint: boolean;
  readonly editable: boolean;
  readonly mode: 'simple' | 'advanced';
  readonly resizeSignal: number;
  readonly enabledOptionalStages: readonly OptionalStrategyStageId[];
  readonly onOptionalStagesChange: (stages: readonly OptionalStrategyStageId[]) => void;
  readonly onNodesChange: (nodes: readonly AdvancedStrategyNode[]) => void;
  readonly onAddSimpleRule: (side: StrategyRuleSide, indicator: StrategyBuilderIndicatorOption) => void;
}

export default function StrategyFlowCanvas({ strategyNodes, indicators, locale, protectedBlueprint, editable, mode, resizeSignal, enabledOptionalStages, onOptionalStagesChange, onNodesChange, onAddSimpleRule }: StrategyFlowCanvasProps) {
  const isAr = locale === 'ar';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [focusedModuleId, setFocusedModuleId] = useState<string | null>(null);
  const [showExternalInputs, setShowExternalInputs] = useState(false);
  const [showModuleFields, setShowModuleFields] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [learningNode, setLearningNode] = useState<AdvancedStrategyNode | null>(null);
  const [addPanel, setAddPanel] = useState<StrategyCanvasStageId | null>(null);
  const [pendingModuleConnection, setPendingModuleConnection] = useState<{ choices: readonly { sourceId: string; targetId: string }[]; contextName: string; showSource: boolean; showTarget: boolean } | null>(null);
  const flow = useMemo(() => buildStrategyFlow(strategyNodes, protectedBlueprint, mode, enabledOptionalStages,
    { focusModuleId: focusedModuleId, showExternalInputs, expandedCardId: expandedId, previewCardId: previewId }),
  [strategyNodes, protectedBlueprint, mode, enabledOptionalStages, focusedModuleId, showExternalInputs, expandedId, previewId]);
  const [nodeLayout, setNodeLayout] = useState<Node[]>(() => flow.nodes.map((node) => ({ ...node })));
  const manuallyMovedIds = useRef(new Set<string>());
  const renderLayout = reconcileStrategyFlowLayout(nodeLayout, flow.nodes.map((node) => ({ ...node })), manuallyMovedIds.current);

  useEffect(() => {
    setNodeLayout((current) => reconcileStrategyFlowLayout(current, flow.nodes.map((node) => ({ ...node })), manuallyMovedIds.current));
  }, [flow]);

  useEffect(() => {
    if (focusedModuleId && !strategyNodes.some((node) => node.moduleId === focusedModuleId)) setFocusedModuleId(null);
  }, [focusedModuleId, strategyNodes]);

  const changeNode = (id: string, changes: NodeChange) => onNodesChange(strategyNodes.map((node) => node.id === id ? { ...node, ...changes } : node));
  const removeNode = (id: string) => onNodesChange(strategyNodes.filter((node) => node.id !== id).map((node) => ({ ...node, connections: node.connections?.filter((source) => source !== id) })));

  const stagePositions = new Map(flow.stages.map((stage) => [`stage-${stage.id}`, stage.position]));
  const layoutsById = new Map(renderLayout.map((layout) => [layout.id, layout]));
  const cardBounds = (id: string) => {
    const layout = layoutsById.get(id);
    if (!layout) return null;
    const parent = stagePositions.get(layout.parentId ?? '') ?? { x: 0, y: 0 };
    return {
      x: parent.x + layout.position.x,
      y: parent.y + layout.position.y,
      width: layout.measured?.width ?? layout.width ?? 308,
      height: layout.measured?.height ?? layout.height ?? 140,
    };
  };
  const activeHandles = new Map<string, Set<string>>();
  const routedEdges = flow.edges.map((edge, index) => {
    const source = cardBounds(edge.source);
    const target = cardBounds(edge.target);
    const attachment = source && target ? getEdgeAttachment(source, target) : { sourceHandle: 'out-right', targetHandle: 'in-left' };
    for (const [id, handle] of [[edge.source, attachment.sourceHandle], [edge.target, attachment.targetHandle]] as const) {
      if (!activeHandles.has(id)) activeHandles.set(id, new Set());
      activeHandles.get(id)!.add(handle);
    }
    return { ...edge, ...attachment, type: 'strategyConnection', data: { active: !editable, delay: `${-(index % 3) * 1.8}s` }, style: { ...edge.style, strokeWidth: editable ? 1.15 : 1.5, opacity: editable ? 0.45 : 0.75 } };
  });

  const cardNodes: CardNode[] = renderLayout.filter((layout) => layout.type === 'strategy').map((layout) => {
    const strategyNode = layout.data.strategyNode as AdvancedStrategyNode;
    return ({
    ...layout,
    type: 'strategy' as const,
    draggable: !flow.externalIds.includes(layout.id) && strategyNode.templateId !== 'module-overview',
    data: {
      strategyNode,
      nodes: strategyNodes,
      indicators,
      locale,
      editable: editable && !flow.externalIds.includes(layout.id) && (mode === 'advanced' || Boolean(strategyNode.parameters?.sourceRuleId)),
      expanded: expandedId === layout.id,
      previewExpanded: previewId === layout.id,
      canGroupSelect: editable && mode === 'advanced' && !focusedModuleId && !flow.externalIds.includes(layout.id) && !strategyNode.moduleId && !strategyNode.protected,
      selectedForGroup: selectedGroupIds.includes(layout.id),
      module: flow.modules.find((module) => `module:${module.id}` === layout.id),
      activeHandles: activeHandles.get(layout.id) ?? new Set(),
      onToggleSettings: (id) => setExpandedId((current) => current === id ? null : id),
      onTogglePreview: (id) => { if (expandedId === id) setExpandedId(null); setPreviewId((current) => current === id ? null : id); },
      onToggleGroupSelection: (id) => setSelectedGroupIds((current) => toggleGroupCardSelection(strategyNodes, current, id)),
      onOpenModule: (id) => { setShowExternalInputs(false); setFocusedModuleId(id); },
      onInfo: setLearningNode,
      onChange: changeNode,
      onRemove: removeNode,
    },
  });
  });
  const stageNodes: StageNode[] = flow.stages.map((stage, index) => ({
    id: `stage-${stage.id}`,
    type: 'stage',
    position: stage.position,
    width: stage.width,
    height: stage.height,
    measured: { width: stage.width, height: stage.height },
    style: { width: stage.width, height: stage.height },
    draggable: false,
    selectable: true,
    connectable: false,
    data: {
      stage,
      number: index + 1,
      locale,
      editable,
      canRemove: stage.optional && canRemoveOptionalStage(strategyNodes, stage.id as OptionalStrategyStageId),
      onAdd: setAddPanel,
      onRemove: (id) => onOptionalStagesChange(enabledOptionalStages.filter((candidate) => candidate !== id)),
    },
  }));
  const nodes = [...stageNodes, ...cardNodes];
  const expandedNode = flow.nodes.find((node) => node.id === expandedId);
  const expandedStage = flow.stages.find((stage) => `stage-${stage.id}` === expandedNode?.parentId);
  const expandedCardTop = expandedNode && expandedStage ? expandedStage.position.y + expandedNode.position.y : undefined;

  const connectSource = (sourceId: string, targetId: string) => {
    if (!getAvailableUpstreamNodes(strategyNodes, targetId).some((node) => node.id === sourceId)) return;
    const target = strategyNodes.find((node) => node.id === targetId);
    if (!target) return;
    const prior = target.connections ?? [];
    if (!prior.includes(sourceId)) changeNode(target.id, { connections: [...prior, sourceId] });
  };
  const connect = (connection: Connection) => {
    if (!editable || mode !== 'advanced' || !connection.source || !connection.target || connection.source === connection.target) return;
    const sourceModule = flow.modules.find((candidate) => `module:${candidate.id}` === connection.source);
    const targetModule = flow.modules.find((candidate) => `module:${candidate.id}` === connection.target);
    const sourceIds = sourceModule?.memberIds ?? [connection.source];
    const targetIds = targetModule?.memberIds ?? [connection.target];
    const availableByTarget = new Map(targetIds.map((targetId) => [targetId, getAvailableUpstreamNodes(strategyNodes, targetId).map((node) => node.id)] as const));
    const choices = getConnectableModulePairs(sourceIds, targetIds, availableByTarget);
    if (choices.length === 1) return connectSource(choices[0].sourceId, choices[0].targetId);
    if (choices.length > 1) setPendingModuleConnection({ choices, contextName: [sourceModule?.name, targetModule?.name].filter(Boolean).join(' → '), showSource: Boolean(sourceModule), showTarget: Boolean(targetModule) });
  };

  const groupedIds = new Set(flow.modules.flatMap((module) => module.memberIds));
  const selectedCardIds = selectedGroupIds.filter((id) => strategyNodes.some((candidate) => candidate.id === id && !candidate.moduleId && !candidate.protected && !groupedIds.has(id)));
  const focusedModule = flow.modules.find((module) => module.id === focusedModuleId);
  const marketBundle = focusedModule ? getMarketInputBundle(strategyNodes, focusedModule.id) : null;
  const groupSelection = () => {
    if (!canGroupStrategyNodes(strategyNodes, selectedCardIds)) return;
    const id = `group-${Date.now().toString(36)}`;
    const name = isAr ? 'مجموعة جديدة' : 'New module';
    const selected = new Set(selectedCardIds);
    onNodesChange(strategyNodes.map((node) => selected.has(node.id) ? { ...node, moduleId: id, moduleName: name } : node));
    setSelectedGroupIds([]);
    setShowExternalInputs(false);
    setFocusedModuleId(id);
  };
  const updateModuleName = (name: string) => {
    if (!focusedModuleId) return;
    onNodesChange(strategyNodes.map((node) => node.moduleId === focusedModuleId ? { ...node, moduleName: name } : node));
  };
  const ungroupModule = () => {
    if (!focusedModuleId) return;
    onNodesChange(strategyNodes.map((node) => {
      if (node.moduleId !== focusedModuleId) return node;
      return { ...node, moduleId: undefined, moduleName: undefined };
    }));
    setFocusedModuleId(null);
  };
  const duplicateModule = () => {
    if (!focusedModuleId) return;
    const id = `module-${crypto.randomUUID()}`;
    const updated = duplicateAdvancedModule(strategyNodes, focusedModuleId, id);
    if (!updated) return;
    onNodesChange(updated);
    setFocusedModuleId(id);
    setShowModuleFields(false);
  };
  const toggleMarketField = (field: MarketInputField, enabled: boolean) => {
    if (!focusedModuleId || !marketBundle) return;
    const current = marketBundle.map((node) => node.parameters!.field as MarketInputField);
    const fields = enabled ? [...current, field] : current.filter((candidate) => candidate !== field);
    const updated = updateMarketInputBundle(strategyNodes, focusedModuleId, fields);
    if (updated) onNodesChange(updated);
  };

  const addAdvanced = (templateId: string) => {
    const template = ADVANCED_BLOCK_TEMPLATES.find((candidate) => candidate.id === templateId);
    if (!template) return;
    const node = createAdvancedNodeFromTemplate(template, `custom-${template.id}-${Date.now()}`);
    onNodesChange([...strategyNodes, focusedModule ? { ...node, moduleId: focusedModule.id, moduleName: focusedModule.name } : node]);
    setExpandedId(node.id);
    setAddPanel(null);
  };
  const addAdvancedIndicator = (indicator: StrategyBuilderIndicatorOption) => {
    const node = createAdvancedIndicatorNode(indicator, `custom-indicator-${Date.now()}`);
    onNodesChange([...strategyNodes, focusedModule ? { ...node, moduleId: focusedModule.id, moduleName: focusedModule.name } : node]);
    setExpandedId(node.id);
    setAddPanel(null);
  };
  const addMarketBundle = (fields: readonly MarketInputField[]) => {
    if (fields.length < 2) return;
    onNodesChange([...strategyNodes, ...createMarketInputBundle(fields, `market-${crypto.randomUUID()}`)]);
    setAddPanel(null);
  };

  return (
    <div className="strategy-flow-canvas h-full w-full" aria-label={isAr ? 'مخطط الاستراتيجية' : 'Strategy graph'}>
      <div className="strategy-flow-graph-frame">
      <ReactFlow
        key={`${protectedBlueprint ? 'blueprint' : 'draft'}-${mode}`}
        nodes={nodes}
        edges={routedEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={(changes) => {
          setNodeLayout((current) => applyNodeChanges(changes, current));
        }}
        onNodeDragStart={(_, node) => { manuallyMovedIds.current.add(node.id); }}
        onNodeDragStop={(_, node) => { manuallyMovedIds.current.add(node.id); }}
        onConnect={connect}
        minZoom={0.35}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={editable && mode === 'advanced'}
        multiSelectionKeyCode="Shift"
        elementsSelectable
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
      >
        <FitFlowToPane resizeSignal={resizeSignal} topologySignal={[...flow.stages.map((stage) => stage.id), ...flow.nodes.map((node) => node.id)].join('|')} stages={flow.stages} focused={Boolean(focusedModule)} expandedCardTop={focusedModule ? expandedCardTop : undefined} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
      </div>
      {focusedModule && <div className="strategy-flow-module-nav" role="navigation" aria-label={isAr ? 'التنقل داخل المجموعة' : 'Module navigation'}>
        <button type="button" className="btn-token btn-secondary btn-compact" onClick={() => { setFocusedModuleId(null); setShowExternalInputs(false); setShowModuleFields(false); setExpandedId(null); setPreviewId(null); }}><ChevronLeft size={14} className={isAr ? 'rotate-180' : ''} />{isAr ? 'العودة إلى الاستراتيجية' : 'Strategy overview'}</button>
        {editable ? <ModuleNameEditor key={focusedModule.id} name={focusedModule.name} isAr={isAr} onCommit={updateModuleName} /> : <span className="truncate text-xs font-semibold text-plt-text">{focusedModule.name}</span>}
        <span className="hidden text-[11px] text-plt-muted sm:inline">{focusedModule.memberIds.length} {isAr ? 'خطوات' : focusedModule.memberIds.length === 1 ? 'step' : 'steps'}</span>
        {focusedModule.inputIds.length > 0 && <button type="button" className="btn-token btn-secondary btn-compact" aria-pressed={showExternalInputs} onClick={() => setShowExternalInputs((current) => !current)}>{isAr ? (showExternalInputs ? 'إخفاء المدخلات' : `عرض المدخلات (${focusedModule.inputIds.length})`) : (showExternalInputs ? 'Hide inputs' : `Show inputs (${focusedModule.inputIds.length})`)}</button>}
        {editable && marketBundle && <button type="button" className="btn-token btn-secondary btn-compact" aria-expanded={showModuleFields} aria-controls="strategy-module-fields" onClick={() => setShowModuleFields((current) => !current)}>{isAr ? 'الحقول' : 'Fields'}</button>}
        {editable && <button type="button" className="btn-token btn-secondary btn-compact" onClick={duplicateModule}>{isAr ? 'نسخ المجموعة' : 'Duplicate module'}</button>}
        {editable && <button type="button" className="btn-token btn-secondary btn-compact" onClick={ungroupModule}>{isAr ? 'إلغاء التجميع' : 'Ungroup'}</button>}
        {editable && marketBundle && showModuleFields && <div id="strategy-module-fields" className="strategy-flow-module-fields" role="group" aria-label={isAr ? 'حقول بيانات السوق' : 'Market data fields'}>
        <p className="text-xs font-semibold text-plt-text">{isAr ? 'حقول OHLCV' : 'OHLCV fields'}</p>
        <p className="mt-1 text-[11px] text-plt-muted">{isAr ? 'يمكنك إزالة الحقول غير المستخدمة فقط.' : 'Used fields stay connected and cannot be removed.'}</p>
        <div className="strategy-library-bundle-options">{(['open', 'high', 'low', 'close', 'volume'] as const).map((field) => {
          const node = marketBundle.find((member) => member.parameters?.field === field);
          const used = Boolean(node && isAdvancedNodeReferenced(strategyNodes, node.id));
          const disabled = Boolean(node && (used || marketBundle.length <= 2));
          return <label key={field} className="strategy-library-bundle-field" title={used ? (isAr ? 'الحقل متصل ببطاقة أخرى' : 'Connected to another card') : undefined}><input type="checkbox" checked={Boolean(node)} disabled={disabled} onChange={(event) => toggleMarketField(field, event.target.checked)} /><span>{field.charAt(0).toUpperCase() + field.slice(1)}</span>{used && <span className="text-[10px] text-plt-faint">{isAr ? 'مستخدم' : 'Used'}</span>}</label>;
        })}</div>
        </div>}
      </div>}
      {pendingModuleConnection && <div className="strategy-flow-output-picker" role="dialog" aria-label={isAr ? 'اختر اتصال المجموعة' : 'Choose module connection'}>
        <div className="flex items-center justify-between gap-3 border-b border-plt-border-soft px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-semibold text-plt-text">{isAr ? 'اختر القيمة والبطاقة' : 'Choose a connection'}</p><p className="truncate text-[11px] text-plt-muted">{pendingModuleConnection.contextName}</p></div><button type="button" className="strategy-flow-icon" aria-label={isAr ? 'إغلاق' : 'Close'} onClick={() => setPendingModuleConnection(null)}><X size={14} /></button></div>
        <div className="max-h-72 overflow-y-auto p-1.5">{pendingModuleConnection.choices.map(({ sourceId, targetId }) => { const source = strategyNodes.find((node) => node.id === sourceId); const target = strategyNodes.find((node) => node.id === targetId); const sourceLabel = source?.customName || (source ? localize(source.title, locale) : sourceId); const targetLabel = target?.customName || (target ? localize(target.title, locale) : targetId); return <button type="button" key={`${sourceId}:${targetId}`} className="block w-full rounded px-2 py-2 text-start text-xs text-plt-text hover:bg-white/[0.04]" onClick={() => { connectSource(sourceId, targetId); setPendingModuleConnection(null); }}>{pendingModuleConnection.showSource ? sourceLabel : ''}{pendingModuleConnection.showSource && pendingModuleConnection.showTarget ? ' → ' : ''}{pendingModuleConnection.showTarget ? targetLabel : ''}</button>; })}</div>
      </div>}
      {editable && mode === 'advanced' && !focusedModule && selectedCardIds.length > 0 && <div className="strategy-flow-selection-toolbar" role="toolbar" aria-label={isAr ? 'أدوات تجميع البطاقات' : 'Card grouping controls'}><span className="px-2 text-[11px] text-plt-muted">{selectedCardIds.length === 1 ? (isAr ? 'حدد بطاقة أخرى من نفس المرحلة' : 'Select another card in this stage') : (isAr ? `${selectedCardIds.length} بطاقات محددة` : `${selectedCardIds.length} cards selected`)}</span><button type="button" className="btn-token btn-secondary btn-compact" disabled={!canGroupStrategyNodes(strategyNodes, selectedCardIds)} onClick={groupSelection}>{isAr ? 'إنشاء مجموعة' : 'Create module'}</button><button type="button" className="nodrag strategy-flow-icon" aria-label={isAr ? 'إلغاء التحديد' : 'Clear grouping selection'} onClick={() => setSelectedGroupIds([])}><X size={13} /></button></div>}
      {editable && mode === 'advanced' && !focusedModule && (['calculations', 'position'] as const).some((id) => !flow.stages.some((stage) => stage.id === id)) && <div className="strategy-flow-floating-toolbar">
        {(['calculations', 'position'] as const).filter((id) => !flow.stages.some((stage) => stage.id === id)).map((id) => <button key={id} type="button" className="strategy-flow-add" aria-label={`${isAr ? 'إضافة مرحلة' : 'Add'} ${id === 'calculations' ? (isAr ? 'الحسابات' : 'Calculations') : (isAr ? 'أثناء الصفقة' : 'During trade')} ${isAr ? '' : 'stage'}`} onClick={() => onOptionalStagesChange([...enabledOptionalStages, id])}><Plus size={13} />{id === 'calculations' ? (isAr ? 'الحسابات' : 'Calculations') : (isAr ? 'أثناء الصفقة' : 'During trade')}</button>)}
      </div>}
      {addPanel && <div className="strategy-flow-picker-layer"><div className="strategy-flow-picker" role="region" aria-label={isAr ? 'مكتبة كتل الاستراتيجية' : 'Strategy block library'}>
        {mode === 'advanced' && addPanel === 'indicators' ? <IndicatorPicker
          indicators={indicators.filter((indicator) => indicator.available && indicator.requiredCapabilities.length === 0 && indicator.repaintBehavior !== 'confirmed-with-delay' && indicator.outputs.some((output) => output.kind === 'number'))}
          selectedIds={new Set<string>()}
          locale={locale}
          presentation="canvas"
          canvasPurpose="indicator"
          onAdd={addAdvancedIndicator}
          onClose={() => setAddPanel(null)}
        /> : mode === 'advanced' ? <AdvancedBlockLibraryModal
          templateIds={getStageTemplateIds(addPanel)}
          title={flow.stages.find((stage) => stage.id === addPanel)?.title ?? { en: 'Stage', ar: 'المرحلة' }}
          search={{ en: 'Search cards', ar: 'ابحث عن بطاقة' }}
          locale={locale}
          onAdd={(template) => addAdvanced(template.id)}
          onAddMarketBundle={addPanel === 'data' && !focusedModule ? addMarketBundle : undefined}
          onClose={() => setAddPanel(null)}
        /> : <IndicatorPicker
          indicators={indicators.filter(isSimpleRuleIndicatorSupported)}
          selectedIds={new Set(strategyNodes.filter((node) => node.parameters?.actionSide === addPanel).map((node) => node.parameters?.indicatorId).filter((id): id is string => Boolean(id)))}
          locale={locale}
          presentation="canvas"
          ruleSide={addPanel as StrategyRuleSide}
          onAdd={(indicator) => { onAddSimpleRule(addPanel as StrategyRuleSide, indicator); setAddPanel(null); }}
          onClose={() => setAddPanel(null)}
        />}
      </div></div>}
      {learningNode && <StrategyLibraryEducationDrawer guide={getNodeEducation(strategyNodes.find((node) => node.id === learningNode.id) ?? learningNode, indicators, locale)} locale={locale} origin="canvas" onClose={() => setLearningNode(null)} />}
    </div>
  );
}
