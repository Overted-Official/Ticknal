import type {
  ExecutionContext,
  IndicatorInputBundle,
  IndicatorResult,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from '../contracts';
import { executeTimeSeriesIndicator } from './execute-time-series-indicator';

export function executeContextualIndicator<P extends object>(
  definition: TimeSeriesIndicatorDefinition<P>,
  frame: TimeSeriesFrame,
  rawParameters: Readonly<Record<string, unknown>>,
  inputs: IndicatorInputBundle,
  context: ExecutionContext,
): IndicatorResult {
  return executeTimeSeriesIndicator(definition, frame, rawParameters, context, inputs);
}
