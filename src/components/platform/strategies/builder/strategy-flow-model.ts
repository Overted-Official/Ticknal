import { ADVANCED_BLOCK_TEMPLATES, localize, type AdvancedStrategyNode, type LocalizedAdvancedCopy } from './advanced-strategy-model';

export type StrategyCanvasStageId = 'data' | 'indicators' | 'calculations' | 'buy' | 'position' | 'sell';
export type OptionalStrategyStageId = 'calculations' | 'position';

export interface StrategyCanvasStage {
  readonly id: StrategyCanvasStageId;
  readonly title: LocalizedAdvancedCopy;
  readonly description: LocalizedAdvancedCopy;
  readonly optional: boolean;
  readonly count: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly width: number;
  readonly height: number;
}

export interface StrategyFlowNode {
  readonly id: string;
  readonly parentId: string;
  readonly extent: 'parent';
  readonly position: { readonly x: number; readonly y: number };
  readonly data: { readonly strategyNode: AdvancedStrategyNode };
  readonly type: 'strategy';
}

export interface StrategyFlowEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type: 'smoothstep';
  readonly animated: false;
  readonly style: { readonly stroke: string; readonly strokeWidth: number };
}

export interface StrategyCanvasModule {
  readonly id: string;
  readonly name: string;
  readonly memberIds: readonly string[];
  readonly inputIds: readonly string[];
  readonly outputIds: readonly string[];
}

/** Describe a grouped rule by its actual conditions, not by the last node's output name. */
export function getModuleRuleSummary(module: StrategyCanvasModule, nodes: readonly AdvancedStrategyNode[], locale: 'en' | 'ar'): string | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const members = module.memberIds.map((id) => byId.get(id));
  if (members.length < 2 || members.some((node) => !node || node.templateId !== 'condition')) return null;
  return members.map((node, index) => {
    const name = node!.customName || localize(node!.title, locale);
    const operator = node!.parameters?.operator ?? 'crossesAbove';
    const fixedValue = node!.parameters?.compareValue ?? '0';
    const reference = node!.parameters?.compareMode === 'series' ? byId.get(node!.parameters?.compareInputId ?? '') : undefined;
    const value = reference ? `${reference.customName || localize(reference.title, locale)}${fixedValue === '0' ? '' : ` + ${fixedValue}`}` : fixedValue;
    const verb = ({
      crossesAbove: locale === 'ar' ? 'يعبر لأعلى' : 'crosses above',
      crossesBelow: locale === 'ar' ? 'يعبر لأسفل' : 'crosses below',
      isAbove: locale === 'ar' ? 'أعلى من' : 'is above',
      isBelow: locale === 'ar' ? 'أقل من' : 'is below',
    } as Record<string, string>)[operator] ?? operator;
    const namedCondition = /^(.*?)\s+(?:crosses above|crosses below|is above|is below)\s+-?\d+(?:\.\d+)?$/iu.exec(name);
    const label = namedCondition ? `${namedCondition[1]} ${verb} ${value}`
      : /level enabled for ticker$/iu.test(name) && operator === 'isAbove' && !reference && value === '0' ? name
      : `${name} (${verb} ${value})`;
    if (index === 0) return label;
    const connector = node!.parameters?.connector === 'and' ? (locale === 'ar' ? 'و' : 'AND') : (locale === 'ar' ? 'أو' : 'OR');
    return `${connector} ${label}`;
  }).join(' ');
}

export function getConnectableModuleOutputs(module: StrategyCanvasModule, availableIds: readonly string[]): readonly string[] {
  const available = new Set(availableIds);
  return module.memberIds.filter((id) => available.has(id));
}

export function getConnectableModulePairs(
  sourceIds: readonly string[],
  targetIds: readonly string[],
  availableByTarget: ReadonlyMap<string, readonly string[]>,
): readonly { readonly sourceId: string; readonly targetId: string }[] {
  return targetIds.flatMap((targetId) => {
    const available = new Set(availableByTarget.get(targetId) ?? []);
    return sourceIds.filter((sourceId) => sourceId !== targetId && available.has(sourceId)).map((sourceId) => ({ sourceId, targetId }));
  });
}

interface CardBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface StrategyViewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export function getReadableStrategyViewport(overview: StrategyViewport, bounds: CardBounds, stageCount: number): StrategyViewport {
  if (stageCount < 4 || overview.zoom >= 0.8) return overview;
  const zoom = 0.8;
  return { x: 24 - bounds.x * zoom, y: 16 - bounds.y * zoom, zoom };
}

