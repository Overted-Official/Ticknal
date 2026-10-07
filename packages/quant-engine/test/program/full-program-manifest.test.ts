import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PROGRAM_MANIFEST, getProgramEntry } from '../../src/canonical/program/program-manifest';
import type { DataRequirementCode, ProgramEntry } from '../../src/canonical/program/types';

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const BACKLOG_PATH = resolve(
  TEST_DIRECTORY,
  '../../../../docs/product/indicator-library-backlog.md',
);
const DATA_ORDER = ['P', 'V', 'T', 'B', 'BM', 'OB', 'FND', 'M'] as const;

function dataRequirements(value: string): readonly DataRequirementCode[] {
  const found = new Set<DataRequirementCode>();
  let remainder = value;
  const combined = [
    ['PVT', ['P', 'V', 'T']],
    ['BVT', ['B', 'V', 'T']],
    ['BVM', ['B', 'V', 'M']],
    ['PV', ['P', 'V']],
    ['BV', ['B', 'V']],
  ] as const;

  for (const [token, expanded] of combined) {
    if (new RegExp(`\\b${token}\\b`).test(remainder)) {
      expanded.forEach((code) => found.add(code));
      remainder = remainder.replace(new RegExp(`\\b${token}\\b`, 'g'), '');
    }
  }
  for (const code of DATA_ORDER) {
    if (new RegExp(`\\b${code}\\b`).test(remainder)) found.add(code);
  }
  return DATA_ORDER.filter((code) => found.has(code));
}

function markdownEntries(): readonly Omit<ProgramEntry, 'category' | 'canonicalId' | 'state'>[] {
  return readFileSync(BACKLOG_PATH, 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^\| [A-Z]{3}-\d{3} \|/.test(line))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()))
    .map((cells) => {
      const hasView = cells.length === 7;
      const [backlogId, name, explanation, outputsAndParameters] = cells;
      const view = hasView ? cells[4] : null;
      const assetsAndData = cells[hasView ? 5 : 4];
      const stageStatus = cells[hasView ? 6 : 5];
      const match = /^(T0|T1|T2|T3|R)\s+(.+)$/.exec(stageStatus);
      if (!match) throw new Error(`Malformed stage/status for ${backlogId}`);

      return {
        backlogId,
        name,
        explanation,
        outputsAndParameters,
        view,
        assetsAndData,
        dataRequirements: dataRequirements(assetsAndData),
        stage: match[1],
        status: match[2],
      } as Omit<ProgramEntry, 'category' | 'canonicalId' | 'state'>;
    });
}

function comparable(entry: ProgramEntry) {
  const { category: _category, canonicalId: _canonicalId, state: _state, ...backlogFields } =
    entry;
  void _category;
  void _canonicalId;
  void _state;
  return backlogFields;
}

describe('complete indicator program manifest', () => {
  it('contains every one of the 411 Markdown backlog rows exactly once and in order', () => {
    const expected = markdownEntries();

    expect(expected).toHaveLength(411);
    expect(PROGRAM_MANIFEST).toHaveLength(411);
    expect(PROGRAM_MANIFEST.map(comparable)).toEqual(expected);
    expect(new Set(PROGRAM_MANIFEST.map((entry) => entry.backlogId)).size).toBe(411);
  });

  it('has the locked category-prefix counts', () => {
    const counts = Object.fromEntries(
      [...new Set(PROGRAM_MANIFEST.map((entry) => entry.backlogId.slice(0, 3)))]
        .sort()
        .map((prefix) => [
          prefix,
          PROGRAM_MANIFEST.filter((entry) => entry.backlogId.startsWith(`${prefix}-`)).length,
        ]),
    );

    expect(counts).toEqual({
      BRD: 25,
      CYC: 24,
      EGY: 36,
      FLW: 38,
      MOM: 40,
      PAT: 20,
      PRC: 20,
      QNT: 38,
      REL: 20,
      RSK: 36,
      STR: 32,
      TKL: 10,
      TRD: 40,
      VOL: 32,
    });
  });

  it('assigns a unique canonical ID to every implemented backlog entry', () => {
    const canonicalEntries = PROGRAM_MANIFEST.filter((entry) => entry.canonicalId !== null);
    const canonicalIds = canonicalEntries.map((entry) => entry.canonicalId);

    expect(canonicalEntries).toHaveLength(411);
    expect(canonicalEntries.every((entry) => entry.state === 'integrated')).toBe(true);
    expect(new Set(canonicalIds).size).toBe(411);
  });

  it('provides immutable lookup without parsing Markdown at runtime', () => {
    expect(Object.isFrozen(PROGRAM_MANIFEST)).toBe(true);
    expect(getProgramEntry('EGY-001')).toBe(
      PROGRAM_MANIFEST.find((entry) => entry.backlogId === 'EGY-001'),
    );
    expect(getProgramEntry('UNKNOWN-999')).toBeUndefined();
  });
});
