import { getIndicatorCatalogEntry } from './catalog';
import type { CanonicalIndicatorSelection } from './types';

export type IndicatorSelectionIssueCode =
  | 'PAYLOAD_INVALID'
  | 'SCHEMA_VERSION_UNSUPPORTED'
  | 'ITEM_INVALID'
  | 'DEFINITION_NOT_SELECTABLE'
  | 'FORMULA_VERSION_MISMATCH'
  | 'PARAMETER_INVALID'
  | 'INSTANCE_ID_DUPLICATE';

export interface IndicatorSelectionIssue {
  readonly code: IndicatorSelectionIssueCode;
  readonly itemIndex?: number;
  readonly instanceId?: string;
}

export interface ParsedIndicatorQuery {
  readonly selections: readonly CanonicalIndicatorSelection[];
  readonly legacyIds: readonly string[];
  readonly issues: readonly IndicatorSelectionIssue[];
}

type SelectableDefinitions = ReadonlySet<string> | readonly string[];

function selectableSet(selectable: SelectableDefinitions): ReadonlySet<string> {
  return selectable instanceof Set ? selectable : new Set(selectable);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSelection(
  value: unknown,
  selectable: ReadonlySet<string>,
  itemIndex: number,
): { selection?: CanonicalIndicatorSelection; issue?: IndicatorSelectionIssue } {
  if (!isRecord(value)
    || typeof value.instanceId !== 'string'
    || typeof value.definitionId !== 'string'
    || !isRecord(value.parameters)
    || !Array.isArray(value.visibleOutputs)
    || !isRecord(value.placementOverrides)) {
    return { issue: { code: 'ITEM_INVALID', itemIndex } };
  }

  const entry = getIndicatorCatalogEntry(value.definitionId);
  if (!entry || !selectable.has(entry.id)) {
    return {
      issue: {
        code: 'DEFINITION_NOT_SELECTABLE',
        itemIndex,
        instanceId: value.instanceId,
      },
    };
  }
  if (value.formulaVersion !== entry.formulaVersion) {
    return {
      issue: {
        code: 'FORMULA_VERSION_MISMATCH',
        itemIndex,
        instanceId: value.instanceId,
      },
    };
  }

  const parsedParameters = entry.definition.parseParameters(value.parameters);
  if (!parsedParameters.success) {
    return {
      issue: {
        code: 'PARAMETER_INVALID',
        itemIndex,
        instanceId: value.instanceId,
      },
    };
  }

  const outputKeys = new Set(entry.outputs.map((output) => output.key));
  const visibleOutputs = value.visibleOutputs.filter(
    (outputKey): outputKey is string => typeof outputKey === 'string' && outputKeys.has(outputKey),
  );
  const descriptorByOutput = new Map(entry.visuals.map((visual) => [visual.outputKey, visual]));
  const placementOverrides = Object.fromEntries(
    Object.entries(value.placementOverrides).filter(([outputKey, surface]) => {
      const descriptor = descriptorByOutput.get(outputKey);
      return (surface === 'overlay' || surface === 'pane')
        && descriptor?.allowedSurfaces?.includes(surface);
    }),
  ) as Readonly<Record<string, 'overlay' | 'pane'>>;

  return {
    selection: Object.freeze({
      instanceId: value.instanceId,
      definitionId: entry.id,
      formulaVersion: entry.formulaVersion,
      parameters: Object.freeze({ ...parsedParameters.value }),
      visibleOutputs: Object.freeze([...new Set(visibleOutputs)]),
      placementOverrides: Object.freeze(placementOverrides),
    }),
  };
}

export function parseIndicatorQuery(
  searchParams: URLSearchParams,
  selectableDefinitions: SelectableDefinitions,
): ParsedIndicatorQuery {
  const selectable = selectableSet(selectableDefinitions);
  const selections: CanonicalIndicatorSelection[] = [];
  const issues: IndicatorSelectionIssue[] = [];
  const instanceIds = new Set<string>();

  const payloadText = searchParams.get('ci');
  if (payloadText) {
    try {
      const payload: unknown = JSON.parse(payloadText);
      if (!isRecord(payload) || payload.schemaVersion !== 1 || !Array.isArray(payload.items)) {
        issues.push({
          code: isRecord(payload) && payload.schemaVersion !== 1
            ? 'SCHEMA_VERSION_UNSUPPORTED'
            : 'PAYLOAD_INVALID',
        });
      } else {
        payload.items.forEach((item, itemIndex) => {
          const normalized = normalizeSelection(item, selectable, itemIndex);
          if (normalized.issue) {
            issues.push(normalized.issue);
            return;
          }
          const selection = normalized.selection!;
          if (instanceIds.has(selection.instanceId)) {
            issues.push({
              code: 'INSTANCE_ID_DUPLICATE',
              itemIndex,
              instanceId: selection.instanceId,
            });
            return;
          }
          instanceIds.add(selection.instanceId);
          selections.push(selection);
        });
      }
    } catch {
      issues.push({ code: 'PAYLOAD_INVALID' });
    }
  }

  const legacyIds: string[] = [];
  for (const id of (searchParams.get('indicators') ?? '').split(',').filter(Boolean)) {
    const entry = getIndicatorCatalogEntry(id);
    if (entry && selectable.has(entry.id)) {
      const migrated = createIndicatorSelection(entry.id, selections, selectable);
      selections.push(migrated);
      instanceIds.add(migrated.instanceId);
    } else {
      legacyIds.push(id);
    }
  }

  return Object.freeze({
    selections: Object.freeze(selections),
    legacyIds: Object.freeze(legacyIds),
    issues: Object.freeze(issues),
  });
}

export function writeIndicatorQuery(
  searchParams: URLSearchParams,
  selections: readonly CanonicalIndicatorSelection[],
  legacyIds: readonly string[],
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (selections.length > 0) {
    next.set('ci', JSON.stringify({ schemaVersion: 1, items: selections }));
  } else {
    next.delete('ci');
  }
  if (legacyIds.length > 0) next.set('indicators', legacyIds.join(','));
  else next.delete('indicators');
  return next;
}

export function createIndicatorSelection(
  definitionId: string,
  existingSelections: readonly CanonicalIndicatorSelection[],
  selectableDefinitions: SelectableDefinitions,
): CanonicalIndicatorSelection {
  const selectable = selectableSet(selectableDefinitions);
  const entry = getIndicatorCatalogEntry(definitionId);
  if (!entry || !selectable.has(entry.id)) {
    throw new RangeError(`Canonical indicator is not selectable: ${definitionId}`);
  }

  const prefix = `${entry.id}:`;
  const nextNumber = existingSelections.reduce((maximum, selection) => {
    if (!selection.instanceId.startsWith(prefix)) return maximum;
    const parsed = Number(selection.instanceId.slice(prefix.length));
    return Number.isInteger(parsed) ? Math.max(maximum, parsed) : maximum;
  }, 0) + 1;

  return Object.freeze({
    instanceId: `${entry.id}:${nextNumber}`,
    definitionId: entry.id,
    formulaVersion: entry.formulaVersion,
    parameters: Object.freeze({ ...entry.defaultParameters }),
    visibleOutputs: Object.freeze(entry.outputs.map((output) => output.key)),
    placementOverrides: Object.freeze({}),
  });
}

export function updateIndicatorSelection(
  selections: readonly CanonicalIndicatorSelection[],
  instanceId: string,
  patch: Partial<Pick<CanonicalIndicatorSelection, 'parameters' | 'visibleOutputs' | 'placementOverrides'>>,
  selectableDefinitions: SelectableDefinitions,
): readonly CanonicalIndicatorSelection[] {
  const index = selections.findIndex((selection) => selection.instanceId === instanceId);
  if (index < 0) return selections;
  const candidate = { ...selections[index], ...patch };
  const normalized = normalizeSelection(candidate, selectableSet(selectableDefinitions), index);
  if (!normalized.selection) {
    throw new RangeError(`Invalid canonical indicator update: ${normalized.issue?.code}`);
  }
  return Object.freeze(selections.map((selection, candidateIndex) =>
    candidateIndex === index ? normalized.selection! : selection,
  ));
}

export function removeIndicatorSelection(
  selections: readonly CanonicalIndicatorSelection[],
  instanceId: string,
): readonly CanonicalIndicatorSelection[] {
  return Object.freeze(selections.filter((selection) => selection.instanceId !== instanceId));
}

export function reorderIndicatorSelection(
  selections: readonly CanonicalIndicatorSelection[],
  instanceId: string,
  targetIndex: number,
): readonly CanonicalIndicatorSelection[] {
  const currentIndex = selections.findIndex((selection) => selection.instanceId === instanceId);
  if (currentIndex < 0) return selections;
  const next = [...selections];
  const [selection] = next.splice(currentIndex, 1);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, selection);
  return Object.freeze(next);
}
