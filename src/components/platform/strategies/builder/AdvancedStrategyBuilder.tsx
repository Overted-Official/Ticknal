'use client';

import { useMemo, useRef, useState, type ComponentType } from 'react';

import {
  Activity,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Database,
  GitBranch,
  Lock,
  Plus,
  Radio,
  Search,
  Settings,
  Sigma,
  Trash2,
  X,
} from '@/components/ui/icon-library';

import AdvancedNodeEditor from './AdvancedNodeEditor';
import CompactStrategyBlockRow, { type StrategyBlockTone } from './CompactStrategyBlockRow';
import StrategyBlockInspector from './StrategyBlockInspector';
import {
  createAdvancedNodeFromTemplate,
  removeAdvancedNode,
  updateAdvancedNode,
} from './advanced-builder-state';
import {
  ADVANCED_BLOCK_TEMPLATES,
  TYPHON_BLUEPRINT_NODES,
  createAdvancedDraftNodes,
  type AdvancedBlockLibraryGroup,
  type AdvancedBlockTemplate,
  type AdvancedNodeKind,
  type AdvancedStrategyNode,
  type LocalizedAdvancedCopy,
} from './advanced-strategy-model';
import type { StrategyBuilderIndicatorOption } from './strategy-builder-model';
import type { StrategyInspectorTab } from './strategy-inspector-model';

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

const NODE_APPEARANCE: Readonly<Record<AdvancedNodeKind, {
  readonly color: string;
  readonly icon: ComponentType<{ size?: number; className?: string }>;
  readonly label: LocalizedAdvancedCopy;
}>> = {
  input: { color: '#2962ff', icon: Database, label: { en: 'Input', ar: 'مدخل' } },
  calculation: { color: '#8b5cf6', icon: Sigma, label: { en: 'Calculation', ar: 'حساب' } },
  decision: { color: '#d6a316', icon: GitBranch, label: { en: 'Decision', ar: 'قرار' } },
  state: { color: '#787b86', icon: Activity, label: { en: 'State', ar: 'حالة' } },
  exit: { color: '#f23645', icon: GitBranch, label: { en: 'Exit', ar: 'خروج' } },
  output: { color: '#089981', icon: Radio, label: { en: 'Output', ar: 'مخرج' } },
};

const BLOCK_LIBRARY_GROUPS: readonly {
  readonly id: AdvancedBlockLibraryGroup;
  readonly title: LocalizedAdvancedCopy;
}[] = [
  { id: 'marketData', title: { en: 'Market data', ar: 'بيانات السوق' } },
  { id: 'indicators', title: { en: 'Indicators', ar: 'المؤشرات' } },
  { id: 'calculate', title: { en: 'Calculate', ar: 'الحساب' } },
  { id: 'rules', title: { en: 'Create a rule', ar: 'إنشاء قاعدة' } },
  { id: 'combine', title: { en: 'Combine rules', ar: 'دمج القواعد' } },
  { id: 'holding', title: { en: 'While holding', ar: 'أثناء الاحتفاظ' } },
  { id: 'protect', title: { en: 'Protect the trade', ar: 'حماية الصفقة' } },
];

type WorkflowAreaId = 'data' | 'calculations' | 'buy' | 'position' | 'sell';

interface WorkflowAreaConfig {
  readonly id: WorkflowAreaId;
  readonly number: string;
  readonly title: LocalizedAdvancedCopy;
  readonly description: LocalizedAdvancedCopy;
  readonly templateIds: readonly string[];
  readonly matches: (node: AdvancedStrategyNode) => boolean;
  readonly addLabel: LocalizedAdvancedCopy;
  readonly searchLabel: LocalizedAdvancedCopy;
}

