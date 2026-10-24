import { ADVANCED_BLOCK_TEMPLATES, type AdvancedStrategyNode } from '../../../components/platform/strategies/builder/advanced-strategy-model';
import { createAdvancedIndicatorNode, createAdvancedNodeFromTemplate, createMarketInputBundle, getAvailableUpstreamNodes, type MarketInputField } from '../../../components/platform/strategies/builder/advanced-builder-state';
import { addRuleToDraft, removeRuleFromDraft, updateStrategyRule, type StrategyBuilderIndicatorOption, type StrategyDraft, type StrategyRule, type StrategyRuleSide } from '../../../components/platform/strategies/builder/strategy-builder-model';
import type { OptionalStrategyStageId } from '../../../components/platform/strategies/builder/strategy-flow-model';
import { parseSavedStrategy } from '../server/parse-saved-strategy';
import { MAX_ADVANCED_WORKFLOW_NODES } from '../strategy-program';

export interface StrategyWorkspaceSnapshot {
  readonly revision: number;
  readonly mode: 'simple' | 'advanced';
  readonly draft: StrategyDraft;
  readonly nodes: readonly AdvancedStrategyNode[];
  readonly optionalStages: readonly OptionalStrategyStageId[];
}

export type StrategyAction =
  | { readonly type: 'rename_strategy'; readonly name: string }
  | { readonly type: 'add_simple_rule'; readonly side: StrategyRuleSide; readonly indicatorId: string }
  | { readonly type: 'update_simple_rule'; readonly side: StrategyRuleSide; readonly ruleId: string; readonly changes: Partial<Pick<StrategyRule, 'outputKey' | 'period' | 'operator' | 'value' | 'connector'>> }
  | { readonly type: 'remove_simple_rule'; readonly side: StrategyRuleSide; readonly ruleId: string }
  | { readonly type: 'set_mode'; readonly mode: 'advanced' }
  | { readonly type: 'add_indicator'; readonly id: string; readonly indicatorId: string }
  | { readonly type: 'add_node'; readonly id: string; readonly templateId: string }
  | { readonly type: 'add_market_bundle'; readonly id: string; readonly fields: readonly MarketInputField[] }
  | { readonly type: 'connect'; readonly sourceId: string; readonly targetId: string }
  | { readonly type: 'set_parameter'; readonly nodeId: string; readonly key: string; readonly value: string }
  | { readonly type: 'rename_node'; readonly nodeId: string; readonly name: string }
  | { readonly type: 'set_output_name'; readonly nodeId: string; readonly name: string }
  | { readonly type: 'group_nodes'; readonly moduleId: string; readonly name: string; readonly nodeIds: readonly string[] }
  | { readonly type: 'remove_node'; readonly nodeId: string };

export type StrategyActionResult =
  | { readonly status: 'ok'; readonly snapshot: StrategyWorkspaceSnapshot }
  | { readonly status: 'invalid'; readonly error: string };

const NODE_ID = /^[A-Za-z0-9_-]{1,80}$/;
const PARAMETER_KEY = /^[A-Za-z][A-Za-z0-9]{0,79}$/;
const MARKET_FIELDS = new Set(['open', 'high', 'low', 'close', 'volume']);
const JSON_PARAMETERS = new Set(['registers', 'model', 'conditions', 'symbolOverrides', 'alternateSymbols', 'aliases']);
const COMMON_PARAMETERS = new Set(['outputKey', 'period']);
const GATE_PARAMETERS = ['gateMode', 'gateInputId', 'gateOperator', 'gateThreshold', 'gateComparisonMode', 'gateCompareInputId'];
const TEMPLATE_PARAMETERS: Readonly<Record<string, readonly string[]>> = {
  'market-input': ['series', 'field'], parameter: ['value', 'symbolOverrides'],
  'execution-policy': ['fillPolicy', 'shareSizing', 'feeBps', 'slippageBps', 'valuation'],
  'weighted-composite': ['normalization', 'weights'], 'condition-score': ['conditions'],
  'ticker-select': ['defaultSourceId', 'alternateSourceId', 'alternateSymbols'],
  formula: ['aliases', 'registers', 'outputKey'], 'formula-output': ['outputKey'],
  'rbf-model': ['model'], transform: ['method', 'period', 'seedMode', 'lowerBound', 'upperBound'],
  'rolling-statistic': ['operation', 'period', 'minPeriod'], 'math-operation': ['operation'],
  condition: ['operator', 'compareMode', 'compareValue', 'compareInputId', 'connector'],
  'sell-condition': ['operator', 'compareMode', 'compareValue', 'compareInputId', 'connector'],
  'priority-trigger': ['thresholds'], 'position-memory': ['capture', 'update'],
  'rolling-state': ['operation'],
  'dynamic-target': ['multiplier', 'distanceMode', 'targetBase', 'freezeAtEntry', 'requireProfit', ...GATE_PARAMETERS],
  'trailing-exit': ['distance', 'distanceMode', 'volatilityPeriod', 'volatilitySourceId', 'requireProfit', ...GATE_PARAMETERS],
};

