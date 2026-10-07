import type { NumericSeriesPoint, ObservationTime } from '@ticknal/quant-engine/canonical';

export interface PublishedMacroRow {
  readonly date: string;
  readonly value: unknown;
  readonly updatedAt: Date | string;
}

function instantValue(value: Date | string | ObservationTime): number | null {
  if (value instanceof Date) {
    const milliseconds = value.getTime();
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function alignPublishedMacroRows(
  observationTimes: readonly ObservationTime[],
  rows: readonly PublishedMacroRow[],
): readonly NumericSeriesPoint[] {
  const ordered = [...rows].sort((left, right) => {
    const leftReference = instantValue(left.date) ?? Number.NEGATIVE_INFINITY;
    const rightReference = instantValue(right.date) ?? Number.NEGATIVE_INFINITY;
    if (leftReference !== rightReference) return leftReference - rightReference;
    return (instantValue(left.updatedAt) ?? Number.NEGATIVE_INFINITY)
      - (instantValue(right.updatedAt) ?? Number.NEGATIVE_INFINITY);
  });
  return Object.freeze(observationTimes.map((time) => {
    const observationInstant = instantValue(time);
    const row = observationInstant === null
      ? undefined
      : ordered.findLast((candidate) => {
          const referenceInstant = instantValue(candidate.date);
          const availabilityInstant = instantValue(candidate.updatedAt);
          return referenceInstant !== null
            && availabilityInstant !== null
            && referenceInstant <= observationInstant
            && availabilityInstant <= observationInstant;
        });
    const numeric = row === undefined ? null : Number(row.value);
    return Object.freeze({
      time,
      value: numeric !== null && Number.isFinite(numeric) ? numeric : null,
    });
  }));
}
