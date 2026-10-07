import { executeTimeSeriesIndicator } from '../execution/execute-time-series-indicator';
import { getIndicatorDefinition } from '../registry/resolve-definition';
import {
  consumerEvidence,
  type CanonicalConsumerRequest,
  type CanonicalConsumerResult,
  type CanonicalConsumerSeries,
} from './types';

export function evaluateChartSeries(request: CanonicalConsumerRequest): CanonicalConsumerResult {
  const definition = getIndicatorDefinition(request.definitionId);
  if (!definition) {
    throw new RangeError(`Unknown canonical indicator: ${request.definitionId}`);
  }
  if (definition.formulaVersion !== request.formulaVersion) {
    throw new RangeError(
      `Formula version mismatch for ${definition.id}: expected ${definition.formulaVersion}, received ${request.formulaVersion}.`,
    );
  }

  const result = executeTimeSeriesIndicator(
    definition,
    request.frame,
    request.parameters,
    request.context,
    request.inputs,
  );
  const series: CanonicalConsumerSeries[] = [];

  if (result.status === 'ok') {
    for (const output of definition.metadata.outputs) {
      const values = result.outputs[output.key] ?? [];
      series.push({
        outputKey: output.key,
        label: output.label,
        kind: output.kind,
        unit: output.unit,
        placement: output.placement,
        points: Object.freeze(
          result.observationTimes.map((time, index) => ({
            time,
            value: values[index] ?? null,
          })),
        ),
      });
    }
  }

  return {
    status: result.status,
    series: Object.freeze(series),
    evidence: consumerEvidence(result),
    diagnostics: result.diagnostics,
  };
}
