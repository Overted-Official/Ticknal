import { evaluateRuleSeries } from './evaluate-rule-series';
import type { AlertComparisonRequest, AlertComparisonResult } from './types';

function compare(request: AlertComparisonRequest, value: number): boolean {
  switch (request.operator) {
    case 'gt':
      return value > request.threshold;
    case 'gte':
      return value >= request.threshold;
    case 'lt':
      return value < request.threshold;
    case 'lte':
      return value <= request.threshold;
    case 'eq-within-tolerance': {
      const tolerance = request.tolerance;
      if (tolerance === undefined || !Number.isFinite(tolerance) || tolerance < 0) {
        throw new RangeError('eq-within-tolerance requires a finite, non-negative tolerance.');
      }
      return Math.abs(value - request.threshold) <= tolerance;
    }
  }
}

export function evaluateAlertComparison(
  request: AlertComparisonRequest,
): AlertComparisonResult {
  if (!Number.isFinite(request.threshold)) {
    throw new RangeError('Alert threshold must be finite.');
  }

  const result = evaluateRuleSeries(request);
  const latestBar = request.frame.bars.at(-1);
  const latestPoint = result.points.at(-1);
  const base = {
    outputKey: request.outputKey,
    threshold: request.threshold,
    operator: request.operator,
    evidence: result.evidence,
    diagnostics: result.diagnostics,
  } as const;

  if (result.status !== 'ok' || !latestPoint || latestPoint.value === null) {
    return {
      ...base,
      evaluation: 'not-evaluable',
      time: latestPoint?.time ?? null,
      value: null,
      reason: 'value-unavailable',
    };
  }
  if (latestBar?.finality !== 'final') {
    return {
      ...base,
      evaluation: 'not-evaluable',
      time: latestPoint.time,
      value: null,
      reason: 'latest-observation-provisional',
    };
  }

  return {
    ...base,
    evaluation: compare(request, latestPoint.value) ? 'match' : 'no-match',
    time: latestPoint.time,
    value: latestPoint.value,
    reason: null,
  };
}
