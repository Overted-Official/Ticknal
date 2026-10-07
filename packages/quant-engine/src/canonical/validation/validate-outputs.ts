import {
  createDiagnostic,
  type Diagnostic,
  type IndicatorOutputs,
  type TimeSeriesIndicatorDefinition,
  type ValidationResult,
} from '../contracts';

function isValueOfKind(value: unknown, kind: 'number' | 'boolean' | 'category'): boolean {
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (kind === 'boolean') return typeof value === 'boolean';
  return typeof value === 'string';
}

export function validateIndicatorOutputs(
  definition: TimeSeriesIndicatorDefinition<object>,
  outputs: IndicatorOutputs,
  barCount: number,
): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  const declaredKeys = new Set(definition.metadata.outputs.map((output) => output.key));

  for (const output of definition.metadata.outputs) {
    const series = outputs[output.key];
    if (series === undefined) {
      diagnostics.push(
        createDiagnostic('OUTPUT_INVARIANT_FAILED', 'indicator.output.missing', {
          output: output.key,
        }),
      );
      continue;
    }

    if (series.length !== barCount) {
      diagnostics.push(
        createDiagnostic('OUTPUT_INVARIANT_FAILED', 'indicator.output.lengthMismatch', {
          output: output.key,
          expected: barCount,
          actual: series.length,
        }),
      );
    }

    series.forEach((value, index) => {
      if (value === null) {
        if (!output.nullable) {
          diagnostics.push(
            createDiagnostic('OUTPUT_INVARIANT_FAILED', 'indicator.output.unexpectedNull', {
              output: output.key,
              index,
            }),
          );
        }
        return;
      }

      if (!isValueOfKind(value, output.kind)) {
        diagnostics.push(
          createDiagnostic('OUTPUT_INVARIANT_FAILED', 'indicator.output.invalidValue', {
            output: output.key,
            index,
            kind: output.kind,
          }),
        );
      }
    });
  }

  for (const outputKey of Object.keys(outputs)) {
    if (!declaredKeys.has(outputKey)) {
      diagnostics.push(
        createDiagnostic('OUTPUT_INVARIANT_FAILED', 'indicator.output.undeclared', {
          output: outputKey,
        }),
      );
    }
  }

  return { valid: diagnostics.length === 0, diagnostics };
}
