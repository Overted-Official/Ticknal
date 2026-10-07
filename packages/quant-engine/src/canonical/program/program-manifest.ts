import { PROGRAM_CATEGORY_ENTRIES } from './categories';
import {
  BACKLOG_STATUSES,
  DATA_REQUIREMENT_CODES,
  DELIVERY_STAGES,
  PROGRAM_STATES,
  PROGRAM_VIEWS,
  type ProgramEntry,
} from './types';

const BACKLOG_ID_PATTERN = /^[A-Z]{3}-\d{3}$/;
const CANONICAL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertMember(value: string, values: readonly string[], label: string): void {
  if (!values.includes(value)) {
    throw new Error(`Unknown ${label}: ${value}`);
  }
}

function freezeEntry(entry: ProgramEntry): ProgramEntry {
  if (!BACKLOG_ID_PATTERN.test(entry.backlogId)) {
    throw new Error(`Invalid backlog ID: ${entry.backlogId}`);
  }
  if (entry.canonicalId !== null && !CANONICAL_ID_PATTERN.test(entry.canonicalId)) {
    throw new Error(`Invalid canonical ID: ${entry.canonicalId}`);
  }

  assertMember(entry.state, PROGRAM_STATES, 'program state');
  assertMember(entry.stage, DELIVERY_STAGES, 'delivery stage');
  assertMember(entry.status, BACKLOG_STATUSES, 'backlog status');
  if (entry.view !== null) assertMember(entry.view, PROGRAM_VIEWS, 'program view');
  for (const requirement of entry.dataRequirements) {
    assertMember(requirement, DATA_REQUIREMENT_CODES, 'data requirement');
  }

  for (const [field, value] of Object.entries({
    category: entry.category,
    name: entry.name,
    explanation: entry.explanation,
    outputsAndParameters: entry.outputsAndParameters,
    assetsAndData: entry.assetsAndData,
  })) {
    if (value.trim().length === 0) throw new Error(`Program entry ${entry.backlogId} has blank ${field}`);
  }

  return Object.freeze({
    ...entry,
    dataRequirements: Object.freeze([...entry.dataRequirements]),
  });
}

export function createProgramManifest(
  categoryEntries: readonly (readonly ProgramEntry[])[],
): readonly ProgramEntry[] {
  const backlogIds = new Set<string>();
  const canonicalIds = new Set<string>();
  const entries: ProgramEntry[] = [];

  for (const category of categoryEntries) {
    for (const candidate of category) {
      const entry = freezeEntry(candidate);
      if (backlogIds.has(entry.backlogId)) {
        throw new Error(`Duplicate backlog ID: ${entry.backlogId}`);
      }
      backlogIds.add(entry.backlogId);

      if (entry.canonicalId !== null) {
        if (canonicalIds.has(entry.canonicalId)) {
          throw new Error(`Duplicate canonical ID: ${entry.canonicalId}`);
        }
        canonicalIds.add(entry.canonicalId);
      }

      entries.push(entry);
    }
  }

  return Object.freeze(entries);
}

export const PROGRAM_MANIFEST = createProgramManifest(PROGRAM_CATEGORY_ENTRIES);

const PROGRAM_ENTRIES_BY_BACKLOG_ID = new Map<string, ProgramEntry>(
  PROGRAM_MANIFEST.map((entry) => [entry.backlogId, entry] as const),
);

export function getProgramEntry(backlogId: string): ProgramEntry | undefined {
  return PROGRAM_ENTRIES_BY_BACKLOG_ID.get(backlogId);
}
