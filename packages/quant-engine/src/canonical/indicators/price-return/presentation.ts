import type {
  IndicatorParameterDefinition,
  IndicatorPresentationEntry,
  IndicatorVisualDescriptor,
  LocalizedText,
} from '../../contracts';

const LOOKBACK_LABEL = Object.freeze({ en: 'Lookback', ar: 'عدد الفترات' });
const ZERO_LEVEL = Object.freeze({ value: 0, colorRole: 'muted', lineStyle: 'dashed' } as const);

function lookback(defaultValue: number): IndicatorParameterDefinition {
  return Object.freeze({
    kind: 'integer',
    key: 'lookback',
    label: LOOKBACK_LABEL,
    defaultValue,
    min: 1,
    max: 5000,
    step: 1,
  });
}

function text(en: string, ar: string): LocalizedText {
  return Object.freeze({ en, ar });
}

function line(
  outputKey: string,
  surface: IndicatorVisualDescriptor['surface'],
  colorRole: IndicatorVisualDescriptor['colorRole'],
  extras: Partial<IndicatorVisualDescriptor> = {},
): IndicatorVisualDescriptor {
  return Object.freeze({
    outputKey,
    surface,
    renderer: 'line',
    colorRole,
    lineWidth: 2,
    ...extras,
  });
}

function histogram(
  outputKey: string,
  colorRole: IndicatorVisualDescriptor['colorRole'],
): IndicatorVisualDescriptor {
  return Object.freeze({
    outputKey,
    surface: 'pane',
    renderer: 'histogram',
    colorRole,
    paneGroup: 'primary',
    referenceLevels: Object.freeze([ZERO_LEVEL]),
  });
}

function entry(
  backlogId: string,
  id: string,
  en: string,
  ar: string,
  defaultParameters: Readonly<Record<string, unknown>>,
  parameters: readonly IndicatorParameterDefinition[],
  visuals: readonly IndicatorVisualDescriptor[],
): IndicatorPresentationEntry {
  return Object.freeze({
    backlogId,
    id,
    formulaVersion: '1.0.0',
    name: text(en, ar),
    defaultParameters: Object.freeze({ ...defaultParameters }),
    parameters: Object.freeze([...parameters]),
    visuals: Object.freeze([...visuals]),
  });
}

