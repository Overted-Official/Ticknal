import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CYCLES_PROGRAM_ENTRIES,
  FIRST_PROGRAM_CATEGORY_ENTRIES,
  MARKET_STRUCTURE_PROGRAM_ENTRIES,
  MOMENTUM_PROGRAM_ENTRIES,
  PRICE_RETURN_PROGRAM_ENTRIES,
  TREND_PROGRAM_ENTRIES,
  VOLATILITY_PROGRAM_ENTRIES,
  VOLUME_FLOW_PROGRAM_ENTRIES,
} from '../../src/canonical/program/categories';
import type { DataRequirementCode, ProgramEntry } from '../../src/canonical/program/types';

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const BACKLOG_PATH = resolve(
  TEST_DIRECTORY,
  '../../../../docs/product/indicator-library-backlog.md',
);

const CATEGORY_SPECS = [
  { prefix: 'PRC', count: 20, entries: PRICE_RETURN_PROGRAM_ENTRIES },
  { prefix: 'TRD', count: 40, entries: TREND_PROGRAM_ENTRIES },
  { prefix: 'MOM', count: 40, entries: MOMENTUM_PROGRAM_ENTRIES },
  { prefix: 'VOL', count: 32, entries: VOLATILITY_PROGRAM_ENTRIES },
  { prefix: 'FLW', count: 38, entries: VOLUME_FLOW_PROGRAM_ENTRIES },
  { prefix: 'STR', count: 32, entries: MARKET_STRUCTURE_PROGRAM_ENTRIES },
  { prefix: 'CYC', count: 24, entries: CYCLES_PROGRAM_ENTRIES },
] as const;

function dataRequirements(value: string): readonly DataRequirementCode[] {
  const codes = new Set<DataRequirementCode>();
  const dataOrder = ['P', 'V', 'T', 'B', 'BM', 'OB', 'FND', 'M'] as const;
  const combined = [
    ['PVT', ['P', 'V', 'T']],
    ['BVT', ['B', 'V', 'T']],
    ['BVM', ['B', 'V', 'M']],
    ['PV', ['P', 'V']],
    ['BV', ['B', 'V']],
  ] as const;

  let remainder = value;
  for (const [token, expanded] of combined) {
    if (new RegExp(`\\b${token}\\b`).test(remainder)) {
      expanded.forEach((code) => codes.add(code));
      remainder = remainder.replace(new RegExp(`\\b${token}\\b`, 'g'), '');
    }
  }

  for (const code of dataOrder) {
    if (new RegExp(`\\b${code}\\b`).test(remainder)) codes.add(code);
  }

  return dataOrder.filter((code) => codes.has(code));
}

function backlogRows(): readonly ProgramEntry[] {
  const acceptedPrefixes = new Set<string>(CATEGORY_SPECS.map((spec) => spec.prefix));

  return readFileSync(BACKLOG_PATH, 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^\| [A-Z]{3}-\d{3} \|/.test(line))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()))
    .filter(([backlogId]) => acceptedPrefixes.has(backlogId.slice(0, 3)))
    .map((cells) => {
      const [backlogId, name, explanation, outputsAndParameters, view, assetsAndData, stageStatus] =
        cells;
      const match = /^(T0|T1|T2|T3|R)\s+(.+)$/.exec(stageStatus);
      if (!match) throw new Error(`Malformed stage/status for ${backlogId}`);

      return {
        backlogId,
        canonicalId: null,
        category: 'backlog-test',
        name,
        explanation,
        outputsAndParameters,
        view,
        assetsAndData,
        dataRequirements: dataRequirements(assetsAndData),
        stage: match[1],
        status: match[2],
        state: 'unimplemented',
      } as ProgramEntry;
    });
}

function comparable(entry: ProgramEntry) {
  return {
    backlogId: entry.backlogId,
    name: entry.name,
    explanation: entry.explanation,
    outputsAndParameters: entry.outputsAndParameters,
    view: entry.view,
    assetsAndData: entry.assetsAndData,
    dataRequirements: entry.dataRequirements,
    stage: entry.stage,
    status: entry.status,
  };
}

describe('first seven program category fragments', () => {
  it('matches the approved backlog rows exactly and in order', () => {
    const expectedRows = backlogRows();
    const actualRows = FIRST_PROGRAM_CATEGORY_ENTRIES.flat();

    expect(actualRows).toHaveLength(226);
    expect(actualRows.map(comparable)).toEqual(expectedRows.map(comparable));
  });

  it.each(CATEGORY_SPECS)('$prefix contains exactly $count immutable entries', (spec) => {
    expect(spec.entries).toHaveLength(spec.count);
    expect(Object.isFrozen(spec.entries)).toBe(true);
    expect(spec.entries.every((entry) => Object.isFrozen(entry))).toBe(true);
    expect(spec.entries.every((entry) => entry.backlogId.startsWith(`${spec.prefix}-`))).toBe(
      true,
    );
  });

  it('assigns reviewed canonical IDs only to the 20 PRC entries', () => {
    expect(PRICE_RETURN_PROGRAM_ENTRIES.every((entry) => entry.canonicalId !== null)).toBe(true);
    expect(PRICE_RETURN_PROGRAM_ENTRIES.every((entry) => entry.state === 'integrated')).toBe(
      true,
    );

    const laterCategories = FIRST_PROGRAM_CATEGORY_ENTRIES.slice(1).flat();
    expect(laterCategories.every((entry) => entry.canonicalId === null)).toBe(true);
    expect(laterCategories.every((entry) => entry.state === 'unimplemented')).toBe(true);
  });
});
