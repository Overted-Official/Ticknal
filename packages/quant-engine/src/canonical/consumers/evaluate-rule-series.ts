import { getIndicatorDefinition } from '../registry/resolve-definition';
import { evaluateChartSeries } from './evaluate-chart-series';
import type {
  CanonicalOutputConsumerRequest,
  CanonicalRuleSeriesResult,
} from './types';

export function evaluateRuleSeries(
  request: CanonicalOutputConsumerRequest,
): CanonicalRuleSeriesResult {
  const definition = getIndicatorDefinition(request.definitionId);
  const output = definition?.metadata.outputs.find(
    (candidate) => candidate.key === request.outputKey && candidate.kind === 'number',
  );
  if (!definition || !output) {
    throw new RangeError(
      `Numeric output ${request.outputKey} is not defined by ${request.definitionId}.`,
    );
  }

  const result = evaluateChartSeries(request);
  const series = result.series.find((candidate) => candidate.outputKey === request.outputKey);
  if (result.status === 'ok' && !series) {
    throw new RangeError(
      `Numeric output ${request.outputKey} is not defined by ${request.definitionId}.`,
    );
  }

  return {
    status: result.status,
    outputKey: request.outputKey,
    points: series?.points.map((point) => ({
      time: point.time,
      value: typeof point.value === 'number' ? point.value : null,
    })) ?? [],
    evidence: result.evidence,
    diagnostics: result.diagnostics,
  };
}