export function getFocusedModuleViewport(bounds: CardBounds, expandedCardTop?: number): StrategyViewport {
  const zoom = 0.85;
  return { x: 40 - bounds.x * zoom, y: expandedCardTop === undefined ? 134 - bounds.y * zoom : 60 - expandedCardTop * zoom, zoom };
}

export function getEdgeAttachment(source: CardBounds, target: CardBounds): { sourceHandle: string; targetHandle: string } {
  const horizontalOverlap = Math.min(source.x + source.width, target.x + target.width) - Math.max(source.x, target.x);
  if (horizontalOverlap >= Math.min(source.width, target.width) * 0.4) {
    return source.y + source.height / 2 <= target.y + target.height / 2
      ? { sourceHandle: 'out-bottom', targetHandle: 'in-top' }
      : { sourceHandle: 'out-top', targetHandle: 'in-bottom' };
  }
  return source.x + source.width / 2 <= target.x + target.width / 2
    ? { sourceHandle: 'out-right', targetHandle: 'in-left' }
    : { sourceHandle: 'out-left', targetHandle: 'in-right' };
}

const STAGE_CONTENT: Readonly<Record<StrategyCanvasStageId, Pick<StrategyCanvasStage, 'title' | 'description' | 'optional'>>> = {
  data: {
    title: { en: 'Data', ar: 'البيانات' },
    description: { en: 'Market prices, flows, and reusable values.', ar: 'الأسعار والتدفقات والقيم القابلة لإعادة الاستخدام.' },
    optional: false,
  },
  indicators: {
    title: { en: 'Indicators', ar: 'المؤشرات' },
    description: { en: 'Technical signals calculated from data.', ar: 'إشارات فنية محسوبة من البيانات.' },
    optional: false,
  },
  calculations: {
    title: { en: 'Calculations', ar: 'الحسابات' },
    description: { en: 'Combine or transform values.', ar: 'ادمج القيم أو حوّلها.' },
    optional: true,
  },
  buy: {
    title: { en: 'Buy conditions', ar: 'شروط الشراء' },
    description: { en: 'Rules that decide when to open a position.', ar: 'قواعد تحدد وقت فتح الصفقة.' },
    optional: false,
  },
  position: {
    title: { en: 'During trade', ar: 'أثناء الصفقة' },
    description: { en: 'Track values after a position opens.', ar: 'تتبع القيم بعد فتح الصفقة.' },
    optional: true,
  },
  sell: {
    title: { en: 'Sell conditions', ar: 'شروط البيع' },
    description: { en: 'When an exit condition matches, signal Sell.', ar: 'عندما يتحقق شرط خروج، أصدر إشارة بيع.' },
    optional: false,
  },
};

const ADVANCED_ORDER: readonly StrategyCanvasStageId[] = ['data', 'indicators', 'calculations', 'buy', 'position', 'sell'];
const SIMPLE_ORDER: readonly StrategyCanvasStageId[] = ['buy', 'sell'];

const BLUEPRINT_CONNECTIONS: Readonly<Record<string, readonly string[]>> = {
  'typhon-rsi': ['typhon-market-data'],
  'typhon-master-index': ['typhon-market-data', 'typhon-parameter-profile', 'typhon-rsi'],
  'typhon-smoothing': ['typhon-master-index'],
  'typhon-entry': ['typhon-smoothing'],
  'typhon-position-state': ['typhon-entry'],
  'typhon-aym-target': ['typhon-position-state'],
  'typhon-atr-trail': ['typhon-position-state'],
};

const BLUEPRINT_Y: Readonly<Record<string, number>> = {
  'typhon-market-data': 130,
  'typhon-parameter-profile': 390,
  'typhon-rsi': 130,
  'typhon-master-index': 265,
  'typhon-smoothing': 565,
  'typhon-entry': 355,
  'typhon-position-state': 355,
  'typhon-aym-target': 180,
  'typhon-atr-trail': 560,
};

export function getCanvasStage(node: AdvancedStrategyNode, mode: 'simple' | 'advanced'): StrategyCanvasStageId | null {
  if (mode === 'simple') {
    if (!node.parameters?.sourceRuleId) {
      if (node.protected && (node.stage === 'entry' || node.stage === 'exit')) return node.stage === 'exit' ? 'sell' : 'buy';
      return null;
    }
    return node.parameters.actionSide === 'sell' ? 'sell' : 'buy';
  }
  if (node.stage === 'output') return null;
  if (node.templateId === 'module-overview' && node.parameters?.moduleStage === 'indicators') return 'indicators';
  if (node.templateId === 'indicator') return 'indicators';
  if (node.stage === 'inputs') return 'data';
  if (node.stage === 'signal') return 'calculations';
  if (node.stage === 'state') return 'position';
  if (node.stage === 'exit' || node.parameters?.actionSide === 'sell') return 'sell';
  return 'buy';
}

