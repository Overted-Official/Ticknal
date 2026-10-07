import type {
  IndicatorParameterDefinition,
  IndicatorPresentationEntry,
  IndicatorVisualDescriptor,
  LocalizedText,
  TimeSeriesIndicatorDefinition,
} from '../../contracts';

export interface CategoryPresentationOptions {
  readonly arabicNames: readonly string[];
  readonly decimalKeys?: readonly string[];
  readonly histogramKeys?: readonly string[];
}

function text(en: string, ar = en): LocalizedText {
  return Object.freeze({ en, ar });
}

function makeParameter(
  key: string,
  defaultValue: unknown,
  decimalKeys: ReadonlySet<string>,
): IndicatorParameterDefinition {
  if (typeof defaultValue === 'string') {
    if (/symbol$/i.test(key)) {
      return Object.freeze({
        kind: 'symbol', key, label: text(key), defaultValue,
        placeholder: text('EGX ticker or index symbol', 'رمز السهم أو المؤشر'),
      });
    }
    if (key === 'indicatorIds') {
      return Object.freeze({
        kind: 'text', key, label: text(key), defaultValue,
        placeholder: text('Comma-separated indicator IDs', 'معرّفات المؤشرات مفصولة بفواصل'),
      });
    }
    const values = key === 'currency' ? ['EGP', 'USD'] : [defaultValue];
    return Object.freeze({
      kind: 'select',
      key,
      label: text(key),
      defaultValue,
      options: Object.freeze(values.map((value) => Object.freeze({ value, label: text(value) }))),
    });
  }
  if (typeof defaultValue !== 'number') throw new TypeError(`Unsupported parameter ${key}`);
  return decimalKeys.has(key)
    ? Object.freeze({ kind: 'number', key, label: text(key), defaultValue, min: defaultValue <= 0 ? -10000 : 0.0001, max: 10000, step: 0.01 })
    : Object.freeze({ kind: 'integer', key, label: text(key), defaultValue, min: 1, max: 5000, step: 1 });
}

function makeVisual(
  output: TimeSeriesIndicatorDefinition<object>['metadata']['outputs'][number],
  histogramKeys: ReadonlySet<string>,
): IndicatorVisualDescriptor {
  if (output.kind === 'boolean') {
    return Object.freeze({
      outputKey: output.key,
      surface: 'overlay',
      renderer: 'marker',
      colorRole: output.key.includes('bear') || output.key.includes('down') ? 'negative' : 'positive',
    });
  }
  if (output.kind === 'category') {
    return Object.freeze({ outputKey: output.key, surface: 'legend', renderer: 'category', colorRole: 'muted' });
  }
  const surface = output.placement === 'overlay' ? 'overlay' : 'pane';
  return Object.freeze({
    outputKey: output.key,
    surface,
    allowedSurfaces: Object.freeze(['overlay', 'pane'] as const),
    renderer: histogramKeys.has(output.key) ? 'histogram' : 'line',
    colorRole: output.key.includes('bear') || output.key.includes('down') || output.key.includes('lower') || output.key.includes('minus')
      ? 'negative'
      : output.key.includes('bull') || output.key.includes('up') || output.key.includes('upper') || output.key.includes('plus')
        ? 'positive'
        : 'primary',
    lineWidth: 2,
    paneGroup: surface === 'pane' ? 'primary' : undefined,
    referenceLevels: surface === 'pane'
      ? Object.freeze([{ value: 0, colorRole: 'muted', lineStyle: 'dashed' }] as const)
      : undefined,
  });
}

export function buildCategoryPresentationEntries(
  definitions: readonly TimeSeriesIndicatorDefinition<object>[],
  options: CategoryPresentationOptions,
): readonly IndicatorPresentationEntry[] {
  if (definitions.length !== options.arabicNames.length) {
    throw new Error('Arabic presentation name coverage mismatch');
  }
  const decimalKeys = new Set(options.decimalKeys ?? []);
  const histogramKeys = new Set(options.histogramKeys ?? ['histogram', 'score']);
  return Object.freeze(definitions.map((definition, index) => {
    const defaults = definition.metadata.defaultParameters;
    return Object.freeze({
      backlogId: definition.backlogId,
      id: definition.id,
      formulaVersion: definition.formulaVersion,
      name: text(definition.metadata.name, options.arabicNames[index]),
      parameters: Object.freeze(Object.entries(defaults).map(([key, value]) => makeParameter(key, value, decimalKeys))),
      defaultParameters: defaults,
      visuals: Object.freeze(definition.metadata.outputs.map((output) => makeVisual(output, histogramKeys))),
    });
  }));
}
