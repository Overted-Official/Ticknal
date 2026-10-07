import { populationCovariance } from './pair-statistics';

type NullableNumber = number | null;

export function normalizeWeights(marketValues: readonly number[]): number[] | null {
  if (
    marketValues.length === 0
    || marketValues.some((value) => !Number.isFinite(value) || value < 0)
  ) return null;
  const total = marketValues.reduce((sum, value) => sum + value, 0);
  if (total <= 0 || !Number.isFinite(total)) return null;
  return marketValues.map((value) => value / total);
}

export function portfolioCovariance(
  returnsByAsset: readonly (readonly NullableNumber[])[],
): number[][] | null {
  if (returnsByAsset.length === 0) return null;
  const observationCount = returnsByAsset[0]?.length ?? 0;
  if (
    observationCount === 0
    || returnsByAsset.some((series) => series.length !== observationCount)
  ) return null;

  const completeRows: number[][] = [];
  for (let observation = 0; observation < observationCount; observation += 1) {
    const row = returnsByAsset.map((series) => series[observation]);
    if (row.every((value): value is number => value !== null && Number.isFinite(value))) {
      completeRows.push(row);
    }
  }
  if (completeRows.length === 0) return null;

  return returnsByAsset.map((_, leftAsset) => returnsByAsset.map((__, rightAsset) => {
    const left = completeRows.map((row) => row[leftAsset]!);
    const right = completeRows.map((row) => row[rightAsset]!);
    return populationCovariance(left, right) ?? 0;
  }));
}
