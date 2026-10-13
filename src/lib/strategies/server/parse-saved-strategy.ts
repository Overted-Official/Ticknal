import type { AdvancedStrategyNode } from '../../../components/platform/strategies/builder/advanced-strategy-model';
import type { StrategyDraft } from '../../../components/platform/strategies/builder/strategy-builder-model';
import type { OptionalStrategyStageId } from '../../../components/platform/strategies/builder/strategy-flow-model';
import { normalizeLiveTicker } from '../../indicators/server/types';

export interface SavedStrategyRecord {
  readonly id: string;
  readonly name: string;
  readonly mode: 'simple' | 'advanced';
  readonly draft: StrategyDraft;
  readonly nodes: readonly AdvancedStrategyNode[];
  readonly optionalStages?: readonly OptionalStrategyStageId[];
  readonly selectedSymbols?: readonly string[];
}

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const short = (value: unknown, limit = 100): value is string => typeof value === 'string' && value.length > 0 && value.length <= limit;
const localized = (value: unknown): boolean => record(value) && short(value.en, 500) && short(value.ar, 500);

export function parseSelectedSymbols(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 400) return null;
  const symbols = value.map((item) => typeof item === 'string' ? normalizeLiveTicker(item) : null);
  return symbols.some((symbol) => symbol === null) ? null : [...new Set(symbols as string[])];
}

export function parseSavedStrategy(value: unknown): { readonly success: true; readonly value: SavedStrategyRecord } | { readonly success: false; readonly error: string } {
  const invalid = { success: false as const, error: 'Invalid strategy snapshot.' };
  if (!record(value) || !short(value.id) || !/^custom-[A-Za-z0-9-]{1,80}$/.test(value.id)
    || !short(value.name, 100) || !value.name.trim() || !['simple', 'advanced'].includes(String(value.mode))
    || !record(value.draft) || value.draft.id !== value.id || !short(value.draft.name, 100)
    || !Array.isArray(value.draft.buyRules) || !Array.isArray(value.draft.sellRules)
    || value.draft.buyRules.length > 16 || value.draft.sellRules.length > 16
    || !Array.isArray(value.nodes) || value.nodes.length > 48) return invalid;
  const validRule = (rule: unknown) => record(rule) && short(rule.id) && short(rule.indicatorId)
    && Number.isSafeInteger(rule.period) && Number(rule.period) > 0 && Number(rule.period) <= 1000
    && ['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(String(rule.operator))
    && typeof rule.value === 'number' && Number.isFinite(rule.value)
    && ['and', 'or'].includes(String(rule.connector))
    && (rule.outputKey === undefined || short(rule.outputKey));
  if (![...value.draft.buyRules, ...value.draft.sellRules].every(validRule)) return invalid;
  const ids = new Set<string>();
  for (const node of value.nodes) {
    if (!record(node) || !short(node.id) || ids.has(node.id)
      || !['inputs', 'signal', 'entry', 'state', 'exit', 'output'].includes(String(node.stage))
      || !['input', 'calculation', 'decision', 'state', 'exit', 'output'].includes(String(node.kind))
      || !localized(node.title) || !localized(node.summary)
      || (node.templateId !== undefined && !short(node.templateId))
      || (node.customName !== undefined && (typeof node.customName !== 'string' || node.customName.length > 100))
      || (node.outputName !== undefined && (typeof node.outputName !== 'string' || node.outputName.length > 100))
      || (node.parameters !== undefined && (!record(node.parameters) || Object.entries(node.parameters).length > 32
        || !Object.entries(node.parameters).every(([key, entry]) => key.length <= 100 && typeof entry === 'string' && entry.length <= 200)))
      || (node.connections !== undefined && (!Array.isArray(node.connections) || node.connections.length > 16 || !node.connections.every((id: unknown) => short(id))))) return invalid;
    ids.add(node.id);
  }
  if (value.nodes.some((node: { connections?: string[] }) => node.connections?.some((id) => !ids.has(id)))) return invalid;
  const optionalStages = value.optionalStages === undefined ? [] : value.optionalStages;
  if (!Array.isArray(optionalStages) || optionalStages.length > 2 || !optionalStages.every((stage) => stage === 'calculations' || stage === 'position')) return invalid;
  const selectedSymbols = value.selectedSymbols === undefined ? [] : parseSelectedSymbols(value.selectedSymbols);
  if (selectedSymbols === null) return invalid;
  return { success: true, value: { id: value.id, name: value.name.trim(), mode: value.mode as 'simple' | 'advanced', draft: value.draft as unknown as StrategyDraft, nodes: value.nodes as AdvancedStrategyNode[], optionalStages: optionalStages as OptionalStrategyStageId[], selectedSymbols } };
}
