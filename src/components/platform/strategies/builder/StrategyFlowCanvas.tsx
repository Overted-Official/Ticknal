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

import { Info, Plus, Settings, Trash2, X } from '@/components/ui/icon-library';
import AdvancedBlockLibraryModal from './AdvancedBlockLibraryModal';
import AdvancedNodeEditor from './AdvancedNodeEditor';
import IndicatorPicker from './IndicatorPicker';
import StrategyBlockInspector from './StrategyBlockInspector';
import { ADVANCED_BLOCK_TEMPLATES, localize, type AdvancedStrategyNode } from './advanced-strategy-model';
import { getAvailableUpstreamNodes, createAdvancedNodeFromTemplate } from './advanced-builder-state';
import { buildStrategyFlow, canRemoveOptionalStage, getEdgeAttachment, getStageTemplateIds, type OptionalStrategyStageId, type StrategyCanvasStage, type StrategyCanvasStageId } from './strategy-flow-model';
import { isSimpleRuleIndicatorSupported, type StrategyBuilderIndicatorOption, type StrategyRuleSide } from './strategy-builder-model';
import type { StrategyInspectorTab } from './strategy-inspector-model';

type NodeChange = Partial<Pick<AdvancedStrategyNode, 'customName' | 'outputName' | 'connections' | 'parameters'>>;

interface CardData extends Record<string, unknown> {
  strategyNode: AdvancedStrategyNode;
  nodes: readonly AdvancedStrategyNode[];
  indicators: readonly StrategyBuilderIndicatorOption[];
  locale: 'en' | 'ar';
  editable: boolean;
  expanded: boolean;
  activeHandles: ReadonlySet<string>;
  onToggleSettings: (id: string) => void;
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
            <h2 className="text-[12px] font-semibold leading-4 text-white">{title}</h2>
            <p className="mt-1 text-[10px] leading-4 text-white/45">{localize(stage.description, locale)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[9px] tabular-nums text-white/40">{stage.count} {isAr ? 'كتل' : stage.count === 1 ? 'card' : 'cards'}</span>
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
  const { strategyNode: node, locale, editable, expanded } = data;
  const isAr = locale === 'ar';
  const accent = NODE_ACCENTS[node.kind];
  const name = node.customName || localize(node.title, locale);
  const summary = localize(node.summary, locale);
  const parameterRows = Object.entries(node.parameters ?? {}).filter(([key]) => !['sourceRuleId', 'indicatorId', 'indicatorBacklogId', 'indicatorName'].includes(key)).slice(0, 3);

  return (
    <article className={`strategy-flow-card ${selected ? 'strategy-flow-card-selected' : ''}`} style={{ '--node-accent': accent } as React.CSSProperties} aria-label={name}>
      {CARD_HANDLES.map((handle) => <Handle key={handle.id} id={handle.id} type={handle.type} position={handle.position} className={`strategy-flow-handle ${data.activeHandles.has(handle.id) ? '' : 'strategy-flow-handle-idle'}`} isConnectable={editable} />)}
      <div className="strategy-flow-card-heading">
        <span className="strategy-flow-card-dot" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white">{name}</span>
        <button type="button" className="nodrag strategy-flow-icon" aria-label={`${isAr ? 'معلومات عن' : 'Learn about'} ${name}`} title={isAr ? 'معلومات' : 'Learn'} onClick={() => data.onInfo(node)}><Info size={13} /></button>
        <button type="button" className={`nodrag strategy-flow-icon ${expanded ? 'text-white' : ''}`} aria-label={`${isAr ? 'إعدادات' : 'Settings for'} ${name}`} aria-expanded={expanded} title={isAr ? 'الإعدادات' : 'Settings'} onClick={() => data.onToggleSettings(node.id)}><Settings size={13} /></button>
        {editable && !node.protected && <button type="button" className="nodrag strategy-flow-icon hover:text-plt-risk" aria-label={`${isAr ? 'حذف' : 'Remove'} ${name}`} onClick={() => data.onRemove(node.id)}><Trash2 size={12} /></button>}
      </div>
      <div className="strategy-flow-card-content">
        <div className="strategy-flow-card-inset">
        <p className="strategy-flow-card-summary">{summary}</p>
        {node.tags && node.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{node.tags.slice(0, 4).map((tag) => <span key={tag} className="strategy-flow-chip">{tag}</span>)}</div>}
        {parameterRows.length > 0 && <div className="mt-3 space-y-1 border-t border-white/[0.07] pt-2.5">{parameterRows.map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3 text-[10px]"><span className="capitalize text-white/40">{key.replace(/([A-Z])/gu, ' $1')}</span><span className="truncate text-white/75 tabular-nums">{value}</span></div>)}</div>}
        {node.metrics && <div className="mt-3 space-y-1 border-t border-white/[0.07] pt-2.5">{node.metrics.slice(0, 4).map((metric) => <div key={metric.label.en} className="flex justify-between gap-3 text-[10px]"><span className="truncate text-white/45">{localize(metric.label, locale)}</span><span className="text-white/80 tabular-nums">{metric.value}</span></div>)}</div>}
        {expanded && <div className="nodrag nowheel strategy-flow-settings">
          <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50"><span>{isAr ? 'إعدادات العقدة' : 'Node settings'}</span><button type="button" aria-label={isAr ? 'إغلاق الإعدادات' : 'Close settings'} onClick={() => data.onToggleSettings(node.id)}><X size={12} /></button></div>
          {editable && !node.protected ? <AdvancedNodeEditor node={node} nodes={data.nodes} indicators={data.indicators} locale={locale} onChange={(changes) => data.onChange(node.id, changes)} /> : <div className="space-y-2">{(node.details ?? []).map((detail) => <div key={detail.label.en} className="flex justify-between gap-3 text-[10px]"><span className="text-white/45">{localize(detail.label, locale)}</span><span className="text-right text-white/80">{localize(detail.value, locale)}</span></div>)}{!node.details?.length && <p className="text-[10px] leading-4 text-white/50">{isAr ? 'هذه الاستراتيجية محمية للعرض فقط.' : 'This strategy is read-only. Create a new strategy to edit its logic.'}</p>}</div>}
        </div>}
        </div>
      </div>
    </article>
  );
});

const NODE_TYPES = { stage: StageRegion, strategy: StrategyCard };

function StrategyConnection({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, data }: EdgeProps) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12 });
  return <>
    <BaseEdge id={id} path={path} style={style} />
    {data?.active && <path d={path} pathLength={100} className="strategy-flow-current" stroke={String(style?.stroke ?? '#528bd1')} style={{ animationDelay: String(data.delay ?? '0s') }} aria-hidden="true" />}
  </>;
}

