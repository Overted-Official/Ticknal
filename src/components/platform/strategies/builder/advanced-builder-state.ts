import {
  ADVANCED_STAGES,
  ADVANCED_BLOCK_TEMPLATES,
  createAdvancedDraftNodes,
  type AdvancedBlockTemplate,
  type AdvancedStrategyNode,
} from './advanced-strategy-model';
import type {
  StrategyBuilderIndicatorOption,
  StrategyDraft,
  StrategyRule,
  StrategyRuleSide,
} from './strategy-builder-model';
import { MAX_ADVANCED_WORKFLOW_NODES } from '../../../../lib/strategies/strategy-program';

export type AdvancedNodeMoveDirection = 'up' | 'down';

const DEFAULT_PARAMETERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'market-input': { series: 'ohlcv' },
  parameter: { value: '1' },
  'execution-policy': { fillPolicy: 'next-session-open', shareSizing: 'fractional' },
  indicator: {},
  'weighted-composite': { normalization: 'zeroToHundred' },
  'condition-score': { conditions: '[]' },
  'ticker-select': { alternateSymbols: '[]' },
  transform: { method: 'ema', period: '3' },
  formula: { aliases: '[]', registers: '[{"key":"value","expression":"0"}]', outputKey: 'value' },
  'formula-output': { outputKey: 'value' },
  'rbf-model': { model: '' },
  'rolling-statistic': { operation: 'mean', period: '20' },
  'math-operation': { operation: 'add' },
  condition: { operator: 'crossesAbove', compareMode: 'value', compareValue: '0', connector: 'and' },
  'sell-condition': { operator: 'crossesBelow', compareMode: 'value', compareValue: '0', connector: 'and' },
  'priority-trigger': { thresholds: '23.6, 14.6, 38.2, 50, 61.8' },
  'position-memory': { capture: 'entry', update: 'eachBar' },
  'rolling-state': { operation: 'maximum' },
  'dynamic-target': { multiplier: '1' },
  'trailing-exit': { distance: '2', volatilityPeriod: '14' },
};