export function canGroupStrategyNodes(nodes: readonly AdvancedStrategyNode[], selectedIds: readonly string[]): boolean {
  if (selectedIds.length < 2) return false;
  const selected = nodes.filter((node) => selectedIds.includes(node.id));
  const stages = new Set(selected.map((node) => getCanvasStage(node, 'advanced')));
  return selected.length === selectedIds.length && stages.size === 1 && !stages.has(null);
}

export function toggleGroupCardSelection(nodes: readonly AdvancedStrategyNode[], selectedIds: readonly string[], targetId: string): string[] {
  const target = nodes.find((node) => node.id === targetId);
  if (!target || target.moduleId || target.protected) return [...selectedIds];
  if (selectedIds.includes(targetId)) return selectedIds.filter((id) => id !== targetId);
  const targetStage = getCanvasStage(target, 'advanced');
  if (!targetStage) return [...selectedIds];
  const sameStage = selectedIds.filter((id) => {
    const selected = nodes.find((node) => node.id === id);
    return selected && !selected.moduleId && getCanvasStage(selected, 'advanced') === targetStage;
  });
  return [...sameStage, targetId];
}

export function reconcileStrategyFlowLayout<T extends { readonly id: string; readonly parentId?: string; readonly position: { readonly x: number; readonly y: number } }>(
  current: readonly T[], next: readonly T[], manuallyMovedIds: ReadonlySet<string>,
): T[] {
  const previousById = new Map(current.map((node) => [node.id, node]));
  return next.map((node) => {
    const previous = previousById.get(node.id);
    if (!previous) return node;
    return { ...previous, ...node, position: manuallyMovedIds.has(node.id) && previous.parentId === node.parentId ? previous.position : node.position };
  });
}

export function resolveModuleNameDraft(draft: string, currentName: string): string {
  return draft.trim() || currentName;
}

export function canRemoveOptionalStage(nodes: readonly AdvancedStrategyNode[], stageId: OptionalStrategyStageId): boolean {
  return !nodes.some((node) => getCanvasStage(node, 'advanced') === stageId);
}

export function getStageTemplateIds(stageId: StrategyCanvasStageId): readonly string[] {
  return ADVANCED_BLOCK_TEMPLATES
    .filter((template) => getCanvasStage({ ...template, id: template.id, templateId: template.id, summary: template.description }, 'advanced') === stageId)
    .map((template) => template.id);
}