const EDGE_TYPES = { strategyConnection: StrategyConnection };

function FitFlowToPane({ resizeSignal, topologySignal, stages }: { readonly resizeSignal: number; readonly topologySignal: string; readonly stages: readonly StrategyCanvasStage[] }) {
  const { setViewport } = useReactFlow();
  const paneWidth = useStore((state) => state.width);
  const paneHeight = useStore((state) => state.height);
  useEffect(() => {
    if (!paneWidth || !paneHeight || stages.length === 0) return;
    const minX = Math.min(...stages.map((stage) => stage.position.x));
    const minY = Math.min(...stages.map((stage) => stage.position.y));
    const maxX = Math.max(...stages.map((stage) => stage.position.x + stage.width));
    const maxY = Math.max(...stages.map((stage) => stage.position.y + stage.height));
    const timer = window.setTimeout(() => {
      const viewport = getViewportForBounds({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, paneWidth, paneHeight, 0.35, 0.95, 0.075);
      void setViewport(viewport, { duration: 180 });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [resizeSignal, topologySignal, stages, paneWidth, paneHeight, setViewport]);
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
  const [inspected, setInspected] = useState<{ node: AdvancedStrategyNode; tab: StrategyInspectorTab } | null>(null);
  const [addPanel, setAddPanel] = useState<StrategyCanvasStageId | null>(null);
  const flow = useMemo(() => buildStrategyFlow(strategyNodes, protectedBlueprint, mode, enabledOptionalStages), [strategyNodes, protectedBlueprint, mode, enabledOptionalStages]);
  const [nodeLayout, setNodeLayout] = useState<Node[]>(() => flow.nodes.map((node) => ({ ...node })));
  const manuallyMovedIds = useRef(new Set<string>());

  useEffect(() => {
    setNodeLayout((current) => flow.nodes.map((node) => {
      const previous = current.find((candidate) => candidate.id === node.id);
      return previous ? { ...previous, position: manuallyMovedIds.current.has(node.id) ? previous.position : node.position, data: node.data } : { ...node };
    }));
  }, [flow]);

  const changeNode = (id: string, changes: NodeChange) => onNodesChange(strategyNodes.map((node) => node.id === id ? { ...node, ...changes } : node));
  const removeNode = (id: string) => onNodesChange(strategyNodes.filter((node) => node.id !== id).map((node) => ({ ...node, connections: node.connections?.filter((source) => source !== id) })));

  const stagePositions = new Map(flow.stages.map((stage) => [`stage-${stage.id}`, stage.position]));
  const layoutsById = new Map(nodeLayout.map((layout) => [layout.id, layout]));
  const cardBounds = (id: string) => {
    const layout = layoutsById.get(id);
    if (!layout) return null;
    const parent = stagePositions.get(layout.parentId ?? '') ?? { x: 0, y: 0 };
    return {
      x: parent.x + layout.position.x,
      y: parent.y + layout.position.y,
      width: layout.measured?.width ?? layout.width ?? 248,
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

  const cardNodes: CardNode[] = nodeLayout.filter((layout) => strategyNodes.some((node) => node.id === layout.id)).map((layout) => ({
    ...layout,
    type: 'strategy' as const,
    data: {
      strategyNode: strategyNodes.find((node) => node.id === layout.id)!,
      nodes: strategyNodes,
      indicators,
      locale,
      editable: editable && (mode === 'advanced' || Boolean(strategyNodes.find((node) => node.id === layout.id)?.parameters?.sourceRuleId)),
      expanded: expandedId === layout.id,
      activeHandles: activeHandles.get(layout.id) ?? new Set(),
      onToggleSettings: (id) => setExpandedId((current) => current === id ? null : id),
      onInfo: (node) => setInspected({ node, tab: 'learn' }),
      onChange: changeNode,
      onRemove: removeNode,
    },
  }));
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

  const connect = (connection: Connection) => {
    if (!editable || mode !== 'advanced' || !connection.source || !connection.target) return;
    if (!getAvailableUpstreamNodes(strategyNodes, connection.target).some((node) => node.id === connection.source)) return;
    const target = strategyNodes.find((node) => node.id === connection.target);
    if (!target) return;
    const prior = target.connections ?? [];
    if (!prior.includes(connection.source)) changeNode(target.id, { connections: [...prior, connection.source] });
  };

  const addAdvanced = (templateId: string) => {
    const template = ADVANCED_BLOCK_TEMPLATES.find((candidate) => candidate.id === templateId);
    if (!template) return;
    const node = createAdvancedNodeFromTemplate(template, `custom-${template.id}-${Date.now()}`);
    onNodesChange([...strategyNodes, node]);
    setExpandedId(node.id);
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
        onNodeDragStop={(_, node) => { manuallyMovedIds.current.add(node.id); }}
        onConnect={connect}
        fitView
        fitViewOptions={{ padding: 0.13, minZoom: 0.35, maxZoom: 0.95 }}
        minZoom={0.35}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={editable && mode === 'advanced'}
        elementsSelectable
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
      >
        <FitFlowToPane resizeSignal={resizeSignal} topologySignal={[...flow.stages.map((stage) => stage.id), ...flow.nodes.map((node) => node.id)].join('|')} stages={flow.stages} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
      </div>
      {editable && mode === 'advanced' && (['calculations', 'position'] as const).some((id) => !flow.stages.some((stage) => stage.id === id)) && <div className="strategy-flow-floating-toolbar">
        {(['calculations', 'position'] as const).filter((id) => !flow.stages.some((stage) => stage.id === id)).map((id) => <button key={id} type="button" className="strategy-flow-add" aria-label={`${isAr ? 'إضافة مرحلة' : 'Add'} ${id === 'calculations' ? (isAr ? 'الحسابات' : 'Calculations') : (isAr ? 'أثناء الصفقة' : 'During trade')} ${isAr ? '' : 'stage'}`} onClick={() => onOptionalStagesChange([...enabledOptionalStages, id])}><Plus size={13} />{id === 'calculations' ? (isAr ? 'الحسابات' : 'Calculations') : (isAr ? 'أثناء الصفقة' : 'During trade')}</button>)}
      </div>}
      {addPanel && <div className="strategy-flow-picker-layer"><div className="strategy-flow-picker" role="region" aria-label={isAr ? 'مكتبة كتل الاستراتيجية' : 'Strategy block library'}>{mode === 'advanced' ? <AdvancedBlockLibraryModal templateIds={getStageTemplateIds(addPanel)} title={flow.stages.find((stage) => stage.id === addPanel)?.title ?? { en: 'Stage', ar: 'المرحلة' }} search={{ en: 'Search cards', ar: 'ابحث عن بطاقة' }} locale={locale} onAdd={(template) => addAdvanced(template.id)} onClose={() => setAddPanel(null)} /> : <IndicatorPicker indicators={indicators.filter(isSimpleRuleIndicatorSupported)} selectedIds={new Set(strategyNodes.filter((node) => node.parameters?.actionSide === addPanel).map((node) => node.parameters?.indicatorId).filter((id): id is string => Boolean(id)))} locale={locale} onAdd={(indicator) => { onAddSimpleRule(addPanel as StrategyRuleSide, indicator); setAddPanel(null); }} onClose={() => setAddPanel(null)} />}</div></div>}
      {inspected && <StrategyBlockInspector target={{ kind: 'advanced-node', node: strategyNodes.find((node) => node.id === inspected.node.id) ?? inspected.node }} tab={inspected.tab} nodes={strategyNodes} indicators={indicators} locale={locale} onTabChange={(tab) => setInspected((current) => current ? { ...current, tab } : null)} onChange={(change) => { if (change.kind === 'advanced-node') changeNode(inspected.node.id, change.changes); }} onClose={() => setInspected(null)} />}
    </div>
  );
}