function toOutputName(id: string): string {
  return id
    .trim()
    .replace(/[^a-zA-Z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
    .toLocaleLowerCase();
}

export function createAdvancedNodeFromTemplate(
  template: AdvancedBlockTemplate,
  id: string,
): AdvancedStrategyNode {
  return {
    id,
    stage: template.stage,
    kind: template.kind,
    title: template.title,
    summary: template.description,
    templateId: template.id,
    outputName: toOutputName(id),
    connections: [],
    parameters: { ...(DEFAULT_PARAMETERS[template.id] ?? {}) },
  };
}

export type MarketInputField = 'open' | 'high' | 'low' | 'close' | 'volume';

export interface ConditionScoreDraftRow {
  readonly inputId: string;
  readonly operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  readonly compareMode?: 'fixed' | 'series';
  readonly compareInputId?: string;
  readonly threshold: string;
  readonly weight: string;
}

export function readConditionScoreRows(value: string | undefined): ConditionScoreDraftRow[] {
  try {
    const rows: unknown = JSON.parse(value ?? '[]');
    if (!Array.isArray(rows)) return [];
    return rows.slice(0, 12).filter((row) => row && typeof row === 'object').map((row) => ({
      inputId: typeof row.inputId === 'string' ? row.inputId : '',
      operator: ['gt', 'gte', 'lt', 'lte', 'eq'].includes(row.operator) ? row.operator : 'gt',
      compareMode: row.compareMode === 'series' || row.compareInputId ? 'series' : 'fixed',
      ...(typeof row.compareInputId === 'string' ? { compareInputId: row.compareInputId } : {}),
      threshold: String(row.threshold ?? '0'),
      weight: String(row.weight ?? '1'),
    }));
  } catch { return []; }
}

export function makeConditionScoreChanges(parameters: Readonly<Record<string, string>>, rows: readonly ConditionScoreDraftRow[]) {
  return {
    connections: [...new Set(rows.flatMap((row) => [row.inputId, row.compareInputId].filter((id): id is string => Boolean(id))))],
    parameters: { ...parameters, conditions: JSON.stringify(rows) },
  };
}

/** A compact visual bundle; each selected field remains an ordinary executable market input. */
export function createMarketInputBundle(fields: readonly MarketInputField[], moduleId: string): AdvancedStrategyNode[] {
  const template = ADVANCED_BLOCK_TEMPLATES.find((candidate) => candidate.id === 'market-input');
  if (!template) return [];
  return [...new Set(fields)].map((field) => ({
    ...createAdvancedNodeFromTemplate(template, `${moduleId}-${field}`),
    customName: field.charAt(0).toUpperCase() + field.slice(1),
    moduleId,
    moduleName: 'OHLCV',
    parameters: { series: 'ohlcv', field },
  }));
}

const MARKET_INPUT_FIELDS: readonly MarketInputField[] = ['open', 'high', 'low', 'close', 'volume'];

/** Returns null for a regular module; only field-specific market inputs are editable as a bundle. */
export function getMarketInputBundle(nodes: readonly AdvancedStrategyNode[], moduleId: string): readonly AdvancedStrategyNode[] | null {
  const members = nodes.filter((node) => node.moduleId === moduleId);
  return members.length > 0 && members.every((node) => node.templateId === 'market-input' && MARKET_INPUT_FIELDS.includes(node.parameters?.field as MarketInputField))
    ? members : null;
}

export function isAdvancedNodeReferenced(nodes: readonly AdvancedStrategyNode[], nodeId: string): boolean {
  return nodes.some((node) => node.id !== nodeId && ((node.connections ?? []).includes(nodeId) || Object.values(node.parameters ?? {}).includes(nodeId)));
}

/** Changes the visible OHLCV fields while preserving all used source IDs and downstream wiring. */
export function updateMarketInputBundle(
  nodes: readonly AdvancedStrategyNode[], moduleId: string, fields: readonly MarketInputField[],
): readonly AdvancedStrategyNode[] | null {
  const members = getMarketInputBundle(nodes, moduleId);
  const selected = new Set(fields);
  if (!members || selected.size < 2 || [...selected].some((field) => !MARKET_INPUT_FIELDS.includes(field))) return null;
  const removed = members.filter((node) => !selected.has(node.parameters!.field as MarketInputField));
  if (removed.some((node) => isAdvancedNodeReferenced(nodes, node.id))) return null;
  const currentFields = new Set(members.map((node) => node.parameters!.field));
  const added = MARKET_INPUT_FIELDS.filter((field) => selected.has(field) && !currentFields.has(field));
  const additions = createMarketInputBundle(added, moduleId).map((node) => ({ ...node, moduleName: members[0].moduleName }));
  if (additions.some((node) => nodes.some((existing) => existing.id === node.id))) return null;
  const removedIds = new Set(removed.map((node) => node.id));
  return [...nodes.filter((node) => !removedIds.has(node.id)), ...additions];
}

/** Copies editable module steps; internal references point to copies, external inputs stay connected. */
export function duplicateAdvancedModule(
  nodes: readonly AdvancedStrategyNode[], moduleId: string, newModuleId: string,
): readonly AdvancedStrategyNode[] | null {
  const members = nodes.filter((node) => node.moduleId === moduleId);
  if (!members.length || nodes.length + members.length > MAX_ADVANCED_WORKFLOW_NODES
    || members.some((node) => node.protected || node.parameters?.sourceRuleId)
    || nodes.some((node) => node.moduleId === newModuleId)) return null;
  const idMap = new Map(members.map((node, index) => [node.id, `${newModuleId}-${index + 1}`]));
  if ([...idMap.values()].some((id) => nodes.some((node) => node.id === id))) return null;
  const copiedName = `${members[0].moduleName ?? 'Module'} copy`.slice(0, 100);
  const firstRuleBySide = new Set<string>();
  const copied = members.map((node) => {
    const firstRule = (node.templateId === 'condition' || node.templateId === 'sell-condition') && !firstRuleBySide.has(node.templateId);
    if (firstRule) firstRuleBySide.add(node.templateId!);
    const parameters: Record<string, string> | undefined = node.parameters ? { ...Object.fromEntries(Object.entries(node.parameters).map(([key, value]) => [key, idMap.get(value) ?? value])), ...(firstRule ? { connector: 'or' } : {}) } : undefined;
    if (node.templateId === 'condition-score' && parameters?.conditions) {
      const rows = readConditionScoreRows(parameters.conditions);
      parameters.conditions = JSON.stringify(rows.map((row) => ({ ...row, inputId: idMap.get(row.inputId) ?? row.inputId,
        ...(row.compareInputId ? { compareInputId: idMap.get(row.compareInputId) ?? row.compareInputId } : {}) })));
    }
    return {
      ...node,
      id: idMap.get(node.id)!,
      outputName: toOutputName(idMap.get(node.id)!),
      moduleId: newModuleId,
      moduleName: copiedName,
      connections: node.connections?.map((id) => idMap.get(id) ?? id),
      parameters,
    };
  });
  const lastMemberIndex = nodes.findLastIndex((node) => node.moduleId === moduleId);
  return [...nodes.slice(0, lastMemberIndex + 1), ...copied, ...nodes.slice(lastMemberIndex + 1)];
}

export function createAdvancedIndicatorNode(
  indicator: StrategyBuilderIndicatorOption,
  id: string,
): AdvancedStrategyNode {
  const template = ADVANCED_BLOCK_TEMPLATES.find((candidate) => candidate.id === 'indicator');
  if (!template) throw new Error('Advanced indicator template is unavailable');
  const node = createAdvancedNodeFromTemplate(template, id);
  const numericOutputs = indicator.outputs.filter((output) => output.kind === 'number');
  return {
    ...node,
    customName: indicator.name,
    parameters: {
      indicatorId: indicator.id,
      indicatorName: indicator.name,
      indicatorBacklogId: indicator.backlogId,
      ...Object.fromEntries(Object.entries(indicator.defaultParameters).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => [key, String(value)])),
      ...(numericOutputs.length === 1 ? { outputKey: numericOutputs[0].key } : {}),
    },
  };
}

export function updateAdvancedNode(
  nodes: readonly AdvancedStrategyNode[],
  nodeId: string,
  changes: Partial<Pick<AdvancedStrategyNode, 'customName' | 'outputName' | 'connections' | 'parameters'>>,
): readonly AdvancedStrategyNode[] {
  return nodes.map((node) => node.id === nodeId ? { ...node, ...changes } : node);
}

export function getAvailableUpstreamNodes(
  nodes: readonly AdvancedStrategyNode[],
  nodeId: string,
): readonly AdvancedStrategyNode[] {
  const target = nodes.find((node) => node.id === nodeId);
  if (!target) return [];
  const targetStageIndex = ADVANCED_STAGES.findIndex((stage) => stage.id === target.stage);
  const targetIndexWithinStage = nodes.filter((node) => node.stage === target.stage).findIndex((node) => node.id === nodeId);
  let seenInTargetStage = 0;

  return nodes.filter((node) => {
    if (node.id === nodeId) return false;
    const nodeStageIndex = ADVANCED_STAGES.findIndex((stage) => stage.id === node.stage);
    if (nodeStageIndex < targetStageIndex) return true;
    if (nodeStageIndex > targetStageIndex) return false;
    const isAvailable = seenInTargetStage < targetIndexWithinStage;
    seenInTargetStage += 1;
    return isAvailable;
  });
}

export function connectAdvancedNode(
  nodes: readonly AdvancedStrategyNode[],
  nodeId: string,
  sourceNodeId: string,
  single: boolean,
): readonly AdvancedStrategyNode[] {
  return nodes.map((node) => {
    if (node.id !== nodeId) return node;
    const current = node.connections ?? [];
    const connections = single
      ? (current[0] === sourceNodeId ? [] : [sourceNodeId])
      : (current.includes(sourceNodeId) ? current.filter((id) => id !== sourceNodeId) : [...current, sourceNodeId]);
    return { ...node, connections };
  });
}

export function moveAdvancedNode(
  nodes: readonly AdvancedStrategyNode[],
  nodeId: string,
  direction: AdvancedNodeMoveDirection,
): readonly AdvancedStrategyNode[] {
  const currentIndex = nodes.findIndex((node) => node.id === nodeId);
  if (currentIndex < 0) return nodes;
  if (nodes[currentIndex].protected) return nodes;
  const stage = nodes[currentIndex].stage;
  const stageIndices = nodes
    .map((node, index) => node.stage === stage ? index : -1)
    .filter((index) => index >= 0);
  const position = stageIndices.indexOf(currentIndex);
  const targetPosition = direction === 'up' ? position - 1 : position + 1;
  if (targetPosition < 0 || targetPosition >= stageIndices.length) return nodes;

  const next = [...nodes];
  const targetIndex = stageIndices[targetPosition];
  if (next[targetIndex].protected) return nodes;
  [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
  return next;
}

export function removeAdvancedNode(
  nodes: readonly AdvancedStrategyNode[],
  nodeId: string,
): readonly AdvancedStrategyNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => node.connections?.includes(nodeId)
      ? { ...node, connections: node.connections.filter((connectionId) => connectionId !== nodeId) }
      : node);
}

