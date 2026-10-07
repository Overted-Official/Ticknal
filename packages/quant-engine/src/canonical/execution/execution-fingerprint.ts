import type {
  IndicatorInputBundle,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from '../contracts';
import {
  EMPTY_INDICATOR_INPUT_BUNDLE,
  listContextualInputProvenance,
} from '../contracts/contextual-inputs';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function fnv1a64(value: string): string {
  let hash = BigInt('0xcbf29ce484222325');
  const prime = BigInt('0x100000001b3');
  const mask = BigInt('0xffffffffffffffff');

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(16, '0');
}

export function createExecutionFingerprint<P extends object>(
  definition: TimeSeriesIndicatorDefinition<P>,
  frame: TimeSeriesFrame,
  normalizedParameters: P | Readonly<Record<string, unknown>>,
  inputs: IndicatorInputBundle = EMPTY_INDICATOR_INPUT_BUNDLE,
): string {
  const firstObservation = frame.bars[0]?.time ?? null;
  const lastObservation = frame.bars.at(-1)?.time ?? null;
  const payload = {
    engineSchemaVersion: 1,
    identity: {
      backlogId: definition.backlogId,
      id: definition.id,
      formulaVersion: definition.formulaVersion,
      definitionSchemaVersion: definition.definitionSchemaVersion,
    },
    parameters: normalizedParameters,
    input: {
      instrumentId: frame.meta.instrumentId,
      requestedTimeframe: frame.meta.requestedTimeframe,
      effectiveTimeframe: frame.meta.effectiveTimeframe,
      sourceRevision: frame.meta.sourceRevision,
      adjustmentMode: frame.meta.adjustmentMode,
      adjustmentRevision: frame.meta.adjustmentRevision,
      barCount: frame.bars.length,
      firstObservation,
      lastObservation,
    },
    contextualInputs: listContextualInputProvenance(inputs),
  };

  return `ce1-${fnv1a64(stableStringify(payload))}`;
}