const invalid = (error: string): StrategyActionResult => ({ status: 'invalid', error });
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const safeId = (id: unknown): id is string => typeof id === 'string' && NODE_ID.test(id);
const safeName = (name: unknown): name is string => typeof name === 'string' && name.trim().length > 0 && name.length <= 100;
const safeSide = (side: unknown): side is StrategyRuleSide => side === 'buy' || side === 'sell';

export function parseStrategyActions(value: unknown): readonly StrategyAction[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 128) return null;
  for (const action of value) {
    if (!record(action)) return null;
    switch (action.type) {
      case 'rename_strategy': if (!safeName(action.name)) return null; break;
      case 'add_simple_rule': if (!safeSide(action.side) || !safeId(action.indicatorId)) return null; break;
      case 'update_simple_rule': {
        if (!safeSide(action.side) || !safeId(action.ruleId) || !record(action.changes)) return null;
        const allowed = new Set(['outputKey', 'period', 'operator', 'value', 'connector']);
        if (Object.keys(action.changes).length < 1 || Object.entries(action.changes).some(([key, item]) => !allowed.has(key)
          || key === 'outputKey' && !safeId(item) || key === 'period' && (!Number.isSafeInteger(item) || Number(item) < 1 || Number(item) > 1000)
          || key === 'operator' && !['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(String(item))
          || key === 'value' && (typeof item !== 'number' || !Number.isFinite(item))
          || key === 'connector' && !['and', 'or'].includes(String(item)))) return null;
        break;
      }
      case 'remove_simple_rule': if (!safeSide(action.side) || !safeId(action.ruleId)) return null; break;
      case 'set_mode': if (action.mode !== 'advanced') return null; break;
      case 'add_indicator': if (!safeId(action.id) || !safeId(action.indicatorId)) return null; break;
      case 'add_node': if (!safeId(action.id) || !safeId(action.templateId)) return null; break;
      case 'add_market_bundle': if (!safeId(action.id) || !Array.isArray(action.fields) || action.fields.length < 2 || action.fields.length > 5 || action.fields.some((field: unknown) => typeof field !== 'string' || !MARKET_FIELDS.has(field))) return null; break;
      case 'connect': if (!safeId(action.sourceId) || !safeId(action.targetId)) return null; break;
      case 'set_parameter': if (!safeId(action.nodeId) || typeof action.key !== 'string' || !PARAMETER_KEY.test(action.key) || typeof action.value !== 'string' || action.value.length > 52_000) return null; break;
      case 'rename_node': case 'set_output_name': if (!safeId(action.nodeId) || !safeName(action.name)) return null; break;
      case 'group_nodes': if (!safeId(action.moduleId) || !safeName(action.name) || !Array.isArray(action.nodeIds) || action.nodeIds.length < 2 || action.nodeIds.length > MAX_ADVANCED_WORKFLOW_NODES || action.nodeIds.some((id: unknown) => !safeId(id))) return null; break;
      case 'remove_node': if (!safeId(action.nodeId)) return null; break;
      default: return null;
    }
  }
  return value as StrategyAction[];
}

