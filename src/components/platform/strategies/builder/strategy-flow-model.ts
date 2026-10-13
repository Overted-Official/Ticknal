import { ADVANCED_BLOCK_TEMPLATES, type AdvancedStrategyNode, type LocalizedAdvancedCopy } from './advanced-strategy-model';

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

interface CardBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
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
  if (node.templateId === 'indicator') return 'indicators';
  if (node.stage === 'inputs') return 'data';
  if (node.stage === 'signal') return 'calculations';
  if (node.stage === 'state') return 'position';
  if (node.stage === 'exit' || node.parameters?.actionSide === 'sell') return 'sell';
  return 'buy';
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
): { readonly stages: readonly StrategyCanvasStage[]; readonly nodes: readonly StrategyFlowNode[]; readonly edges: readonly StrategyFlowEdge[] } {
  const visibleNodes = strategyNodes.filter((node) => getCanvasStage(node, mode) !== null);
  const counts = new Map<StrategyCanvasStageId, number>();
  for (const node of visibleNodes) {
    const stage = getCanvasStage(node, mode)!;
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  const order = (mode === 'simple' ? SIMPLE_ORDER : ADVANCED_ORDER).filter((id) =>
    !STAGE_CONTENT[id].optional || counts.has(id) || enabledOptionalStages.includes(id as OptionalStrategyStageId));
  const stageHeight = mode === 'simple'
    ? Math.max(640, 150 + Math.max(...order.map((id) => counts.get(id) ?? 0)) * 240)
    : Math.max(700, 150 + Math.max(...order.map((id) => counts.get(id) ?? 0)) * 250);
  const stages = order.map((id, index): StrategyCanvasStage => {
    return {
      id,
      ...STAGE_CONTENT[id],
      count: counts.get(id) ?? 0,
      position: { x: 32 + index * 320, y: 24 },
      width: 292,
      height: stageHeight,
    };
  });
  const stageCounts = new Map<StrategyCanvasStageId, number>();
  const nodes = visibleNodes.map((node): StrategyFlowNode => {
    const stage = getCanvasStage(node, mode)!;
    const indexWithinStage = stageCounts.get(stage) ?? 0;
    stageCounts.set(stage, indexWithinStage + 1);
    return {
      id: node.id,
      type: 'strategy',
      parentId: `stage-${stage}`,
      extent: 'parent',
      position: {
        x: 22,
        y: protectedBlueprint && mode === 'advanced'
          ? (BLUEPRINT_Y[node.id] ?? 135 + indexWithinStage * 250)
          : 135 + indexWithinStage * 240,
      },
      data: { strategyNode: node },
    };
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges = mode === 'simple' ? [] : visibleNodes.flatMap((node): StrategyFlowEdge[] => {
    const sources = protectedBlueprint ? (BLUEPRINT_CONNECTIONS[node.id] ?? node.connections ?? []) : (node.connections ?? []);
    return sources.filter((source) => ids.has(source)).map((source) => ({
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
  return { stages, nodes, edges };
}
