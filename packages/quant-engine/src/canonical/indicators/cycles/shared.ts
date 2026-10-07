import type { IndicatorOutputDefinition, TimeSeriesFrame } from '../../contracts';
import { crossDown, crossUp, ema, rollingStdDev, sma } from '../../core/series';
import type { CategoryParameterRule } from '../shared/category-definition';

export type Series = readonly (number | null)[];
export type Params = Record<string, unknown>;
export type Rules = Record<string, CategoryParameterRule>;

export { crossDown, crossUp, ema, rollingStdDev, sma };

export const integer = (min = 1, max = 5000): CategoryParameterRule => ({ kind: 'integer', min, max });
export const number = (min: number, max: number): CategoryParameterRule => ({ kind: 'number', min, max });
export const pane = (key: string, label: string, unit: IndicatorOutputDefinition['unit'] = 'dimensionless', kind: IndicatorOutputDefinition['kind'] = 'number'): IndicatorOutputDefinition => ({ key, label, unit, placement: kind === 'boolean' ? 'event' : 'pane', kind, nullable: true });
export const overlay = (key: string, label: string): IndicatorOutputDefinition => ({ key, label, unit: 'price', placement: 'overlay', kind: 'number', nullable: true });
export const event = (key: string, label: string): IndicatorOutputDefinition => pane(key, label, 'boolean', 'boolean');
export const category = (key: string, label: string): IndicatorOutputDefinition => pane(key, label, 'category', 'category');
export const n = (parameters: Params, key: string): number => parameters[key] as number;
export const close = (frame: TimeSeriesFrame): number[] => frame.bars.map((bar) => bar.close);

export function map2(left: Series, right: Series, calculate: (left: number, right: number, index: number) => number | null): Series {
  return left.map((leftValue, index) => {
    const rightValue = right[index];
    if (leftValue === null || rightValue === null) return null;
    const result = calculate(leftValue, rightValue, index);
    return result === null || !Number.isFinite(result) ? null : result;
  });
}

export function returns(source: Series): Series {
  return source.map((value, index) => index === 0 || value === null || source[index - 1] === null || source[index - 1] === 0 ? null : value / source[index - 1]! - 1);
}

export function superSmoother(source: Series, period: number, poles = 2): Series {
  if (poles === 1) return ema(source, period);
  const output: (number | null)[] = Array(source.length).fill(null);
  const a1 = Math.exp(-Math.SQRT2 * Math.PI / period);
  const b1 = 2 * a1 * Math.cos(Math.SQRT2 * Math.PI / period);
  const c2 = b1;
  const c3 = -(a1 ** 2);
  const c1 = 1 - c2 - c3;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    if (current === null) continue;
    if (index < 2 || source[index - 1] === null) { output[index] = current; continue; }
    output[index] = c1 * (current + source[index - 1]!) / 2 + c2 * (output[index - 1] ?? current) + c3 * (output[index - 2] ?? current);
  }
  return output;
}

export function highPass(source: Series, period: number): Series {
  const output: (number | null)[] = Array(source.length).fill(null);
  const angle = Math.SQRT1_2 * 2 * Math.PI / period;
  const cosine = Math.cos(angle);
  const alpha = cosine === 0 ? 0 : (cosine + Math.sin(angle) - 1) / cosine;
  const coefficient = 0.5 * (1 + alpha) ** 2;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === null) continue;
    if (index < 2 || source[index - 1] === null || source[index - 2] === null) { output[index] = 0; continue; }
    output[index] = coefficient * (source[index]! - 2 * source[index - 1]! + source[index - 2]!)
      + 2 * (1 - alpha) * (output[index - 1] ?? 0) - (1 - alpha) ** 2 * (output[index - 2] ?? 0);
  }
  return output;
}

export function bandPass(source: Series, period: number, bandwidth: number): Series {
  const highPeriod = Math.max(period + 2, Math.round(period * (1 + bandwidth)));
  const lowPeriod = Math.max(2, Math.round(period * Math.max(0.1, 1 - bandwidth)));
  return superSmoother(highPass(source, highPeriod), lowPeriod, 2);
}

function spectralPoint(window: readonly number[], period: number) {
  const average = window.reduce((sum, value) => sum + value, 0) / window.length;
  let real = 0;
  let imaginary = 0;
  for (let index = 0; index < window.length; index += 1) {
    const angle = 2 * Math.PI * index / period;
    const centered = window[index] - average;
    real += centered * Math.cos(angle);
    imaginary -= centered * Math.sin(angle);
  }
  return { power: (real ** 2 + imaginary ** 2) / (window.length ** 2), phase: Math.atan2(imaginary, real) };
}

