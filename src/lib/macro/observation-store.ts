import { createHash } from 'node:crypto';

import type {
  MacroObservationCandidate,
  MacroObservationStore,
  MacroPersistenceReport,
  StoredMacroObservation,
} from './contracts';
import { getMacroSeriesDefinition } from './series-registry';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function isValidCandidate(candidate: MacroObservationCandidate): boolean {
  const definition = getMacroSeriesDefinition(candidate.seriesCode);
  return Boolean(
    definition
      && definition.unit === candidate.unit
      && Number.isFinite(candidate.value)
      && isValidDate(candidate.observationDate)
      && candidate.publishedAt
      && !Number.isNaN(Date.parse(candidate.publishedAt))
      && candidate.sourceName.trim()
      && /^https?:\/\//i.test(candidate.sourceUrl),
  );
}

function deriveRevision(candidate: MacroObservationCandidate): string {
  if (candidate.sourceRevision?.trim()) return candidate.sourceRevision.trim();
  return createHash('sha256').update(JSON.stringify({
    seriesCode: candidate.seriesCode,
    observationDate: candidate.observationDate,
    value: candidate.value,
    unit: candidate.unit,
  })).digest('hex');
}

export async function persistMacroObservationBatch(
  store: MacroObservationStore,
  candidates: readonly MacroObservationCandidate[],
  retrievedAt = new Date().toISOString(),
): Promise<MacroPersistenceReport> {
  const report: MacroPersistenceReport = { inserted: 0, revised: 0, unchanged: 0, rejected: 0 };

  await store.transaction(async (transaction) => {
    for (const candidate of candidates) {
      if (!isValidCandidate(candidate)) {
        report.rejected += 1;
        continue;
      }
      const sourceRevision = deriveRevision(candidate);
      const existingRevision = await transaction.findRevision(
        candidate.seriesCode,
        candidate.observationDate,
        sourceRevision,
      );
      if (existingRevision) {
        await transaction.touchRevision(
          candidate.seriesCode,
          candidate.observationDate,
          sourceRevision,
          retrievedAt,
        );
        report.unchanged += 1;
        continue;
      }

      const latest = await transaction.findLatest(candidate.seriesCode, candidate.observationDate);
      await transaction.demoteLatest(candidate.seriesCode, candidate.observationDate);
      const observation: StoredMacroObservation = {
        ...candidate,
        sourceRevision,
        isLatest: true,
        retrievedAt,
      };
      await transaction.insert(observation);
      if (latest) report.revised += 1;
      else report.inserted += 1;
    }
  });

  return report;
}
