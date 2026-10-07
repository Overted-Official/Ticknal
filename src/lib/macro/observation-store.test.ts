import { describe, expect, it } from 'vitest';

import type {
  MacroObservationCandidate,
  MacroObservationStore,
  StoredMacroObservation,
} from './contracts';
import { persistMacroObservationBatch } from './observation-store';

class MemoryMacroStore implements MacroObservationStore {
  readonly rows: StoredMacroObservation[] = [];

  async transaction<T>(operation: (store: MacroObservationStore) => Promise<T>): Promise<T> {
    return operation(this);
  }

  async findRevision(
    seriesCode: StoredMacroObservation['seriesCode'],
    observationDate: string,
    sourceRevision: string,
  ): Promise<StoredMacroObservation | null> {
    return this.rows.find((row) => row.seriesCode === seriesCode
      && row.observationDate === observationDate
      && row.sourceRevision === sourceRevision) ?? null;
  }

  async findLatest(
    seriesCode: StoredMacroObservation['seriesCode'],
    observationDate: string,
  ): Promise<StoredMacroObservation | null> {
    return this.rows.find((row) => row.seriesCode === seriesCode
      && row.observationDate === observationDate
      && row.isLatest) ?? null;
  }

  async demoteLatest(
    seriesCode: StoredMacroObservation['seriesCode'],
    observationDate: string,
  ): Promise<void> {
    for (const row of this.rows) {
      if (row.seriesCode === seriesCode && row.observationDate === observationDate) {
        row.isLatest = false;
      }
    }
  }

  async insert(observation: StoredMacroObservation): Promise<void> {
    this.rows.push({ ...observation });
  }

  async touchRevision(
    seriesCode: StoredMacroObservation['seriesCode'],
    observationDate: string,
    sourceRevision: string,
    retrievedAt: string,
  ): Promise<void> {
    const row = this.rows.find((candidate) => candidate.seriesCode === seriesCode
      && candidate.observationDate === observationDate
      && candidate.sourceRevision === sourceRevision);
    if (row) row.retrievedAt = retrievedAt;
  }
}

const candidate = (overrides: Partial<MacroObservationCandidate> = {}): MacroObservationCandidate => ({
  seriesCode: 'EG_CPI_HEADLINE_INDEX',
  observationDate: '2026-01-31',
  value: 100,
  unit: 'index',
  publishedAt: '2026-02-10T08:00:00.000Z',
  sourceName: 'CBE',
  sourceUrl: 'https://www.cbe.org.eg/en/economic-research/statistics/inflation-rates',
  ...overrides,
});

describe('macro observation persistence', () => {
  it('accepts only registered finite macro observations', async () => {
    const store = new MemoryMacroStore();

    const report = await persistMacroObservationBatch(store, [
      candidate(),
      candidate({ seriesCode: 'UNKNOWN' as MacroObservationCandidate['seriesCode'] }),
      candidate({ observationDate: '2026-02-28', value: Number.NaN }),
    ], '2026-02-11T00:00:00.000Z');

    expect(report).toEqual({ inserted: 1, revised: 0, unchanged: 0, rejected: 2 });
    expect(store.rows).toHaveLength(1);
  });

  it('does not duplicate an unchanged source revision', async () => {
    const store = new MemoryMacroStore();
    const observation = candidate({ sourceRevision: 'revision-one' });

    await persistMacroObservationBatch(store, [observation], '2026-02-11T00:00:00.000Z');
    const report = await persistMacroObservationBatch(
      store,
      [observation],
      '2026-02-12T00:00:00.000Z',
    );

    expect(report).toEqual({ inserted: 0, revised: 0, unchanged: 1, rejected: 0 });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.retrievedAt).toBe('2026-02-12T00:00:00.000Z');
  });

  it('treats the same source value retrieved at a later time as unchanged', async () => {
    const store = new MemoryMacroStore();
    await persistMacroObservationBatch(store, [candidate()], '2026-02-11T00:00:00.000Z');
    const report = await persistMacroObservationBatch(
      store,
      [candidate({ publishedAt: '2026-02-12T08:00:00.000Z' })],
      '2026-02-12T09:00:00.000Z',
    );
    expect(report).toEqual({ inserted: 0, revised: 0, unchanged: 1, rejected: 0 });
    expect(store.rows).toHaveLength(1);
  });

  it('preserves the old vintage and promotes a changed revision', async () => {
    const store = new MemoryMacroStore();
    await persistMacroObservationBatch(
      store,
      [candidate({ value: 100, sourceRevision: 'original' })],
      '2026-02-11T00:00:00.000Z',
    );

    const report = await persistMacroObservationBatch(
      store,
      [candidate({ value: 101, sourceRevision: 'revised', publishedAt: '2026-03-01T08:00:00.000Z' })],
      '2026-03-01T09:00:00.000Z',
    );

    expect(report).toEqual({ inserted: 0, revised: 1, unchanged: 0, rejected: 0 });
    expect(store.rows).toHaveLength(2);
    expect(store.rows.map((row) => row.isLatest)).toEqual([false, true]);
  });

  it('rejects a missing publication timestamp', async () => {
    const store = new MemoryMacroStore();

    const report = await persistMacroObservationBatch(
      store,
      [candidate({ publishedAt: '' })],
      '2026-02-11T00:00:00.000Z',
    );

    expect(report.rejected).toBe(1);
    expect(store.rows).toHaveLength(0);
  });
});
