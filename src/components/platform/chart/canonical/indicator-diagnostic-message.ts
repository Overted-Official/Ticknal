import type { Diagnostic, DiagnosticCode } from '@ticknal/quant-engine/canonical';

function diagnosticDetail(diagnostic: Diagnostic): string | null {
  const fields = diagnostic.fields;
  if (!fields) return null;
  for (const key of ['role', 'modelId', 'capability', 'field', 'sourceId', 'tradeId', 'output', 'parameter', 'index']) {
    const value = fields[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

const DIAGNOSTIC_MESSAGES: Readonly<Record<DiagnosticCode, Readonly<{ en: string; ar: string }>>> = {
  INPUT_DUPLICATE_TIMESTAMP: { en: 'Contextual data contains duplicate timestamps', ar: 'تحتوي البيانات السياقية على توقيتات مكررة' },
  INPUT_TIMESTAMP_ORDER: { en: 'Input timestamps are not in chronological order', ar: 'توقيتات البيانات ليست مرتبة زمنياً' },
  INPUT_INVALID_TIMESTAMP: { en: 'Input data contains an invalid timestamp', ar: 'تحتوي البيانات على توقيت غير صالح' },
  INPUT_NON_FINITE: { en: 'Input data contains an invalid numeric value', ar: 'تحتوي البيانات على قيمة رقمية غير صالحة' },
  INPUT_INVALID_OHLC: { en: 'Price data contains an invalid OHLC bar', ar: 'تحتوي بيانات السعر على شمعة غير صالحة' },
  INPUT_NEGATIVE_VOLUME: { en: 'Volume data contains a negative value', ar: 'تحتوي بيانات الحجم على قيمة سالبة' },
  INPUT_NEGATIVE_TRADES: { en: 'Trade-count data contains a negative value', ar: 'تحتوي بيانات عدد الصفقات على قيمة سالبة' },
  INPUT_SOURCE_REVISION_MISSING: { en: 'The data source revision is missing', ar: 'إصدار مصدر البيانات غير متاح' },
  INPUT_TIMEFRAME_MISMATCH: { en: 'Contextual data uses an incompatible timeframe', ar: 'الإطار الزمني للبيانات السياقية غير متوافق' },
  INPUT_FIELD_COUNTS_MISMATCH: { en: 'Input fields contain different numbers of observations', ar: 'حقول البيانات تحتوي على أعداد مختلفة من المشاهدات' },
  INPUT_FIELD_COVERAGE_MISMATCH: { en: 'Input field coverage is incomplete', ar: 'تغطية حقول البيانات غير مكتملة' },
  PARAMETER_INVALID: { en: 'An indicator setting is invalid', ar: 'أحد إعدادات المؤشر غير صالح' },
  DATA_FIELD_MISSING: { en: 'Required market data is unavailable', ar: 'بيانات السوق المطلوبة غير متاحة' },
  DATA_CAPABILITY_MISSING: { en: 'Required market data is unavailable', ar: 'بيانات السوق المطلوبة غير متاحة' },
  DATA_FREQUENCY_UNAVAILABLE: { en: 'The required data frequency is unavailable', ar: 'تردد البيانات المطلوب غير متاح' },
  HISTORY_INSUFFICIENT: { en: 'There is not enough history to calculate this indicator', ar: 'لا يوجد سجل زمني كافٍ لحساب هذا المؤشر' },
  NUMERIC_DIVIDE_BY_ZERO: { en: 'The indicator cannot divide by zero', ar: 'لا يمكن للمؤشر القسمة على صفر' },
  NUMERIC_DOMAIN_ERROR: { en: 'The indicator received values outside its valid range', ar: 'استقبل المؤشر قيماً خارج النطاق الصالح' },
  OUTPUT_INVARIANT_FAILED: { en: 'The indicator returned an invalid result', ar: 'أرجع المؤشر نتيجة غير صالحة' },
};

function withDetail(message: string, detail: string | null): string {
  return detail ? `${message}: ${detail}.` : `${message}.`;
}

export function formatIndicatorDiagnostic(
  diagnostic: Diagnostic,
  locale: 'en' | 'ar',
): string {
  const detail = diagnosticDetail(diagnostic);
  if (diagnostic.code === 'DATA_CAPABILITY_MISSING' || diagnostic.code === 'DATA_FIELD_MISSING') {
    if (locale === 'ar') return detail
      ? `البيانات المطلوبة غير متاحة: ${detail}.`
      : 'البيانات المطلوبة غير متاحة.';
    return detail ? `Missing required data: ${detail}.` : 'Required market data is unavailable.';
  }
  if (diagnostic.code === 'INPUT_DUPLICATE_TIMESTAMP') {
    return withDetail(DIAGNOSTIC_MESSAGES.INPUT_DUPLICATE_TIMESTAMP[locale], detail);
  }
  if (diagnostic.messageKey === 'indicator.context.tradeChronologyInvalid') {
    const message = locale === 'ar'
      ? 'توجد صفقة مكتملة وقت خروجها قبل وقت دخولها'
      : 'A completed trade has an exit before its entry';
    return withDetail(message, detail);
  }
  return withDetail(DIAGNOSTIC_MESSAGES[diagnostic.code][locale], detail);
}
