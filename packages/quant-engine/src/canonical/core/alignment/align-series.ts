import {
  createDiagnostic,
  type Diagnostic,
  type NumericSeriesFrame,
  type ObservationTime,
  type TimeSeriesFrame,
} from '../../contracts';

export interface NumericSeriesAlignment {
  readonly values: readonly (number | null)[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface FrameCloseAlignment extends NumericSeriesAlignment {
  readonly primary: readonly number[];
  readonly comparison: readonly (number | null)[];
}

function observationKey(time: ObservationTime): string {
  return `${typeof time}:${String(time)}`;
}

export function alignNumericSeries(
  observationTimes: readonly ObservationTime[],
  frame: NumericSeriesFrame,
): NumericSeriesAlignment {
  const byTime = new Map<string, number | null>();
  const duplicates = new Set<string>();

  for (const point of frame.points) {
    const key = observationKey(point.time);
    if (byTime.has(key)) {
      duplicates.add(key);
      continue;
    }
    byTime.set(key, point.value !== null && Number.isFinite(point.value) ? point.value : null);
  }

  if (duplicates.size > 0) {
    return {
      values: Object.freeze(observationTimes.map(() => null)),
      diagnostics: Object.freeze([
        createDiagnostic('INPUT_DUPLICATE_TIMESTAMP', 'indicator.context.duplicateTimestamp', {
          role: frame.role,
          timestamps: [...duplicates],
        }),
      ]),
    };
  }

  return {
    values: Object.freeze(observationTimes.map((time) => byTime.get(observationKey(time)) ?? null)),
    diagnostics: Object.freeze([]),
  };
}

export function alignFrameCloses(
  frame: TimeSeriesFrame,
  comparisonFrame: NumericSeriesFrame,
): FrameCloseAlignment {
  const primary = Object.freeze(frame.bars.map((bar) => bar.close));
  const aligned = alignNumericSeries(frame.bars.map((bar) => bar.time), comparisonFrame);
  return {
    primary,
    comparison: aligned.values,
    values: aligned.values,
    diagnostics: aligned.diagnostics,
  };
}