function projectedNodeId(side: StrategyRuleSide, rule: StrategyRule): string {
  return `simple-${side}-${rule.id}`;
}

function projectRule(
  side: StrategyRuleSide,
  rule: StrategyRule,
  indicators: readonly StrategyBuilderIndicatorOption[],
): AdvancedStrategyNode {
  const conditionTemplate = ADVANCED_BLOCK_TEMPLATES.find((template) => template.id === (side === 'sell' ? 'sell-condition' : 'condition'));
  if (!conditionTemplate) throw new Error('Advanced condition template is unavailable');
  const id = projectedNodeId(side, rule);
  const indicator = indicators.find((candidate) => candidate.id === rule.indicatorId);
  const indicatorName = indicator?.name ?? 'Unknown indicator';
  const node = createAdvancedNodeFromTemplate(conditionTemplate, id);

  return {
    ...node,
    customName: indicatorName,
    connections: ['custom-market-data'],
    parameters: {
      ...node.parameters,
      sourceRuleId: rule.id,
      actionSide: side,
      indicatorId: rule.indicatorId,
      outputKey: rule.outputKey ?? '',
      indicatorName,
      period: String(rule.period),
      operator: rule.operator,
      compareValue: String(rule.value),
      connector: rule.connector,
    },
  };
}