export function buildStrategyFlow(
  strategyNodes: readonly AdvancedStrategyNode[],
  protectedBlueprint: boolean,
  mode: 'simple' | 'advanced' = 'advanced',
  enabledOptionalStages: readonly OptionalStrategyStageId[] = [],
  options: { readonly focusModuleId?: string | null; readonly showExternalInputs?: boolean; readonly expandedCardId?: string | null; readonly previewCardId?: string | null } = {},
): { readonly stages: readonly StrategyCanvasStage[]; readonly nodes: readonly StrategyFlowNode[]; readonly edges: readonly StrategyFlowEdge[]; readonly modules: readonly StrategyCanvasModule[]; readonly externalIds: readonly string[] } {
  const sourceNodes = strategyNodes.filter((node) => getCanvasStage(node, mode) !== null);
  const moduleIds = [...new Set(sourceNodes.map((node) => node.moduleId).filter((id): id is string => Boolean(id)))]
    .filter((id) => new Set(sourceNodes.filter((node) => node.moduleId === id).map((node) => getCanvasStage(node, mode))).size === 1);
  const modules = mode === 'advanced' ? moduleIds.map((id): StrategyCanvasModule => {
    const members = sourceNodes.filter((node) => node.moduleId === id);
    const memberIds = members.map((node) => node.id);
    const memberSet = new Set(memberIds);
    const inputIds = [...new Set(members.flatMap((node) => node.connections ?? []).filter((source) => !memberSet.has(source)))];
    const outputIds = members.filter((node) => sourceNodes.some((other) => !memberSet.has(other.id) && other.connections?.includes(node.id))).map((node) => node.id);
    const independentMarketOutputs = members.length > 1 && members.every((node) => node.templateId === 'market-input');
    return { id, name: members[0].moduleName ?? id, memberIds, inputIds, outputIds: independentMarketOutputs ? memberIds : outputIds.length ? outputIds : memberIds.slice(-1) };
  }) : [];
  const moduleByMember = new Map(modules.flatMap((module) => module.memberIds.map((id) => [id, module] as const)));
  const displayId = (id: string) => moduleByMember.has(id) ? `module:${moduleByMember.get(id)!.id}` : id;
  let externalIds: string[] = [];
  let visibleNodes: AdvancedStrategyNode[];
  if (options.focusModuleId && mode === 'advanced') {
    const focused = modules.find((module) => module.id === options.focusModuleId);
    const memberSet = new Set(focused?.memberIds ?? []);
    externalIds = options.showExternalInputs ? focused?.inputIds.filter((id) => sourceNodes.some((node) => node.id === id)) ?? [] : [];
    const externalSet = new Set(externalIds);
    visibleNodes = sourceNodes.filter((node) => memberSet.has(node.id) || externalSet.has(node.id));
  } else if (mode === 'advanced' && modules.length) {
    const emitted = new Set<string>();
    visibleNodes = sourceNodes.flatMap((node): AdvancedStrategyNode[] => {
      const module = moduleByMember.get(node.id);
      if (!module) return [{ ...node, connections: [...new Set((node.connections ?? []).map(displayId).filter((source) => source !== node.id))] }];
      if (emitted.has(module.id)) return [];
      emitted.add(module.id);
      const outputNode = sourceNodes.find((candidate) => candidate.id === module.outputIds.at(-1)) ?? node;
      const id = `module:${module.id}`;
      return [{
        id, stage: outputNode.stage, kind: 'calculation', templateId: 'module-overview',
        title: { en: module.name, ar: module.name },
        summary: { en: `${module.memberIds.length} steps`, ar: `${module.memberIds.length} خطوات` },
        moduleId: module.id, moduleName: module.name,
        parameters: { moduleStage: getCanvasStage(outputNode, mode) ?? 'calculations' },
        connections: [...new Set(module.inputIds.map(displayId).filter((source) => source !== id))],
      }];
    });
  } else visibleNodes = sourceNodes;
  const counts = new Map<StrategyCanvasStageId, number>();
  for (const node of visibleNodes) {
    const stage = getCanvasStage(node, mode)!;
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  const order = (mode === 'simple' ? SIMPLE_ORDER : ADVANCED_ORDER).filter((id) =>
    options.focusModuleId ? counts.has(id) : !STAGE_CONTENT[id].optional || counts.has(id) || enabledOptionalStages.includes(id as OptionalStrategyStageId));
  const ruleModuleIds = new Set(modules.filter((module) => getModuleRuleSummary(module, sourceNodes, 'en')).map((module) => `module:${module.id}`));
  const pitch = (id: string) => id === options.expandedCardId ? 540 : id === options.previewCardId ? 320 : ruleModuleIds.has(id) ? 112 : 92;
  const stageHeight = Math.max(mode === 'simple' ? 640 : 700,
    ...order.map((stage) => 160 + visibleNodes.filter((node) => getCanvasStage(node, mode) === stage).reduce((sum, node) => sum + pitch(node.id), 0)));
  const stages = order.map((id, index): StrategyCanvasStage => {
    return {
      id,
      ...STAGE_CONTENT[id],
      count: counts.get(id) ?? 0,
      position: { x: 32 + index * 380, y: 24 },
      width: 352,
      height: stageHeight,
    };
  });
  const stageOffsets = new Map<StrategyCanvasStageId, number>();
  const nodes = visibleNodes.map((node): StrategyFlowNode => {
    const stage = getCanvasStage(node, mode)!;
    const offset = stageOffsets.get(stage) ?? 0;
    stageOffsets.set(stage, offset + pitch(node.id));
    return {
      id: node.id,
      type: 'strategy',
      parentId: `stage-${stage}`,
      extent: 'parent',
      position: {
        x: 22,
        y: protectedBlueprint && mode === 'advanced'
          ? (BLUEPRINT_Y[node.id] ?? 135 + offset)
          : 135 + offset,
      },
      data: { strategyNode: node },
    };
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges = mode === 'simple' ? [] : visibleNodes.flatMap((node): StrategyFlowEdge[] => {
    const sources = protectedBlueprint ? (BLUEPRINT_CONNECTIONS[node.id] ?? node.connections ?? []) : (node.connections ?? []);
    return [...new Set(sources)].filter((source) => ids.has(source) && source !== node.id).map((source) => ({
      id: `${source}->${node.id}`,
      source,
      target: node.id,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: getCanvasStage(node, 'advanced') === 'sell' ? '#ec4b58' : '#528bd1',
        strokeWidth: 1.5,
      },
    }));
  });
  return { stages, nodes, edges, modules, externalIds };
}