const SETUP_AREAS: readonly WorkflowAreaConfig[] = [
  {
    id: 'data',
    number: '01',
    title: { en: 'Data & Indicators', ar: 'البيانات والمؤشرات' },
    description: { en: 'Choose the raw series and indicators the strategy can read.', ar: 'اختر السلاسل الخام والمؤشرات التي يمكن للاستراتيجية قراءتها.' },
    templateIds: ['market-input', 'parameter', 'indicator'],
    matches: (node) => node.stage === 'inputs' || node.templateId === 'indicator',
    addLabel: { en: 'Add data or indicator', ar: 'إضافة بيانات أو مؤشر' },
    searchLabel: { en: 'Search data and indicators', ar: 'ابحث في البيانات والمؤشرات' },
  },
  {
    id: 'calculations',
    number: '02',
    title: { en: 'Calculations', ar: 'الحسابات' },
    description: { en: 'Transform, smooth, summarize or combine the selected data.', ar: 'حوّل أو نعّم أو لخّص أو ادمج البيانات المختارة.' },
    templateIds: ['weighted-composite', 'transform', 'rolling-statistic', 'math-operation'],
    matches: (node) => node.stage === 'signal' && node.templateId !== 'indicator',
    addLabel: { en: 'Add calculation', ar: 'إضافة حساب' },
    searchLabel: { en: 'Search calculations', ar: 'ابحث في الحسابات' },
  },
];

const BUY_AREA: WorkflowAreaConfig = {
  id: 'buy',
  number: '01',
  title: { en: 'Buy Logic', ar: 'منطق الشراء' },
  description: { en: 'Add the conditions that should open a position.', ar: 'أضف الشروط التي يجب أن تفتح الصفقة.' },
  templateIds: ['condition', 'priority-trigger'],
  matches: (node) => node.stage === 'entry' && node.parameters?.actionSide !== 'sell',
  addLabel: { en: 'Add buy condition', ar: 'إضافة شرط شراء' },
  searchLabel: { en: 'Search buy conditions', ar: 'ابحث في شروط الشراء' },
};

const POSITION_AREA: WorkflowAreaConfig = {
  id: 'position',
  number: '02',
  title: { en: 'While Trade Is Open', ar: 'أثناء فتح الصفقة' },
  description: { en: 'Remember entry values and track what changes during the trade.', ar: 'احفظ قيم الدخول وتتبع ما يتغير أثناء الصفقة.' },
  templateIds: ['position-memory', 'rolling-state'],
  matches: (node) => node.stage === 'state',
  addLabel: { en: 'Add tracking step', ar: 'إضافة خطوة تتبع' },
  searchLabel: { en: 'Search tracking steps', ar: 'ابحث في خطوات التتبع' },
};

const SELL_AREA: WorkflowAreaConfig = {
  id: 'sell',
  number: '03',
  title: { en: 'Sell Logic', ar: 'منطق البيع' },
  description: { en: 'Add sell conditions, stop-losses, targets and trailing protection.', ar: 'أضف شروط البيع وإيقاف الخسارة والأهداف والحماية المتحركة.' },
  templateIds: ['condition', 'priority-trigger', 'dynamic-target', 'trailing-exit'],
  matches: (node) => node.stage === 'exit' || (node.stage === 'entry' && node.parameters?.actionSide === 'sell'),
  addLabel: { en: 'Add sell condition or protection', ar: 'إضافة شرط بيع أو حماية' },
  searchLabel: { en: 'Search sell conditions and protection', ar: 'ابحث في شروط البيع والحماية' },
};

function localize(copy: LocalizedAdvancedCopy, locale: 'en' | 'ar'): string {
  return copy[locale];
}

