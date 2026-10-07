import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { macroObservations } from '@/db/schema';

import type { MacroObservationCandidate, MacroPersistenceReport } from './contracts';
import { macroObservationStore } from './drizzle-observation-store';
import { persistMacroObservationBatch } from './observation-store';
import { fetchBlsCpiObservations } from './sources/bls-cpi';
import { fetchCbeCurrentObservations } from './sources/cbe-current';

interface SourceSyncResult extends MacroPersistenceReport {
  status: 'ok' | 'failed';
  observations: number;
  error?: string;
}

export interface OfficialMacroSyncResult {
  cbe: SourceSyncResult;
  bls: SourceSyncResult;
  derivedEgyptCpi: SourceSyncResult;
}

const emptyReport = (): MacroPersistenceReport => ({ inserted: 0, revised: 0, unchanged: 0, rejected: 0 });
const failed = (error: unknown): SourceSyncResult => ({ status: 'failed', observations: 0, ...emptyReport(), error: error instanceof Error ? error.message : String(error) });

async function persistSource(fetcher: () => Promise<MacroObservationCandidate[]>): Promise<SourceSyncResult> {
  try {
    const observations = await fetcher();
    const report = await persistMacroObservationBatch(macroObservationStore, observations);
    return { status: 'ok', observations: observations.length, ...report };
  } catch (error) {
    return failed(error);
  }
}

async function deriveEgyptCpiIndex(): Promise<SourceSyncResult> {
  try {
    const rows = await db.select({
      observationDate: macroObservations.observationDate,
      value: macroObservations.value,
      publishedAt: macroObservations.publishedAt,
      sourceUrl: macroObservations.sourceUrl,
    }).from(macroObservations).where(and(
      eq(macroObservations.seriesCode, 'EG_CPI_HEADLINE_MOM'),
      eq(macroObservations.isLatest, true),
    )).orderBy(asc(macroObservations.observationDate));
    let index = 100;
    const observations = rows.map((row, position): MacroObservationCandidate => {
      if (position > 0) index *= 1 + Number(row.value) / 100;
      return {
        seriesCode: 'EG_CPI_HEADLINE_INDEX', observationDate: row.observationDate, value: index,
        unit: 'index', publishedAt: row.publishedAt.toISOString(),
        sourceName: 'Central Bank of Egypt (derived from official monthly inflation)',
        sourceUrl: row.sourceUrl,
        metadata: { derivation: 'chain-linked from EG_CPI_HEADLINE_MOM', baseValue: 100 },
      };
    });
    const report = await persistMacroObservationBatch(macroObservationStore, observations);
    return { status: 'ok', observations: observations.length, ...report };
  } catch (error) {
    return failed(error);
  }
}

export async function syncOfficialMacroData(): Promise<OfficialMacroSyncResult> {
  let includeCbeHistory = true;
  let includeBlsHistory = true;
  try {
    const [existingCbe, existingBls] = await Promise.all([
      db.select({ observationDate: macroObservations.observationDate }).from(macroObservations).where(and(
          eq(macroObservations.seriesCode, 'EG_CPI_HEADLINE_MOM'),
          eq(macroObservations.isLatest, true),
        )).limit(24),
      db.select({ observationDate: macroObservations.observationDate }).from(macroObservations).where(and(
          eq(macroObservations.seriesCode, 'US_CPI_INDEX'),
          eq(macroObservations.isLatest, true),
        )).limit(24),
    ]);
    includeCbeHistory = existingCbe.length < 24;
    includeBlsHistory = existingBls.length < 24;
  } catch {
    includeCbeHistory = true;
    includeBlsHistory = true;
  }
  const recentCutoff = new Date();
  recentCutoff.setUTCMonth(recentCutoff.getUTCMonth() - 3);
  const cutoffDate = recentCutoff.toISOString().slice(0, 10);
  const [cbe, bls] = await Promise.all([
    persistSource(() => fetchCbeCurrentObservations(new Date(), includeCbeHistory)),
    persistSource(async () => {
      const observations = await fetchBlsCpiObservations();
      return includeBlsHistory ? observations : observations.filter((item) => item.observationDate >= cutoffDate);
    }),
  ]);
  const derivedEgyptCpi = await deriveEgyptCpiIndex();
  return { cbe, bls, derivedEgyptCpi };
}
