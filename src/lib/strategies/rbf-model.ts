export interface RbfModel {
  readonly gamma: number; readonly intercept: number; readonly probA: number; readonly probB: number;
  readonly mean: readonly number[]; readonly scale: readonly number[];
  readonly coefficients: readonly number[]; readonly vectors: readonly (readonly number[])[];
  readonly warmupBars: number;
}
export function validRbfModel(value: unknown, dimensions: number): value is RbfModel {
  if (!value || typeof value !== 'object' || Array.isArray(value) || dimensions < 1 || dimensions > 16) return false;
  const model = value as Record<string, unknown>;
  const numeric = (entry: unknown): entry is number => typeof entry === 'number' && Number.isFinite(entry) && Math.abs(entry) <= 1_000_000;
  const vector = (entry: unknown): entry is number[] => Array.isArray(entry) && entry.length === dimensions && entry.every(numeric);
  return numeric(model.gamma) && model.gamma > 0 && numeric(model.intercept) && numeric(model.probA) && numeric(model.probB)
    && vector(model.mean) && vector(model.scale) && model.scale.every((entry) => entry > 0)
    && Array.isArray(model.vectors) && model.vectors.length > 0 && model.vectors.length <= 128 && model.vectors.every(vector)
    && Array.isArray(model.coefficients) && model.coefficients.length === model.vectors.length && model.coefficients.every(numeric)
    && Number.isSafeInteger(model.warmupBars) && Number(model.warmupBars) >= 0 && Number(model.warmupBars) <= 1000;
}
export function evaluateRbfModel(model: RbfModel, sources: readonly (readonly (number | null)[])[], length: number): (number | null)[] {
  return Array.from({ length }, (_, index) => {
    if (index < model.warmupBars) return 50;
    const values = sources.map((source, dimension) => source[index] === null || source[index] === undefined ? null : (source[index]! - model.mean[dimension]) / model.scale[dimension]);
    if (values.some((value) => value === null || !Number.isFinite(value))) return null;
    let decision = model.intercept;
    for (let vector = 0; vector < model.vectors.length; vector += 1) {
      let squaredDistance = 0;
      for (let dimension = 0; dimension < values.length; dimension += 1) squaredDistance += (values[dimension]! - model.vectors[vector][dimension]) ** 2;
      decision += model.coefficients[vector] * Math.exp(-model.gamma * squaredDistance);
    }
    return 100 / (1 + Math.exp(model.probA * decision + model.probB));
  });
}
