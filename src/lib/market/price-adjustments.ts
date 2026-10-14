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
  effectiveDate?: string;
  partitionType?: 'FULL_WINDOW' | 'MID_WINDOW_PARTITION';
};

export type ExtremeGapEvidence = {
  factor: number;
  gapPct: number;
};

const MIN_OVERLAP_SAMPLES = 3;
const MATERIAL_FACTOR_THRESHOLD = 0.08;
const MAX_FACTOR_DEVIATION = 0.015;
const EXTREME_GAP_THRESHOLD = 0.22;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Detects a provider-side historical rebase (normally a split or bonus shares)
 * by comparing dates that exist in both the database and the fetched window.
 *
 * Supports two distinct provider rebase patterns:
 * 1. Full-Window Rebase: All overlapping bars have changed by the same factor
 *    (the rebase occurred before any post-action bar was inserted).
 * 2. Mid-Window Partition: A corporate action already inserted 1+ post-split bars
 *    at the new price (ratio ~ 1.0), and the provider rebased all preceding bars
 *    (ratio ~ factor). We find the partition date D where the step occurred.
 */
export function detectProviderAdjustment(
  storedBars: ComparablePriceBar[],
  incomingBars: ComparablePriceBar[],
): ProviderAdjustmentEvidence | null {
  const storedByDate = new Map(storedBars.map((bar) => [bar.date, bar]));
  const sortedIncoming = [...incomingBars].sort((a, b) => a.date.localeCompare(b.date));

  type OverlapPair = {
    date: string;
    storedClose: number;
    incomingClose: number;
    ratio: number;
  };

  const overlapPairs: OverlapPair[] = [];
  for (const inc of sortedIncoming) {
    const stored = storedByDate.get(inc.date);
    if (!stored || stored.close <= 0 || inc.close <= 0) continue;
    const ratio = inc.close / stored.close;
    if (Number.isFinite(ratio) && ratio > 0) {
      overlapPairs.push({
        date: inc.date,
        storedClose: stored.close,
        incomingClose: inc.close,
        ratio,
      });
    }
  }

  if (overlapPairs.length < MIN_OVERLAP_SAMPLES) return null;

  // 1. Check Full Window Rebase:
  const allRatios = overlapPairs.map((p) => p.ratio);
  const fullFactor = median(allRatios);
  if (Math.abs(fullFactor - 1) >= MATERIAL_FACTOR_THRESHOLD) {
    const fullMaxDev = Math.max(
      ...allRatios.map((r) => Math.abs(r - fullFactor) / fullFactor),
    );
    if (fullMaxDev <= MAX_FACTOR_DEVIATION) {
      return {
        factor: fullFactor,
        sampleSize: allRatios.length,
        maxRelativeDeviation: fullMaxDev,
        partitionType: 'FULL_WINDOW',
      };
    }
  }

  // 2. Check Mid-Window Partitioned Rebase (Corporate Action Step-Change):
  for (let i = 1; i < overlapPairs.length; i++) {
    const prePairs = overlapPairs.slice(0, i);
    const postPairs = overlapPairs.slice(i);

    if (prePairs.length < 2) continue;

    const preRatios = prePairs.map((p) => p.ratio);
    const preFactor = median(preRatios);

    if (Math.abs(preFactor - 1) < MATERIAL_FACTOR_THRESHOLD) continue;

    const preMaxDev = Math.max(
      ...preRatios.map((r) => Math.abs(r - preFactor) / preFactor),
    );
    if (preMaxDev > MAX_FACTOR_DEVIATION) continue;

    const postRatios = postPairs.map((p) => p.ratio);
    const postMaxDevFromOne = Math.max(
      ...postRatios.map((r) => Math.abs(r - 1)),
    );
    if (postMaxDevFromOne > MAX_FACTOR_DEVIATION) continue;

    const effectiveDate = postPairs[0].date;
    return {
      factor: preFactor,
      effectiveDate,
      sampleSize: prePairs.length,
      maxRelativeDeviation: preMaxDev,
      partitionType: 'MID_WINDOW_PARTITION',
    };
  }

  return null;
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