export const PRICE_RETURN_PRESENTATION_ENTRIES = Object.freeze([
  entry('PRC-001', 'close-price', 'Close price', 'سعر الإغلاق', {}, [], [line('close', 'overlay', 'positive')]),
  entry('PRC-002', 'open-price', 'Open price', 'سعر الافتتاح', {}, [], [line('open', 'overlay', 'secondary')]),
  entry('PRC-003', 'high-low', 'High and low', 'أعلى وأدنى سعر', {}, [], [
    line('high', 'overlay', 'positive'),
    line('low', 'overlay', 'negative'),
    { outputKey: 'range', surface: 'legend', renderer: 'value', colorRole: 'warning' },
  ]),
  entry('PRC-004', 'hl2-median-price', 'HL2 median price', 'السعر الوسيط HL2', {}, [], [line('hl2', 'overlay', 'secondary')]),
  entry('PRC-005', 'hlc3-typical-price', 'HLC3 typical price', 'السعر النموذجي HLC3', {}, [], [line('hlc3', 'overlay', 'primary')]),
  entry('PRC-006', 'ohlc4-average-price', 'OHLC4 average price', 'متوسط السعر OHLC4', {}, [], [line('ohlc4', 'overlay', 'warning')]),
  entry('PRC-007', 'weighted-close', 'Weighted close', 'الإغلاق المرجّح', {}, [], [line('hlcc4', 'overlay', 'primary')]),
  entry('PRC-008', 'absolute-change', 'Absolute change', 'التغير المطلق', { lookback: 1 }, [lookback(1)], [histogram('change', 'primary')]),
  entry('PRC-009', 'percentage-change', 'Percentage change', 'التغير النسبي', { lookback: 1 }, [lookback(1)], [histogram('return_pct', 'primary')]),
  entry('PRC-010', 'log-return', 'Log return', 'العائد اللوغاريتمي', { lookback: 1 }, [lookback(1)], [histogram('log_return', 'secondary')]),
  entry('PRC-011', 'cumulative-return', 'Cumulative return', 'العائد التراكمي', { anchor: 'first-observation' }, [
    { kind: 'anchor-date', key: 'anchor', label: text('Anchor', 'نقطة البداية'), defaultValue: 'first-observation', allowFirstObservation: true },
  ], [line('cumulative_return', 'pane', 'positive', { paneGroup: 'primary', referenceLevels: [ZERO_LEVEL] })]),
  entry('PRC-012', 'gap-percentage', 'Gap percentage', 'فجوة السعر', {}, [], [
    histogram('gap_pct', 'warning'),
    { outputKey: 'direction', surface: 'legend', renderer: 'category', colorRole: 'muted' },
  ]),
  entry('PRC-013', 'intrabar-return', 'Intrabar return', 'العائد داخل الفترة', {}, [], [histogram('body_return_pct', 'primary')]),
  entry('PRC-014', 'high-low-range-percentage', 'High-low range percentage', 'نسبة نطاق الأعلى والأدنى', {}, [], [line('range_pct', 'pane', 'warning', { paneGroup: 'primary' })]),
  entry('PRC-015', 'true-range', 'True range', 'النطاق الحقيقي', {}, [], [line('true_range', 'pane', 'warning', { paneGroup: 'primary' })]),
  entry('PRC-016', 'rolling-high-low', 'Rolling high and low', 'أعلى وأدنى متحرك', { lookback: 20 }, [lookback(20)], [
    line('highest', 'overlay', 'positive'),
    line('lowest', 'overlay', 'negative'),
  ]),
  entry('PRC-017', 'distance-from-high-low', 'Distance from high or low', 'المسافة من الأعلى والأدنى', { lookback: 20 }, [lookback(20)], [
    line('distance_from_high_pct', 'pane', 'negative', { paneGroup: 'primary', referenceLevels: [ZERO_LEVEL] }),
    line('distance_from_low_pct', 'pane', 'positive', { paneGroup: 'primary' }),
  ]),
  entry('PRC-018', 'drawdown-series', 'Drawdown series', 'سلسلة التراجع', {}, [], [
    line('peak', 'overlay', 'warning'),
    { outputKey: 'drawdown_pct', surface: 'pane', renderer: 'area', colorRole: 'negative', lineWidth: 2, paneGroup: 'primary', referenceLevels: [ZERO_LEVEL] },
  ]),
  entry('PRC-019', 'price-percentile-rank', 'Price percentile rank', 'الترتيب المئوي للسعر', { lookback: 20 }, [lookback(20)], [
    line('percentile_0_100', 'pane', 'secondary', {
      paneGroup: 'primary',
      referenceLevels: [
        { value: 20, label: text('Lower zone', 'المنطقة المنخفضة'), colorRole: 'positive', lineStyle: 'dashed' },
        { value: 80, label: text('Upper zone', 'المنطقة المرتفعة'), colorRole: 'negative', lineStyle: 'dashed' },
      ],
    }),
  ]),
  entry('PRC-020', 'rolling-vwap-source', 'Rolling VWAP source', 'متوسط السعر المتحرك المرجّح بالحجم', { lookback: 20, source: 'hlc3' }, [
    lookback(20),
    {
      kind: 'select',
      key: 'source',
      label: text('Price source', 'مصدر السعر'),
      defaultValue: 'hlc3',
      options: Object.freeze([
        { value: 'close', label: text('Close', 'الإغلاق') },
        { value: 'hl2', label: text('HL2', 'HL2') },
        { value: 'hlc3', label: text('HLC3', 'HLC3') },
        { value: 'ohlc4', label: text('OHLC4', 'OHLC4') },
      ]),
    },
  ], [line('rolling_vwap', 'overlay', 'warning')]),
] as const satisfies readonly IndicatorPresentationEntry[]);