export function projectSimpleDraftIntoAdvancedNodes(
  draft: StrategyDraft,
  indicators: readonly StrategyBuilderIndicatorOption[],
  currentNodes: readonly AdvancedStrategyNode[],
): readonly AdvancedStrategyNode[] {
  const projected = [
    ...draft.buyRules.map((rule) => projectRule('buy', rule, indicators)),
    ...draft.sellRules.map((rule) => projectRule('sell', rule, indicators)),
  ];
  const projectedIds = new Set(projected.map((node) => node.id));
  const projectedById = new Map(projected.map((node) => [node.id, node]));
  const existingProjectedIds = new Set(
    currentNodes
      .filter((node) => node.parameters?.sourceRuleId)
      .map((node) => node.id),
  );
  const updated = currentNodes
    .filter((node) => !node.parameters?.sourceRuleId || projectedIds.has(node.id))
    .map((node) => projectedById.get(node.id) ?? node);
  const existingIds = new Set(updated.map((node) => node.id));
  const withNewProjected = [
    ...(projected.length && !updated.some((node) => node.id === 'custom-market-data') ? createAdvancedDraftNodes() : []),
    ...updated,
    ...projected.filter((node) => !existingIds.has(node.id)),
  ];
  const buyIds = draft.buyRules.map((rule) => projectedNodeId('buy', rule));
  const sellIds = draft.sellRules.map((rule) => projectedNodeId('sell', rule));

  return withNewProjected.map((node) => {
    const isBuyTerminal = node.templateId === 'buy-terminal';
    const isSellTerminal = node.templateId === 'sell-terminal';
    if (!isBuyTerminal && !isSellTerminal) return node;
    const retained = (node.connections ?? []).filter((connectionId) => !existingProjectedIds.has(connectionId));
    return { ...node, connections: [...retained, ...(isBuyTerminal ? buyIds : sellIds)] };
  });
}

export function hasAdvancedOnlyFeatures(nodes: readonly AdvancedStrategyNode[]): boolean {
  return nodes.some((node) => {
    if (node.stage === 'output') return false;
    if (node.id === 'custom-market-data') return false;
    return !node.parameters?.sourceRuleId;
  });
}

export function reconcileSimpleDraftFromFlow(draft: StrategyDraft, nodes: readonly AdvancedStrategyNode[]): StrategyDraft {
  const projectedByRuleId = new Map(nodes
    .filter((node) => node.parameters?.sourceRuleId)
    .map((node) => [node.parameters!.sourceRuleId, node]));
  const updateRules = (rules: readonly StrategyRule[]): readonly StrategyRule[] => rules
    .filter((rule) => projectedByRuleId.has(rule.id))
    .map((rule) => {
      const parameters = projectedByRuleId.get(rule.id)?.parameters ?? {};
      const period = Number(parameters.period);
      const value = Number(parameters.compareValue);
      return {
        ...rule,
        period: Number.isFinite(period) && period > 0 ? period : rule.period,
        outputKey: parameters.outputKey || undefined,
        value: Number.isFinite(value) ? value : rule.value,
        operator: ['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(parameters.operator) ? parameters.operator as StrategyRule['operator'] : rule.operator,
        connector: parameters.connector === 'or' ? 'or' as const : 'and' as const,
      };
    });
  return { ...draft, buyRules: updateRules(draft.buyRules), sellRules: updateRules(draft.sellRules) };
}