function AdvancedNodeCard({
  node,
  locale,
  expanded,
  readOnly,
  nodes,
  indicators,
  onToggle,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  readonly node: AdvancedStrategyNode;
  readonly locale: 'en' | 'ar';
  readonly expanded: boolean;
  readonly readOnly: boolean;
  readonly nodes: readonly AdvancedStrategyNode[];
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly onToggle: () => void;
  readonly onChange?: (changes: Partial<Pick<AdvancedStrategyNode, 'customName' | 'outputName' | 'connections' | 'parameters'>>) => void;
  readonly onRemove?: () => void;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
  readonly canMoveUp?: boolean;
  readonly canMoveDown?: boolean;
}) {
  const isAr = locale === 'ar';
  const appearance = NODE_APPEARANCE[node.kind];
  const Icon = appearance.icon;
  const detailsId = `${node.id}-details`;

  return (
    <article className="border border-white/10 bg-black" style={{ borderInlineStartColor: appearance.color }}>
      <div className="flex min-h-14 items-center gap-3 px-3 py-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center border"
          style={{ borderColor: `${appearance.color}66`, color: appearance.color }}
          aria-hidden="true"
        >
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-semibold text-white">{node.customName || localize(node.title, locale)}</h5>
            <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: appearance.color }}>
              {localize(appearance.label, locale)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#787b86]">{localize(node.summary, locale)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!readOnly && !node.protected && (
            <div className="hidden flex-col sm:flex">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="flex h-[22px] w-7 items-center justify-center border border-white/10 text-[#787b86] transition-colors enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-25"
                aria-label={`${isAr ? 'تحريك لأعلى' : 'Move up'} ${node.customName || localize(node.title, locale)}`}
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="flex h-[22px] w-7 items-center justify-center border-x border-b border-white/10 text-[#787b86] transition-colors enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-25"
                aria-label={`${isAr ? 'تحريك لأسفل' : 'Move down'} ${node.customName || localize(node.title, locale)}`}
              >
                <ChevronDown size={12} />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className={`flex min-h-11 min-w-11 items-center justify-center border transition-colors ${
              expanded ? 'border-white/25 text-white' : 'border-white/10 text-[#787b86] hover:border-white/25 hover:text-white'
            }`}
            aria-label={`${expanded ? (isAr ? 'إخفاء تفاصيل' : 'Hide details for') : (isAr ? 'عرض تفاصيل' : 'Show details for')} ${localize(node.title, locale)}`}
          >
            {readOnly ? <ChevronDown size={14} className={expanded ? 'rotate-180' : ''} /> : <Settings size={14} />}
          </button>
          {!readOnly && !node.protected && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex min-h-11 min-w-11 items-center justify-center border border-white/10 text-[#787b86] transition-colors hover:border-[#f23645]/40 hover:text-[#f23645]"
              aria-label={`${isAr ? 'حذف' : 'Remove'} ${localize(node.title, locale)}`}
            >
              <Trash2 size={14} />
            </button>
          )}
          {readOnly && node.protected && <Lock size={12} className="mx-1 text-white/30" aria-label={isAr ? 'محمي' : 'Protected'} />}
        </div>
      </div>

      {node.tags && node.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] px-3 py-2">
          {node.tags.map((tag) => (
            <span key={tag} className="border border-white/10 px-1.5 py-1 text-[8px] font-semibold tracking-[0.08em] text-white/50">
              {tag}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div id={detailsId} className="animate-in fade-in border-t border-white/10 px-3 py-3 duration-150">
          {node.metrics && node.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-px border border-white/[0.06] bg-white/[0.06]">
              {node.metrics.map((metric) => (
                <div key={localize(metric.label, locale)} className="flex items-center justify-between gap-2 bg-black px-2.5 py-2">
                  <span className="truncate text-[9px] text-[#787b86]">{localize(metric.label, locale)}</span>
                  <span className={`shrink-0 text-[10px] font-semibold tabular-nums ${metric.emphasis ? 'text-[#8b5cf6]' : 'text-white'}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {node.details && node.details.length > 0 && (
            <dl className={node.metrics?.length ? 'mt-3 space-y-2' : 'space-y-2'}>
              {node.details.map((detail) => (
                <div key={localize(detail.label, locale)} className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-2 last:border-b-0 last:pb-0">
                  <dt className="text-[9px] uppercase tracking-[0.08em] text-[#787b86]">{localize(detail.label, locale)}</dt>
                  <dd className="text-end text-[10px] leading-4 text-white/75">{localize(detail.value, locale)}</dd>
                </div>
              ))}
            </dl>
          )}

          {!readOnly && onChange && (
            <AdvancedNodeEditor
              node={node}
              nodes={nodes}
              indicators={indicators}
              locale={locale}
              onChange={onChange}
            />
          )}
        </div>
      )}
    </article>
  );
}

function CompactAdvancedNodeCard({
  node, locale, readOnly, selected, onInspect, onConfigure, onRemove,
}: {
  readonly node: AdvancedStrategyNode;
  readonly locale: 'en' | 'ar';
  readonly readOnly: boolean;
  readonly selected: boolean;
  readonly onInspect: () => void;
  readonly onConfigure: () => void;
  readonly onRemove?: () => void;
}) {
  const tone: StrategyBlockTone = node.kind === 'input' ? 'input'
    : node.kind === 'calculation' ? 'calculation'
      : node.kind === 'decision' || node.kind === 'output' ? (node.parameters?.actionSide === 'sell' || node.outputName?.startsWith('SELL') || node.id.includes('sell') ? 'sell' : 'buy')
        : node.kind === 'exit' ? 'sell'
          : node.kind === 'state' ? 'state'
            : 'neutral';
  return (
    <CompactStrategyBlockRow
      id={node.id}
      name={node.customName || localize(node.title, locale)}
      summary={localize(node.summary, locale)}
      tone={tone}
      readOnly={readOnly || Boolean(node.protected)}
      selected={selected}
      validationMessage={!readOnly && !node.protected && node.kind !== 'input' && (!node.connections || node.connections.length === 0) ? (locale === 'ar' ? 'اربط مدخلاً لهذه الكتلة' : 'Connect an input to this block') : undefined}
      onInspect={onInspect}
      onConfigure={onConfigure}
      onRemove={onRemove}
    />
  );
}

export function StageBlockPicker({
  templateIds,
  title,
  search,
  locale,
  onAdd,
  onClose,
}: {
  readonly templateIds: readonly string[];
  readonly title: LocalizedAdvancedCopy;
  readonly search: LocalizedAdvancedCopy;
  readonly locale: 'en' | 'ar';
  readonly onAdd: (template: AdvancedBlockTemplate) => void;
  readonly onClose: () => void;
}) {
  const isAr = locale === 'ar';
  const [query, setQuery] = useState('');
  const templates = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const areaTemplates = ADVANCED_BLOCK_TEMPLATES.filter((template) => templateIds.includes(template.id));
    if (!normalized) return areaTemplates;
    return areaTemplates.filter((template) => [
      localize(template.title, locale),
      localize(template.description, locale),
      template.libraryGroup,
    ].join(' ').toLocaleLowerCase().includes(normalized));
  }, [locale, query, templateIds]);
  const groupedTemplates = useMemo(() => BLOCK_LIBRARY_GROUPS
    .map((group) => ({
      ...group,
      templates: templates.filter((template) => template.libraryGroup === group.id),
    }))
    .filter((group) => group.templates.length > 0), [templates]);

  return (
    <section className="border border-white/15 bg-black" aria-label={`${isAr ? 'خيارات الإضافة إلى' : 'Add options for'} ${localize(title, locale)}`}>
      <div className="flex min-h-11 items-center border-b border-white/10 px-3 focus-within:border-white/30">
        <Search size={14} className="shrink-0 text-white/40" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={localize(search, locale)}
          aria-label={localize(search, locale)}
          className="min-w-0 flex-1 bg-transparent px-2.5 font-sans text-xs text-white outline-none placeholder:text-[#787b86]"
        />
        <button type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center text-[#787b86] hover:text-white" aria-label={isAr ? 'إغلاق المكتبة' : 'Close block library'}>
          <X size={14} />
        </button>
      </div>
      <div className="custom-scrollbar max-h-64 overflow-y-auto">
        {groupedTemplates.map((group) => (
          <section key={group.id} aria-labelledby={`block-library-${group.id}`} className="border-b border-white/10 last:border-b-0">
            <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2">
              <h5 id={`block-library-${group.id}`} className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/60">
                {localize(group.title, locale)}
              </h5>
              <span className="text-[9px] tabular-nums text-white/30">{group.templates.length}</span>
            </header>
            {group.templates.map((template) => {
              const appearance = NODE_APPEARANCE[template.kind];
              const Icon = appearance.icon;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onAdd(template)}
                  className="flex min-h-14 w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 text-start transition-colors last:border-b-0 hover:bg-white/[0.04]"
                >
                  <span className="shrink-0" style={{ color: appearance.color }}><Icon size={14} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-white">{localize(template.title, locale)}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-[#787b86]">{localize(template.description, locale)}</span>
                  </span>
                  <Plus size={14} className="shrink-0 text-white/45" />
                </button>
              );
            })}
          </section>
        ))}
        {templates.length === 0 && <p className="px-3 py-8 text-center text-xs text-[#787b86]">{isAr ? 'لا توجد خيارات مطابقة.' : 'No matching options.'}</p>}
      </div>
    </section>
  );
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
  const [openAreaId, setOpenAreaId] = useState<WorkflowAreaId | null>(null);
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
    setOpenAreaId(null);
  };

  const nodesForArea = (area: WorkflowAreaConfig) => nodes.filter(area.matches);

  const renderNode = (node: AdvancedStrategyNode, _peers: readonly AdvancedStrategyNode[]) => {
    return (
      <CompactAdvancedNodeCard
        key={node.id}
        node={node}
        locale={locale}
        readOnly={readOnly}
        selected={activeNodeId === node.id}
        onInspect={() => inspectNode(node, 'learn')}
        onConfigure={() => inspectNode(node, 'configure')}
        onRemove={() => {
          setNodes((current) => removeAdvancedNode(current, node.id));
          if (activeNodeId === node.id) {
            onFocusedNodeChange?.(null);
            setInternalFocusedNodeId(null);
          }
        }}
      />
    );
  };

  const renderAddControl = (area: WorkflowAreaConfig, itemCount: number) => {
    if (readOnly) return null;
    if (openAreaId === area.id) {
      return (
        <StageBlockPicker
          templateIds={area.templateIds}
          title={area.title}
          search={area.searchLabel}
          locale={locale}
          onAdd={(template) => addBlock(template, area.id)}
          onClose={() => setOpenAreaId(null)}
        />
      );
    }

    return (
      <button
        type="button"
        onClick={() => setOpenAreaId(area.id)}
        aria-expanded={false}
        className={`flex w-full items-center justify-center border border-dashed border-white/10 text-[10px] text-[#787b86] transition-colors hover:border-white/25 hover:text-white ${itemCount === 0 ? 'min-h-16' : 'min-h-11'}`}
      >
        <Plus size={12} className="me-1.5" /> {localize(area.addLabel, locale)}
      </button>
    );
  };

  const buyNode = nodes.find((node) => node.templateId === 'buy-terminal' || node.id === 'typhon-buy-logic');
  const sellNode = nodes.find((node) => node.templateId === 'sell-terminal' || node.id === 'typhon-sell-logic');
  const buyNodes = nodesForArea(BUY_AREA);
  const positionNodes = nodesForArea(POSITION_AREA);
  const sellNodes = nodesForArea(SELL_AREA);

  return (
    <section className="mt-4" aria-label={readOnly ? (isAr ? 'مخطط استراتيجية تايفون' : 'Typhon strategy blueprint') : (isAr ? 'منشئ الاستراتيجية المتقدم' : 'Advanced strategy builder')}>
      <div className="border-y border-white/10 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <GitBranch size={14} className="text-white/55" />
            <h4 className="text-sm font-semibold text-white">{readOnly ? (isAr ? 'مخطط تايفون' : 'Typhon blueprint') : (isAr ? 'سير عمل متقدم' : 'Advanced workflow')}</h4>
            {readOnly && (
              <span className="inline-flex items-center gap-1 border border-white/10 px-1.5 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-white/45">
                <Lock size={9} /> {isAr ? 'محمي' : 'Protected'}
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] leading-4 text-[#787b86]">
            {readOnly
              ? (isAr ? 'عرض مرئي فقط. لا توجد أي أدوات لتعديل منطق الاستراتيجية.' : 'Visual explanation only. No controls can modify the strategy logic.')
              : (isAr ? 'جهّز منطق الاستراتيجية أولاً، ثم حدد متى يتم الشراء أو البيع.' : 'Prepare the strategy logic first, then define when it buys or sells.')}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[9px] text-[#787b86]">
        <span>{isAr ? 'الإعداد يجهز المنطق والحسابات' : 'Setup prepares the logic and calculations'}</span>
        <span>{isAr ? 'التنفيذ يحولها إلى قرارات شراء وبيع' : 'Execution turns them into Buy and Sell actions'}</span>
      </div>

      <div
        data-testid="advanced-workflow-canvas"
        data-layout="setup-execution"
        className="mt-3"
      >
        <section aria-labelledby="advanced-setup-heading" className="border border-white/10 bg-black">
          <header className="border-b border-white/10 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold tabular-nums text-white/30">01</span>
              <h5 id="advanced-setup-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-white">{isAr ? 'الإعداد' : 'Setup'}</h5>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-[#787b86]">{isAr ? 'اختر البيانات والمؤشرات ثم حدد الحسابات التي ستطبق عليها.' : 'Choose the data and indicators, then define the calculations applied to them.'}</p>
          </header>

          <div className="custom-scrollbar overflow-x-auto p-3">
            <div className="grid min-w-[720px] grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] items-start">
              {SETUP_AREAS.map((area, areaIndex) => {
                const areaNodes = nodesForArea(area);
                return (
                  <div key={area.id} className="contents">
                    <section aria-labelledby={`advanced-area-${area.id}`} className="border border-white/[0.08] bg-black">
                      <header className="flex items-start gap-3 border-b border-white/[0.06] px-3 py-2.5">
                        <span className="pt-0.5 text-[9px] font-semibold tabular-nums text-white/30">{area.number}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h6 id={`advanced-area-${area.id}`} className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">{localize(area.title, locale)}</h6>
                            <span className="text-[9px] tabular-nums text-white/30">{areaNodes.length}</span>
                          </div>
                          <p className="mt-0.5 text-[9px] leading-4 text-[#787b86]">{localize(area.description, locale)}</p>
                        </div>
                      </header>
                      <div className="space-y-2 p-2">
                        {areaNodes.map((node) => renderNode(node, areaNodes))}
                        {renderAddControl(area, areaNodes.length)}
                      </div>
                    </section>

                    {areaIndex < SETUP_AREAS.length - 1 && (
                      <div role="img" aria-label={`${isAr ? 'تدفق من' : 'Flow from'} ${localize(area.title, locale)} ${isAr ? 'إلى' : 'to'} ${localize(SETUP_AREAS[areaIndex + 1].title, locale)}`} className="flex items-center pt-12">
                        <span className="h-px flex-1 bg-white/15" />
                        <ChevronRight size={14} className={`-ms-px shrink-0 bg-black text-white/35 ${isAr ? 'rotate-180' : ''}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div role="img" aria-label={isAr ? 'تدفق من الإعداد إلى التنفيذ' : 'Flow from Setup to Execution'} className="flex h-12 flex-col items-center justify-center">
          <span className="w-px flex-1 bg-white/15" />
          <ChevronDown size={15} className="-mt-px shrink-0 bg-black text-white/40" />
        </div>

        <section aria-labelledby="advanced-execution-heading" className="border border-white/10 bg-black">
          <header className="border-b border-white/10 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold tabular-nums text-white/30">02</span>
              <h5 id="advanced-execution-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-white">{isAr ? 'التنفيذ' : 'Execution'}</h5>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-[#787b86]">{isAr ? 'حوّل المنطق المُعد إلى قرارات شراء وبيع مستقلة.' : 'Turn the prepared logic into independent Buy and Sell actions.'}</p>
          </header>

          <div className="custom-scrollbar overflow-x-auto p-3">
            <div className="grid min-w-[1080px] grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)_48px_minmax(0,1fr)] items-start">
              <section aria-labelledby="advanced-area-buy" className="space-y-2 border border-white/[0.08] bg-black p-2">
                <header className="border-b border-white/[0.06] px-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold tabular-nums text-white/30">{BUY_AREA.number}</span>
                    <h6 id="advanced-area-buy" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#089981]">{localize(BUY_AREA.title, locale)}</h6>
                    <span className="text-[9px] tabular-nums text-white/30">{buyNodes.length}</span>
                  </div>
                  <p className="mt-0.5 text-[9px] leading-4 text-[#787b86]">{localize(BUY_AREA.description, locale)}</p>
                </header>
                {buyNodes.map((node) => renderNode(node, buyNodes))}
                {renderAddControl(BUY_AREA, buyNodes.length)}
                {buyNode && renderNode(buyNode, [buyNode])}
              </section>

              <div role="img" aria-label={isAr ? 'تدفق من منطق الشراء إلى أثناء فتح الصفقة' : 'Flow from Buy Logic to While Trade Is Open'} className="flex items-center pt-12">
                <span className="h-px flex-1 bg-white/15" />
                <ChevronRight size={14} className={`-ms-px shrink-0 bg-black text-white/35 ${isAr ? 'rotate-180' : ''}`} />
              </div>

              <section aria-labelledby="advanced-area-position" className="space-y-2 border border-white/[0.08] bg-black p-2">
                <header className="border-b border-white/[0.06] px-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold tabular-nums text-white/30">{POSITION_AREA.number}</span>
                    <h6 id="advanced-area-position" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">{localize(POSITION_AREA.title, locale)}</h6>
                    <span className="text-[9px] tabular-nums text-white/30">{positionNodes.length}</span>
                  </div>
                  <p className="mt-0.5 text-[9px] leading-4 text-[#787b86]">{localize(POSITION_AREA.description, locale)}</p>
                </header>
                {positionNodes.map((node) => renderNode(node, positionNodes))}
                {renderAddControl(POSITION_AREA, positionNodes.length)}
              </section>

              <div role="img" aria-label={isAr ? 'تدفق من أثناء فتح الصفقة إلى منطق البيع' : 'Flow from While Trade Is Open to Sell Logic'} className="flex items-center pt-12">
                <span className="h-px flex-1 bg-white/15" />
                <ChevronRight size={14} className={`-ms-px shrink-0 bg-black text-white/35 ${isAr ? 'rotate-180' : ''}`} />
              </div>

              <section aria-labelledby="advanced-area-sell" className="space-y-2 border border-white/[0.08] bg-black p-2">
                <header className="border-b border-white/[0.06] px-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold tabular-nums text-white/30">{SELL_AREA.number}</span>
                    <h6 id="advanced-area-sell" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f23645]">{localize(SELL_AREA.title, locale)}</h6>
                    <span className="text-[9px] tabular-nums text-white/30">{sellNodes.length}</span>
                  </div>
                  <p className="mt-0.5 text-[9px] leading-4 text-[#787b86]">{localize(SELL_AREA.description, locale)}</p>
                </header>
                {sellNodes.map((node, index) => (
                  <div key={node.id}>
                    {index > 0 && (
                      <div className="flex items-center gap-2 py-1">
                        <span className="h-px flex-1 bg-white/[0.08]" />
                        <span className="text-[8px] font-semibold text-[#f23645]">{isAr ? 'أو' : 'OR'}</span>
                        <span className="h-px flex-1 bg-white/[0.08]" />
                      </div>
                    )}
                    {renderNode(node, sellNodes)}
                  </div>
                ))}
                {renderAddControl(SELL_AREA, sellNodes.length)}
                {sellNode && renderNode(sellNode, [sellNode])}
              </section>
            </div>
          </div>
        </section>
      </div>

      <p className="mt-4 border-t border-white/10 pt-3 text-[9px] leading-4 text-[#787b86]">
        {readOnly
          ? (isAr ? 'هذا المخطط بيانات عرض منفصلة ولا يستورد أو يعدل ملفات استراتيجية تايفون.' : 'This blueprint is separate presentation data. It neither imports nor modifies Typhon strategy files.')
          : (isAr ? 'نموذج واجهة فقط: الحفظ والتنفيذ والاختبار الفعلي ستتم إضافتها في مرحلة لاحقة.' : 'UI prototype only: persistence, execution and live backtesting will be connected in a later phase.')}
      </p>
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
    </section>
  );
}