export function dominantCycle(source: Series, windowLength: number, minimumPeriod: number, maximumPeriod: number) {
  const period: (number | null)[] = Array(source.length).fill(null);
  const power: (number | null)[] = Array(source.length).fill(null);
  const phase: (number | null)[] = Array(source.length).fill(null);
  for (let index = windowLength - 1; index < source.length; index += 1) {
    const window = source.slice(index - windowLength + 1, index + 1);
    if (window.some((value) => value === null)) continue;
    let bestPeriod = minimumPeriod;
    let bestPower = -Infinity;
    let bestPhase = 0;
    for (let candidate = minimumPeriod; candidate <= Math.min(maximumPeriod, windowLength); candidate += 1) {
      const point = spectralPoint(window as number[], candidate);
      if (point.power > bestPower) { bestPeriod = candidate; bestPower = point.power; bestPhase = point.phase; }
    }
    period[index] = bestPeriod;
    power[index] = bestPower;
    phase[index] = bestPhase;
  }
  return { period, power, phase };
}

export function goertzelPower(source: Series, period: number, windowLength: number): Series {
  const result: (number | null)[] = Array(source.length).fill(null);
  const coefficient = 2 * Math.cos(2 * Math.PI / period);
  for (let index = windowLength - 1; index < source.length; index += 1) {
    const window = source.slice(index - windowLength + 1, index + 1);
    if (window.some((value) => value === null)) continue;
    let first = 0, second = 0;
    for (const value of window as number[]) { const next = value + coefficient * first - second; second = first; first = next; }
    result[index] = Math.max(0, first ** 2 + second ** 2 - coefficient * first * second) / (windowLength ** 2);
  }
  return result;
}

export function hpFilter(source: readonly number[], lambda: number): number[] {
  const length = source.length;
  if (length < 3) return [...source];
  const apply = (vector: readonly number[]) => {
    const result = [...vector];
    for (let index = 0; index < length - 2; index += 1) {
      const difference = vector[index] - 2 * vector[index + 1] + vector[index + 2];
      result[index] += lambda * difference;
      result[index + 1] -= 2 * lambda * difference;
      result[index + 2] += lambda * difference;
    }
    return result;
  };
  const trend = [...source];
  let residual = source.map((value, index) => value - apply(trend)[index]);
  let direction = [...residual];
  let residualNorm = residual.reduce((sum, value) => sum + value ** 2, 0);
  for (let iteration = 0; iteration < 80 && residualNorm > 1e-18; iteration += 1) {
    const transformed = apply(direction);
    const denominator = direction.reduce((sum, value, index) => sum + value * transformed[index], 0);
    if (Math.abs(denominator) < 1e-18) break;
    const alpha = residualNorm / denominator;
    for (let index = 0; index < length; index += 1) trend[index] += alpha * direction[index];
    const nextResidual = residual.map((value, index) => value - alpha * transformed[index]);
    const nextNorm = nextResidual.reduce((sum, value) => sum + value ** 2, 0);
    const beta = nextNorm / residualNorm;
    direction = nextResidual.map((value, index) => value + beta * direction[index]);
    residual = nextResidual;
    residualNorm = nextNorm;
  }
  return trend;
}

export function baxterKing(source: Series, lowPeriod: number, highPeriod: number, leadLag: number): Series {
  const output: (number | null)[] = Array(source.length).fill(null);
  const lowFrequency = 2 * Math.PI / highPeriod;
  const highFrequency = 2 * Math.PI / lowPeriod;
  const weights: number[] = [];
  for (let lag = -leadLag; lag <= leadLag; lag += 1) {
    weights.push(lag === 0 ? (highFrequency - lowFrequency) / Math.PI : (Math.sin(highFrequency * lag) - Math.sin(lowFrequency * lag)) / (Math.PI * lag));
  }
  const adjustment = weights.reduce((sum, value) => sum + value, 0) / weights.length;
  const adjusted = weights.map((value) => value - adjustment);
  for (let index = leadLag; index < source.length - leadLag; index += 1) {
    const window = source.slice(index - leadLag, index + leadLag + 1);
    if (window.some((value) => value === null)) continue;
    output[index] = (window as number[]).reduce((sum, value, position) => sum + value * adjusted[position], 0);
  }
  return output;
}

export function empty(frame: TimeSeriesFrame, keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, Array(frame.bars.length).fill(null)]));
}
