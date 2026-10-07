import {
  createDiagnostic,
  type Diagnostic,
  type FieldCoverage,
  type MarketBar,
  type MarketField,
  type TimeSeriesFrame,
  type ValidationResult,
} from '../contracts';

const MARKET_FIELDS: readonly MarketField[] = [
  'open',
  'high',
  'low',
  'close',
  'volume',
  'trades',
];

function observationOrdinal(time: MarketBar['time']): number | null {
  if (typeof time === 'number') {
    return Number.isFinite(time) ? time : null;
  }

  if (time.trim().length === 0) return null;
  const parsed = Date.parse(time);
  return Number.isFinite(parsed) ? parsed : null;
}

function coverageFor(observedCount: number, missingCount: number): FieldCoverage {
  if (observedCount === 0) return 'unavailable';
  return missingCount === 0 ? 'observed' : 'partial';
}

function fieldCounts(frame: TimeSeriesFrame, field: MarketField) {
  const observedCount = frame.bars.reduce((count, bar) => {
    const value = bar[field];
    return count + (value === null ? 0 : 1);
  }, 0);
  const missingCount = frame.bars.length - observedCount;
  return {
    coverage: coverageFor(observedCount, missingCount),
    observedCount,
    missingCount,
  } as const;
}

function validateChronology(frame: TimeSeriesFrame, diagnostics: Diagnostic[]): void {
  const seen = new Set<number>();
  let previous: number | null = null;

  frame.bars.forEach((bar, index) => {
    const ordinal = observationOrdinal(bar.time);
    if (ordinal === null) {
      diagnostics.push(
        createDiagnostic('INPUT_INVALID_TIMESTAMP', 'indicator.input.invalidTimestamp', {
          index,
          time: bar.time,
        }),
      );
      return;
    }

    if (seen.has(ordinal)) {
      diagnostics.push(
        createDiagnostic('INPUT_DUPLICATE_TIMESTAMP', 'indicator.input.duplicateTimestamp', {
          index,
          time: bar.time,
        }),
      );
    } else if (previous !== null && ordinal < previous) {
      diagnostics.push(
        createDiagnostic('INPUT_TIMESTAMP_ORDER', 'indicator.input.timestampOrder', {
          index,
          time: bar.time,
        }),
      );
    }

    seen.add(ordinal);
    previous = ordinal;
  });
}

function validateBar(bar: MarketBar, index: number, diagnostics: Diagnostic[]): void {
  const numericFields = ['open', 'high', 'low', 'close'] as const;
  for (const field of numericFields) {
    if (!Number.isFinite(bar[field])) {
      diagnostics.push(
        createDiagnostic('INPUT_NON_FINITE', 'indicator.input.nonFinite', {
          index,
          field,
        }),
      );
    }
  }

  for (const field of ['volume', 'trades'] as const) {
    const value = bar[field];
    if (value !== null && !Number.isFinite(value)) {
      diagnostics.push(
        createDiagnostic('INPUT_NON_FINITE', 'indicator.input.nonFinite', {
          index,
          field,
        }),
      );
    }
  }

  if (
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close) &&
    (bar.low > bar.high ||
      bar.open < bar.low ||
      bar.open > bar.high ||
      bar.close < bar.low ||
      bar.close > bar.high)
  ) {
    diagnostics.push(
      createDiagnostic('INPUT_INVALID_OHLC', 'indicator.input.invalidOhlc', { index }),
    );
  }

  if (bar.volume !== null && Number.isFinite(bar.volume) && bar.volume < 0) {
    diagnostics.push(
      createDiagnostic('INPUT_NEGATIVE_VOLUME', 'indicator.input.negativeVolume', { index }),
    );
  }

  if (bar.trades !== null && Number.isFinite(bar.trades) && bar.trades < 0) {
    diagnostics.push(
      createDiagnostic('INPUT_NEGATIVE_TRADES', 'indicator.input.negativeTrades', { index }),
    );
  }
}

export function validateMarketFrame(frame: TimeSeriesFrame): ValidationResult {
  const diagnostics: Diagnostic[] = [];

  validateChronology(frame, diagnostics);
  frame.bars.forEach((bar, index) => validateBar(bar, index, diagnostics));

  if (frame.meta.sourceRevision.trim().length === 0) {
    diagnostics.push(
      createDiagnostic(
        'INPUT_SOURCE_REVISION_MISSING',
        'indicator.input.sourceRevisionMissing',
      ),
    );
  }

  if (frame.meta.requestedTimeframe !== frame.meta.effectiveTimeframe) {
    diagnostics.push(
      createDiagnostic('INPUT_TIMEFRAME_MISMATCH', 'indicator.input.timeframeMismatch', {
        requested: frame.meta.requestedTimeframe,
        effective: frame.meta.effectiveTimeframe,
      }),
    );
  }

  for (const field of MARKET_FIELDS) {
    const actual = fieldCounts(frame, field);
    const declared = frame.meta.fields[field];
    if (
      declared.observedCount !== actual.observedCount ||
      declared.missingCount !== actual.missingCount
    ) {
      diagnostics.push(
        createDiagnostic('INPUT_FIELD_COUNTS_MISMATCH', 'indicator.input.fieldCountsMismatch', {
          field,
          declaredObserved: declared.observedCount,
          actualObserved: actual.observedCount,
          declaredMissing: declared.missingCount,
          actualMissing: actual.missingCount,
        }),
      );
    }
    if (declared.coverage !== actual.coverage) {
      diagnostics.push(
        createDiagnostic(
          'INPUT_FIELD_COVERAGE_MISMATCH',
          'indicator.input.fieldCoverageMismatch',
          { field, declared: declared.coverage, actual: actual.coverage },
        ),
      );
    }
  }

  return { valid: diagnostics.length === 0, diagnostics };
}
