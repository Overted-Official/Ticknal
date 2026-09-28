export type ComparablePriceBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ProviderAdjustmentEvidence = {
  factor: number;
  sampleSize: number;
  maxRelativeDeviation: number;
};

export type ExtremeGapEvidence = {
  factor: number;
  gapPct: number;
};

const MIN_OVERLAP_SAMPLES = 3;
const MATERIAL_FACTOR_THRESHOLD = 0.1;
const MAX_FACTOR_DEVIATION = 0.015;
const EXTREME_GAP_THRESHOLD = 0.35;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Detects a provider-side historical rebase (normally a split) by comparing
 * several dates that exist in both the database and the newly fetched window.
 * A real market move changes only the new bar; a corporate-action rebase
 * changes every overlapping historical close by the same factor.
 */
export function detectProviderAdjustment(
  storedBars: ComparablePriceBar[],
  incomingBars: ComparablePriceBar[],
): ProviderAdjustmentEvidence | null {
  const storedByDate = new Map(storedBars.map((bar) => [bar.date, bar]));
  const ratios = incomingBars.flatMap((incoming) => {
    const stored = storedByDate.get(incoming.date);
    if (!stored || stored.close <= 0 || incoming.close <= 0) return [];
    const ratio = incoming.close / stored.close;
    return Number.isFinite(ratio) && ratio > 0 ? [ratio] : [];
  });

  if (ratios.length < MIN_OVERLAP_SAMPLES) return null;

  const factor = median(ratios);
  if (Math.abs(factor - 1) < MATERIAL_FACTOR_THRESHOLD) return null;

  const maxRelativeDeviation = Math.max(
    ...ratios.map((ratio) => Math.abs(ratio - factor) / factor),
  );
  if (maxRelativeDeviation > MAX_FACTOR_DEVIATION) return null;

  return { factor, sampleSize: ratios.length, maxRelativeDeviation };
}

/**
 * Flags a discontinuity between the last canonical close and the first new
 * session's opening reference. It deliberately does not call the event a
 * split: without overlapping adjusted history or confirmed exchange data, the
 * safe response is to quarantine the bar and suppress derived signals.
 */
export function detectExtremeGap(
  previousClose: number,
  nextOpen: number,
): ExtremeGapEvidence | null {
  if (!Number.isFinite(previousClose) || !Number.isFinite(nextOpen) || previousClose <= 0 || nextOpen <= 0) {
    return null;
  }

  const factor = nextOpen / previousClose;
  const gapPct = (factor - 1) * 100;
  if (Math.abs(factor - 1) < EXTREME_GAP_THRESHOLD) return null;

  return { factor, gapPct };
}

export function toComparableBar(period: {
  time: number;
  open: number;
  max: number;
  min: number;
  close: number;
  volume?: number;
}): ComparablePriceBar {
  return {
    date: new Date(period.time * 1000).toISOString().slice(0, 10),
    open: Number(period.open),
    high: Number(period.max),
    low: Number(period.min),
    close: Number(period.close),
    volume: Number(period.volume || 0),
  };
}
