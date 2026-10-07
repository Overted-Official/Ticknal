import { describe, expect, it } from 'vitest';

import type { MarketBar, TimeSeriesFrame } from '../../src/canonical/contracts';
import { validateMarketFrame } from '../../src/canonical/validation/validate-market-frame';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../references/five-bar-frame';

function withBars(frame: TimeSeriesFrame, bars: readonly MarketBar[]): TimeSeriesFrame {
  return { ...frame, bars };
}

function diagnosticCodes(frame: TimeSeriesFrame): string[] {
  return validateMarketFrame(frame).diagnostics.map((diagnostic) => diagnostic.code);
}

describe('validateMarketFrame', () => {
  it('accepts the immutable hand-calculated reference frame', () => {
    expect(validateMarketFrame(FIVE_BAR_FRAME)).toEqual({ valid: true, diagnostics: [] });
  });

  it('rejects duplicate timestamps instead of deduplicating them', () => {
    const frame = cloneFiveBarFrame();
    const bars = frame.bars.map((bar, index) =>
      index === 1 ? { ...bar, time: frame.bars[0].time } : bar,
    );

    expect(diagnosticCodes(withBars(frame, bars))).toContain('INPUT_DUPLICATE_TIMESTAMP');
  });

  it('rejects unordered timestamps instead of sorting them', () => {
    const frame = cloneFiveBarFrame();
    const bars = frame.bars.map((bar, index) =>
      index === 2 ? { ...bar, time: '2026-01-03' } : bar,
    );

    expect(diagnosticCodes(withBars(frame, bars))).toContain('INPUT_TIMESTAMP_ORDER');
  });

  it('rejects non-finite market values', () => {
    const frame = cloneFiveBarFrame();
    const bars = frame.bars.map((bar, index) =>
      index === 2 ? { ...bar, close: Number.NaN } : bar,
    );

    expect(diagnosticCodes(withBars(frame, bars))).toContain('INPUT_NON_FINITE');
  });

  it.each([
    { high: 90, low: 100, open: 95, close: 95 },
    { high: 110, low: 100, open: 99, close: 105 },
    { high: 110, low: 100, open: 105, close: 111 },
  ])('rejects impossible OHLC relationships: %o', (replacement) => {
    const frame = cloneFiveBarFrame();
    const bars = frame.bars.map((bar, index) =>
      index === 0 ? { ...bar, ...replacement } : bar,
    );

    expect(diagnosticCodes(withBars(frame, bars))).toContain('INPUT_INVALID_OHLC');
  });

  it('rejects negative observed volume', () => {
    const frame = cloneFiveBarFrame();
    const bars = frame.bars.map((bar, index) =>
      index === 0 ? { ...bar, volume: -1 } : bar,
    );

    expect(diagnosticCodes(withBars(frame, bars))).toContain('INPUT_NEGATIVE_VOLUME');
  });

  it('preserves missing volume separately from an authentic observed zero', () => {
    const frame = cloneFiveBarFrame();
    const bars = frame.bars.map((bar, index) => {
      if (index === 0) return { ...bar, volume: null };
      if (index === 1) return { ...bar, volume: 0 };
      return bar;
    });
    const candidate: TimeSeriesFrame = {
      ...frame,
      meta: {
        ...frame.meta,
        fields: {
          ...frame.meta.fields,
          volume: { coverage: 'partial', observedCount: 4, missingCount: 1 },
        },
      },
      bars,
    };

    expect(validateMarketFrame(candidate).valid).toBe(true);
    expect(candidate.bars[0].volume).toBeNull();
    expect(candidate.bars[1].volume).toBe(0);
  });

  it('rejects a blank source revision', () => {
    const frame = cloneFiveBarFrame();
    const candidate = { ...frame, meta: { ...frame.meta, sourceRevision: '   ' } };

    expect(diagnosticCodes(candidate)).toContain('INPUT_SOURCE_REVISION_MISSING');
  });

  it('rejects an undocumented requested/effective timeframe mismatch', () => {
    const frame = cloneFiveBarFrame();
    const candidate = {
      ...frame,
      meta: { ...frame.meta, requestedTimeframe: '1H', effectiveTimeframe: 'D' },
    };

    expect(diagnosticCodes(candidate)).toContain('INPUT_TIMEFRAME_MISMATCH');
  });

  it('does not let transformation metadata authorize a frequency substitution', () => {
    const frame = cloneFiveBarFrame();
    const candidate: TimeSeriesFrame = {
      ...frame,
      meta: {
        ...frame.meta,
        requestedTimeframe: '1H',
        effectiveTimeframe: 'D',
        transformations: [
          {
            kind: 'resampling',
            description: 'Invalid attempted daily substitution',
            fromTimeframe: '1H',
            toTimeframe: 'D',
          },
        ],
      },
    };

    expect(diagnosticCodes(candidate)).toContain('INPUT_TIMEFRAME_MISMATCH');
  });

  it('verifies declared field counts against observations', () => {
    const frame = cloneFiveBarFrame();
    const candidate = {
      ...frame,
      meta: {
        ...frame.meta,
        fields: {
          ...frame.meta.fields,
          volume: { coverage: 'observed' as const, observedCount: 4, missingCount: 1 },
        },
      },
    };

    expect(diagnosticCodes(candidate)).toContain('INPUT_FIELD_COUNTS_MISMATCH');
  });
});