export function canEditStrategySnapshot(snapshot: StrategyWorkspaceSnapshot): boolean {
  if (!record(snapshot) || !record(snapshot.draft) || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.optionalStages)
    || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || snapshot.mode !== 'simple' && snapshot.mode !== 'advanced') return false;
  if (snapshot.nodes.some((node) => node.protected && node.id !== 'custom-market-data')) return false;
  return parseSavedStrategy({ id: snapshot.draft.id, name: snapshot.draft.name, mode: snapshot.mode,
    draft: snapshot.draft, nodes: snapshot.nodes, optionalStages: snapshot.optionalStages, selectedSymbols: [], notificationsEnabled: false }).success;
}

function maySetParameter(node: AdvancedStrategyNode, key: string, catalog: readonly StrategyBuilderIndicatorOption[]): boolean {
  if (!PARAMETER_KEY.test(key) || key === 'sourceRuleId') return false;
  if (node.templateId === 'indicator') {
    const definition = catalog.find((item) => item.id === node.parameters?.indicatorId);
    return COMMON_PARAMETERS.has(key) || Boolean(definition && key in definition.defaultParameters);
  }
  return (TEMPLATE_PARAMETERS[node.templateId ?? ''] ?? []).includes(key);
}

export function applyStrategyActions(
  snapshot: StrategyWorkspaceSnapshot,
  actions: readonly StrategyAction[],
  catalog: readonly StrategyBuilderIndicatorOption[],
): StrategyActionResult {
  if (!canEditStrategySnapshot(snapshot)) return invalid('Only a valid, user-owned draft can be edited.');
  if (!parseStrategyActions(actions)) return invalid('The edit contains malformed or unsupported actions.');
  let draft = snapshot.draft;
  let nodes = [...snapshot.nodes];
  let mode = snapshot.mode;
  let optionalStages = [...snapshot.optionalStages];
  const byId = (id: string) => nodes.find((node) => node.id === id);
  for (const action of actions) {
    if (action.type === 'rename_strategy') {
      if (!safeName(action.name)) return invalid('Enter a strategy name up to 100 characters.');
      draft = { ...draft, name: action.name.trim() };
    } else if (action.type === 'add_simple_rule') {
      if (mode !== 'simple' || !['buy', 'sell'].includes(action.side)) return invalid('Simple rules require simple mode.');
      const indicator = catalog.find((item) => item.id === action.indicatorId && item.available);
      if (!indicator) return invalid('The indicator is not in the executable catalog.');
      const changed = addRuleToDraft(draft, action.side, indicator);
      if (changed === draft) return invalid('The indicator is already in this rule stage.');
      draft = changed;
    } else if (action.type === 'update_simple_rule') {
      if (mode !== 'simple' || !['buy', 'sell'].includes(action.side) || !draft[action.side === 'buy' ? 'buyRules' : 'sellRules'].some((rule) => rule.id === action.ruleId)) return invalid('Rule not found.');
      draft = updateStrategyRule(draft, action.side, action.ruleId, action.changes);
    } else if (action.type === 'remove_simple_rule') {
      if (mode !== 'simple' || !['buy', 'sell'].includes(action.side) || !draft[action.side === 'buy' ? 'buyRules' : 'sellRules'].some((rule) => rule.id === action.ruleId)) return invalid('Rule not found.');
      draft = removeRuleFromDraft(draft, action.side, action.ruleId);
    } else if (action.type === 'set_mode') {
      if (action.mode !== 'advanced') return invalid('The assistant cannot discard advanced cards by switching to simple mode.');
      if (mode === 'simple' && (draft.buyRules.length || draft.sellRules.length)) return invalid('Switch to advanced mode in Studio before using advanced actions on existing simple rules.');
      mode = 'advanced';
    } else if (action.type === 'add_indicator' || action.type === 'add_node' || action.type === 'add_market_bundle') {
      if (mode !== 'advanced' || !safeId(action.id) || byId(action.id) || nodes.some((node) => node.moduleId === action.id)) return invalid('Use a unique card ID in advanced mode.');
      if (action.type === 'add_indicator') {
        const indicator = catalog.find((item) => item.id === action.indicatorId && item.available);
        if (!indicator) return invalid('The indicator is not in the executable catalog.');
        nodes.push(createAdvancedIndicatorNode(indicator, action.id));
      } else if (action.type === 'add_market_bundle') {
        if (!Array.isArray(action.fields) || action.fields.length < 2 || action.fields.some((field: MarketInputField) => !MARKET_FIELDS.has(field))) return invalid('Choose at least two OHLCV fields.');
        nodes.push(...createMarketInputBundle(action.fields, action.id));
      } else {
        const template = ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === action.templateId && item.id !== 'indicator');
        if (!template) return invalid('The card template is not in the public Studio library.');
        nodes.push(createAdvancedNodeFromTemplate(template, action.id));
        if (template.stage === 'state' && !optionalStages.includes('position')) optionalStages.push('position');
        if (template.stage === 'signal' && !optionalStages.includes('calculations')) optionalStages.push('calculations');
      }
      if (nodes.length > MAX_ADVANCED_WORKFLOW_NODES) return invalid('The strategy has too many cards.');
    } else if (action.type === 'connect') {
      const target = byId(action.targetId);
      if (!target || !byId(action.sourceId) || target.protected || !getAvailableUpstreamNodes(nodes, target.id).some((node) => node.id === action.sourceId)) return invalid('Cards can only connect to available upstream inputs.');
      if ((target.connections ?? []).includes(action.sourceId)) return invalid('The cards are already connected.');
      nodes = nodes.map((node) => node.id === target.id ? { ...node, connections: [...(node.connections ?? []), action.sourceId] } : node);
    } else if (action.type === 'set_parameter') {
      const node = byId(action.nodeId);
      if (!node || node.protected || !maySetParameter(node, action.key, catalog) || typeof action.value !== 'string' || action.value.length > (JSON_PARAMETERS.has(action.key) ? 52_000 : 200)) return invalid('This card setting is not editable.');
      nodes = nodes.map((item) => item.id === node.id ? { ...item, parameters: { ...item.parameters, [action.key]: action.value } } : item);
    } else if (action.type === 'rename_node' || action.type === 'set_output_name') {
      const node = byId(action.nodeId);
      if (!node || node.protected || !safeName(action.name)) return invalid('The card name is not editable.');
      nodes = nodes.map((item) => item.id === node.id ? { ...item, [action.type === 'rename_node' ? 'customName' : 'outputName']: action.name.trim() } : item);
    } else if (action.type === 'group_nodes') {
      if (!safeId(action.moduleId) || !safeName(action.name) || !Array.isArray(action.nodeIds) || action.nodeIds.length < 2 || nodes.some((node) => node.moduleId === action.moduleId)) return invalid('A group needs a unique ID and at least two cards.');
      const members = nodes.filter((node) => action.nodeIds.includes(node.id));
      if (members.length !== new Set(action.nodeIds).size || members.some((node) => node.protected) || new Set(members.map((node) => node.stage)).size !== 1) return invalid('Group only editable cards from one stage.');
      nodes = nodes.map((node) => action.nodeIds.includes(node.id) ? { ...node, moduleId: action.moduleId, moduleName: action.name.trim() } : node);
    } else if (action.type === 'remove_node') {
      const node = byId(action.nodeId);
      if (!node || node.protected) return invalid('This card cannot be removed.');
      nodes = nodes.filter((item) => item.id !== action.nodeId).map((item) => ({ ...item, connections: item.connections?.filter((id) => id !== action.nodeId) }));
    } else {
      return invalid('Unknown strategy action.');
    }
  }
  const next = { revision: snapshot.revision + 1, draft, nodes, mode, optionalStages };
  return canEditStrategySnapshot(next) ? { status: 'ok', snapshot: next } : invalid('The edited workflow exceeds Studio limits or contains invalid settings.');
}
