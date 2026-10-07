import {
  createDiagnostic,
  EMPTY_INDICATOR_INPUT_BUNDLE,
  type Diagnostic,
  type ExecutionContext,
  type IndicatorInputBundle,
  type IndicatorOutputs,
  type IndicatorResult,
  type TimeSeriesFrame,
  type TimeSeriesIndicatorDefinition,
} from '../contracts';
import {
  indicatorInputBundleHasCapability,
  listContextualInputProvenance,
} from '../contracts/contextual-inputs';
import { validateMarketFrame } from '../validation/validate-market-frame';
import { validateIndicatorOutputs } from '../validation/validate-outputs';
import { alignNumericSeries } from '../core/alignment/align-series';
import { createExecutionFingerprint } from './execution-fingerprint';

function freezeOutputs(outputs: IndicatorOutputs): IndicatorOutputs {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(outputs).map(([key, values]) => [key, Object.freeze([...values])]),
    ),
  );
}

function resultEnvelope<P extends object>(
  definition: TimeSeriesIndicatorDefinition<P>,
  frame: TimeSeriesFrame,
  parameters: Readonly<Record<string, unknown>> | null,
  fingerprintParameters: Readonly<Record<string, unknown>>,
  context: ExecutionContext,
  status: IndicatorResult['status'],
  outputs: IndicatorOutputs,
  diagnostics: readonly Diagnostic[],
  inputs: IndicatorInputBundle,
): IndicatorResult {
  return {
    status,
    identity: {
      backlogId: definition.backlogId,
      id: definition.id,
      formulaVersion: definition.formulaVersion,
      definitionSchemaVersion: definition.definitionSchemaVersion,
    },
    normalizedParameters: parameters,
    observationTimes: Object.freeze(frame.bars.map((bar) => bar.time)),
    outputs: freezeOutputs(outputs),
    provenance: {
      instrumentId: frame.meta.instrumentId,
      symbol: frame.meta.symbol,
      exchange: frame.meta.exchange,
      requestedTimeframe: frame.meta.requestedTimeframe,
      effectiveTimeframe: frame.meta.effectiveTimeframe,
      sourceId: frame.meta.sourceId,
      sourceType: frame.meta.sourceType,
      sourceRevision: frame.meta.sourceRevision,
      adjustmentMode: frame.meta.adjustmentMode,
      adjustmentRevision: frame.meta.adjustmentRevision,
      asOf: frame.meta.asOf,
      receivedAt: frame.meta.receivedAt,
      transformations: frame.meta.transformations,
    },
    contextualProvenance: listContextualInputProvenance(inputs),
    executionFingerprint: createExecutionFingerprint(
      definition,
      frame,
      fingerprintParameters,
      inputs,
    ),
    calculatedAt: context.calculatedAt,
    resultFinality: frame.bars.at(-1)?.finality ?? 'final',
    coverage: {
      barCount: frame.bars.length,
      firstObservation: frame.bars[0]?.time ?? null,
      lastObservation: frame.bars.at(-1)?.time ?? null,
      sessionCompleteness: frame.meta.sessionCompleteness,
      continuityStatus: frame.meta.continuityStatus,
    },
    diagnostics: Object.freeze([...diagnostics]),
  };
}

export function executeTimeSeriesIndicator<P extends object>(
  definition: TimeSeriesIndicatorDefinition<P>,
  frame: TimeSeriesFrame,
  rawParameters: Readonly<Record<string, unknown>>,
  context: ExecutionContext,
  inputs: IndicatorInputBundle = EMPTY_INDICATOR_INPUT_BUNDLE,
): IndicatorResult {
  const frameValidation = validateMarketFrame(frame);
  if (!frameValidation.valid) {
    return resultEnvelope(
      definition,
      frame,
      null,
      rawParameters,
      context,
      'invalid',
      {},
      frameValidation.diagnostics,
      inputs,
    );
  }

  const missingFields = definition.metadata.requiredFields.filter(
    (field) => frame.meta.fields[field].coverage !== 'observed',
  );
  if (missingFields.length > 0) {
    const diagnostics = missingFields.map((field) =>
      createDiagnostic('DATA_FIELD_MISSING', 'indicator.data.requiredFieldMissing', {
        field,
        coverage: frame.meta.fields[field].coverage,
      }),
    );
    return resultEnvelope(
      definition,
      frame,
      null,
      rawParameters,
      context,
      'unavailable',
      {},
      diagnostics,
      inputs,
    );
  }

  const missingCapabilities = (definition.metadata.requiredCapabilities ?? []).filter(
    (capability) => !indicatorInputBundleHasCapability(inputs, capability),
  );
  if (missingCapabilities.length > 0) {
    return resultEnvelope(
      definition,
      frame,
      null,
      rawParameters,
      context,
      'unavailable',
      {},
      missingCapabilities.map((capability) => createDiagnostic(
        'DATA_CAPABILITY_MISSING',
        'indicator.data.requiredCapabilityMissing',
        { capability },
      )),
      inputs,
    );
  }

  const contextualDiagnostics = Object.values(inputs.seriesByRole).flatMap((source) =>
    alignNumericSeries(frame.bars.map((bar) => bar.time), source).diagnostics,
  );
  if (contextualDiagnostics.length > 0) {
    return resultEnvelope(
      definition,
      frame,
      null,
      rawParameters,
      context,
      'unavailable',
      {},
      contextualDiagnostics,
      inputs,
    );
  }

  const parsed = definition.parseParameters(rawParameters);
  if (!parsed.success) {
    return resultEnvelope(
      definition,
      frame,
      null,
      rawParameters,
      context,
      'invalid',
      {},
      parsed.diagnostics,
      inputs,
    );
  }

  const normalizedParameters = Object.freeze({ ...parsed.value });
  const computation = definition.compute(frame, parsed.value, inputs);
  if (computation.status !== 'ok') {
    return resultEnvelope(
      definition,
      frame,
      normalizedParameters,
      normalizedParameters,
      context,
      computation.status,
      {},
      computation.diagnostics,
      inputs,
    );
  }

  const outputValidation = validateIndicatorOutputs(
    definition as TimeSeriesIndicatorDefinition<object>,
    computation.outputs,
    frame.bars.length,
  );
  if (!outputValidation.valid) {
    return resultEnvelope(
      definition,
      frame,
      normalizedParameters,
      normalizedParameters,
      context,
      'invalid',
      {},
      outputValidation.diagnostics,
      inputs,
    );
  }

  return resultEnvelope(
    definition,
    frame,
    normalizedParameters,
    normalizedParameters,
    context,
    'ok',
    computation.outputs,
    computation.diagnostics ?? [],
    inputs,
  );
}
