import { describe, expect, it } from 'vitest';

import {
  BACKLOG_STATUSES,
  DATA_REQUIREMENT_CODES,
  DELIVERY_STAGES,
  PROGRAM_STATES,
  PROGRAM_VIEWS,
  type ProgramEntry,
} from '../../src/canonical/program/types';
import { createProgramManifest } from '../../src/canonical/program/program-manifest';

function entry(overrides: Partial<ProgramEntry> = {}): ProgramEntry {
  return {
    backlogId: 'PRC-001',
    canonicalId: null,
    category: 'price-return',
    name: 'Close price',
    explanation: 'The final traded price of each bar.',
    outputsAndParameters: 'close',
    view: 'Overlay',
    assetsAndData: 'All, P',
    dataRequirements: ['P'],
    stage: 'T1',
    status: 'New primitive',
    state: 'unimplemented',
    ...overrides,
  };
}

describe('program manifest schema', () => {
  it('accepts exactly the locked program states and delivery stages', () => {
    expect(PROGRAM_STATES).toEqual([
      'unimplemented',
      'formula-review',
      'implementation',
      'data-gated',
      'verified',
      'integrated',
      'retired',
    ]);
    expect(DELIVERY_STAGES).toEqual(['T0', 'T1', 'T2', 'T3', 'R']);

    for (const state of PROGRAM_STATES) {
      for (const stage of DELIVERY_STAGES) {
        expect(() => createProgramManifest([[entry({ state, stage })]])).not.toThrow();
      }
    }
  });

  it('publishes only known backlog data, view, and status values', () => {
    expect(DATA_REQUIREMENT_CODES).toEqual(['P', 'V', 'T', 'B', 'BM', 'OB', 'FND', 'M']);
    expect(PROGRAM_VIEWS).toEqual(['Overlay', 'Pane', 'Market', 'Card', 'Pane or Overlay']);
    expect(BACKLOG_STATUSES).toContain('New');
    expect(BACKLOG_STATUSES).toContain('Research');

    expect(() =>
      createProgramManifest([
        [entry({ dataRequirements: ['UNKNOWN' as never] })],
      ]),
    ).toThrow(/data requirement/i);
    expect(() =>
      createProgramManifest([[entry({ view: 'Grid' as never })]]),
    ).toThrow(/view/i);
    expect(() =>
      createProgramManifest([[entry({ status: 'Maybe' as never })]]),
    ).toThrow(/status/i);
  });

  it('rejects malformed and duplicate backlog IDs', () => {
    expect(() =>
      createProgramManifest([[entry({ backlogId: 'price-1' as never })]]),
    ).toThrow(/backlog ID/i);
    expect(() =>
      createProgramManifest([[entry(), entry({ name: 'Duplicate row' })]]),
    ).toThrow(/duplicate backlog ID/i);
  });

  it('rejects duplicate non-null canonical IDs while allowing pending null IDs', () => {
    expect(() =>
      createProgramManifest([
        [
          entry({ canonicalId: 'close-price' }),
          entry({ backlogId: 'PRC-002', canonicalId: 'close-price' }),
        ],
      ]),
    ).toThrow(/duplicate canonical ID/i);

    const manifest = createProgramManifest([
      [entry(), entry({ backlogId: 'PRC-002', name: 'Open price' })],
    ]);
    expect(manifest).toHaveLength(2);
  });

  it('returns immutable manifest entries and nested requirement lists', () => {
    const manifest = createProgramManifest([[entry()]]);

    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest[0])).toBe(true);
    expect(Object.isFrozen(manifest[0].dataRequirements)).toBe(true);
  });
});
