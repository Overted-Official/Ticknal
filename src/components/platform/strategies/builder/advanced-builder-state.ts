import {
  ADVANCED_STAGES,
  ADVANCED_BLOCK_TEMPLATES,
  type AdvancedBlockTemplate,
  type AdvancedStrategyNode,
} from './advanced-strategy-model';
import type {
  StrategyBuilderIndicatorOption,
  StrategyDraft,
  StrategyRule,
  StrategyRuleSide,
} from './strategy-builder-model';

export type AdvancedNodeMoveDirection = 'up' | 'down';

const DEFAULT_PARAMETERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'market-input': { series: 'ohlcv' },
  parameter: { value: '1' },
  indicator: { period: '14' },
  'weighted-composite': { normalization: 'zeroToHundred' },
  transform: { method: 'ema', period: '3' },
  'rolling-statistic': { operation: 'mean', period: '20' },
  'math-operation': { operation: 'add' },
  condition: { operator: 'crossesAbove', compareMode: 'value', compareValue: '0' },
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
  const stage = nodes[currentIndex].stage;
  const stageIndices = nodes
    .map((node, index) => node.stage === stage ? index : -1)
    .filter((index) => index >= 0);
  const position = stageIndices.indexOf(currentIndex);
  const targetPosition = direction === 'up' ? position - 1 : position + 1;
  if (targetPosition < 0 || targetPosition >= stageIndices.length) return nodes;

  const next = [...nodes];
  const targetIndex = stageIndices[targetPosition];
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
  const conditionTemplate = ADVANCED_BLOCK_TEMPLATES.find((template) => template.id === 'condition');
  if (!conditionTemplate) throw new Error('Advanced condition template is unavailable');
  const id = projectedNodeId(side, rule);
  const indicator = indicators.find((candidate) => candidate.id === rule.indicatorId);
  const indicatorName = indicator?.name ?? 'Unknown indicator';
  const node = createAdvancedNodeFromTemplate(conditionTemplate, id);

  return {
    ...node,
    customName: indicatorName,
    parameters: {
      ...node.parameters,
      sourceRuleId: rule.id,
      actionSide: side,
      indicatorId: rule.indicatorId,
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
