import type {
  IndicatorParameterDefinition,
  IndicatorPresentationEntry,
  IndicatorVisualDescriptor,
  LocalizedText,
} from '../../contracts';
import { TREND_DEFINITIONS } from './definitions';

const ARABIC_NAMES = [
  'المتوسط المتحرك البسيط', 'المتوسط المتحرك الأسي', 'المتوسط المتحرك المرجح', 'متوسط وايلدر المتحرك',
  'المتوسط الأسي المزدوج', 'المتوسط الأسي الثلاثي', 'متوسط هال المتحرك', 'متوسط كوفمان المتكيف',
  'المتوسط المتحرك المتكيف كسرياً', 'المتوسط الديناميكي المتغير', 'مؤشر ماكجينلي الديناميكي', 'متوسط أرنو ليجو المتحرك',
  'متوسط المربعات الصغرى', 'المتوسط المتحرك المثلثي', 'المتوسط الأسي صفري التأخر', 'شريط المتوسطات المتحركة',
  'متوسطات جوبي المتعددة', 'ميل المتوسط المتحرك', 'المسافة من المتوسط المتحرك', 'فارق المتوسطات المتحركة',
  'تقاطع المتوسطات المتحركة', 'انضغاط المتوسطات المتحركة', 'درجة اتجاه المتوسطات', 'مؤشر تقارب وتباعد المتوسطات',
  'مذبذب السعر النسبي', 'مذبذب الحجم النسبي', 'مؤشر تريكس', 'مؤشر أرون', 'مؤشر الدوامة',
  'مؤشر الحركة الاتجاهية', 'متوسط مؤشر الحركة الاتجاهية', 'تصنيف متوسط الحركة الاتجاهية', 'سوبر ترند',
  'مؤشر الوقف والانعكاس المكافئ', 'سحابة إيشيموكو', 'حالة اتجاه دونشيان', 'حالة اتجاه تشاندلير',
  'مؤشر شدة الاتجاه', 'مرشح الاتجاه الأفقي والرأسي', 'مؤشر الكتلة',
] as const;

const DECIMAL_KEYS = new Set(['multiplier', 'stepPct', 'maximumPct', 'offsetPct', 'sigma']);
const HISTOGRAM_KEYS = new Set(['histogram', 'score', 'slope']);

function text(en: string, ar = en): LocalizedText {
  return Object.freeze({ en, ar });
}

function parameter(key: string, defaultValue: unknown): IndicatorParameterDefinition {
  if (typeof defaultValue !== 'number') {
    throw new TypeError(`Unsupported Trend parameter ${key}`);
  }
  if (DECIMAL_KEYS.has(key)) {
    return Object.freeze({
      kind: 'number', key, label: text(key), defaultValue, min: 0.01, max: 100, step: 0.01,
    });
  }
  return Object.freeze({
    kind: 'integer', key, label: text(key), defaultValue, min: 1, max: 5000, step: 1,
  });
}

function visual(
  output: (typeof TREND_DEFINITIONS)[number]['metadata']['outputs'][number],
): IndicatorVisualDescriptor {
  if (output.kind === 'boolean') {
    return Object.freeze({ outputKey: output.key, surface: 'overlay', renderer: 'marker', colorRole: output.key.includes('down') ? 'negative' : 'positive' });
  }
  if (output.kind === 'category') {
    return Object.freeze({ outputKey: output.key, surface: 'legend', renderer: 'category', colorRole: 'muted' });
  }
  const surface = output.placement === 'overlay' ? 'overlay' : 'pane';
  return Object.freeze({
    outputKey: output.key,
    surface,
    allowedSurfaces: Object.freeze(['overlay', 'pane'] as const),
    renderer: HISTOGRAM_KEYS.has(output.key) ? 'histogram' : 'line',
    colorRole: output.key.includes('down') || output.key.includes('minus') || output.key.includes('lower') ? 'negative' : output.key.includes('up') || output.key.includes('plus') || output.key.includes('upper') ? 'positive' : 'primary',
    lineWidth: 2,
    paneGroup: surface === 'pane' ? 'primary' : undefined,
    referenceLevels: surface === 'pane' ? Object.freeze([{ value: 0, colorRole: 'muted', lineStyle: 'dashed' }] as const) : undefined,
  });
}

export const TREND_PRESENTATION_ENTRIES: readonly IndicatorPresentationEntry[] = Object.freeze(
  TREND_DEFINITIONS.map((definition, index) => {
    const defaults = definition.metadata.defaultParameters;
    return Object.freeze({
      backlogId: definition.backlogId,
      id: definition.id,
      formulaVersion: definition.formulaVersion,
      name: text(definition.metadata.name, ARABIC_NAMES[index]),
      parameters: Object.freeze(Object.entries(defaults).map(([key, value]) => parameter(key, value))),
      defaultParameters: defaults,
      visuals: Object.freeze(definition.metadata.outputs.map(visual)),
    });
  }),
);
