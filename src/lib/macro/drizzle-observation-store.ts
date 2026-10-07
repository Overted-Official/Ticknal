import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { macroObservations } from '@/db/schema';

import type { MacroObservationStore, MacroSeriesCode, StoredMacroObservation } from './contracts';

type DatabaseExecutor = typeof db;

function toStored(row: typeof macroObservations.$inferSelect): StoredMacroObservation {
  return {
    seriesCode: row.seriesCode as MacroSeriesCode,
    observationDate: row.observationDate,
    value: Number(row.value),
    unit: row.unit,
    publishedAt: row.publishedAt.toISOString(),
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    sourceRevision: row.sourceRevision,
    isLatest: row.isLatest,
    metadata: row.metadata ?? undefined,
    retrievedAt: row.retrievedAt.toISOString(),
  };
}

function createStore(executor: DatabaseExecutor, transactional: boolean): MacroObservationStore {
  return {
    transaction: transactional
      ? async (operation) => executor.transaction(async (transaction) => operation(createStore(transaction as unknown as DatabaseExecutor, false)))
      : async (operation) => operation(createStore(executor, false)),
    async findRevision(seriesCode, observationDate, sourceRevision) {
      const rows = await executor.select().from(macroObservations).where(and(
        eq(macroObservations.seriesCode, seriesCode),
        eq(macroObservations.observationDate, observationDate),
        eq(macroObservations.sourceRevision, sourceRevision),
      )).limit(1);
      return rows[0] ? toStored(rows[0]) : null;
    },
    async findLatest(seriesCode, observationDate) {
      const rows = await executor.select().from(macroObservations).where(and(
        eq(macroObservations.seriesCode, seriesCode),
        eq(macroObservations.observationDate, observationDate),
        eq(macroObservations.isLatest, true),
      )).limit(1);
      return rows[0] ? toStored(rows[0]) : null;
    },
    async demoteLatest(seriesCode, observationDate) {
      await executor.update(macroObservations).set({ isLatest: false, updatedAt: new Date() }).where(and(
        eq(macroObservations.seriesCode, seriesCode),
        eq(macroObservations.observationDate, observationDate),
        eq(macroObservations.isLatest, true),
      ));
    },
    async insert(observation) {
      await executor.insert(macroObservations).values({
        seriesCode: observation.seriesCode,
        observationDate: observation.observationDate,
        value: String(observation.value),
        unit: observation.unit,
        publishedAt: new Date(observation.publishedAt),
        sourceName: observation.sourceName,
        sourceUrl: observation.sourceUrl,
        sourceRevision: observation.sourceRevision,
        isLatest: observation.isLatest,
        metadata: observation.metadata,
        retrievedAt: new Date(observation.retrievedAt),
      });
    },
    async touchRevision(seriesCode, observationDate, sourceRevision, retrievedAt) {
      await executor.update(macroObservations).set({ retrievedAt: new Date(retrievedAt), updatedAt: new Date() }).where(and(
        eq(macroObservations.seriesCode, seriesCode),
        eq(macroObservations.observationDate, observationDate),
        eq(macroObservations.sourceRevision, sourceRevision),
      ));
    },
  };
}

export const macroObservationStore = createStore(db, true);
