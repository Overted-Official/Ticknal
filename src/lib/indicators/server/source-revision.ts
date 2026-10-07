import { createHash } from 'node:crypto';

interface SourceRevisionInput {
  readonly sourceId: string;
  readonly observations: readonly unknown[];
  readonly adjustments: readonly unknown[];
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

export function createSourceRevision(input: SourceRevisionInput): string {
  const payload = JSON.stringify(canonicalize(input));
  return `sha256:${createHash('sha256').update(payload).digest('hex')}`;
}
