import { buildCategoryPresentationEntries } from '../shared/category-presentation';
import { VOLATILITY_DEFINITIONS } from './definitions';

const ARABIC_NAMES = [
  'متوسط النطاق الحقيقي', 'نسبة متوسط النطاق الحقيقي', 'متوسط النطاق الحقيقي المعياري', 'نطاقات بولينجر',
  'نسبة بولينجر المئوية', 'عرض نطاقات بولينجر', 'انضغاط بولينجر', 'قنوات كيلتنر', 'حالة انضغاط تي تي إم',
  'قنوات دونشيان', 'قناة السعر', 'الانحراف المعياري', 'التقلب التاريخي', 'تقلب باركنسون', 'تقلب جارمان كلاس',
  'تقلب روجرز ساتشيل', 'تقلب يانج تشانج', 'تقلب تشايكين', 'مؤشر التقلب النسبي', 'مؤشر القرحة',
  'مؤشر التذبذب الجانبي', 'الرتبة المئوية للتقلب', 'نظام التقلب', 'مؤشر توسع النطاق', 'متوسط النطاق اليومي',
  'الحركة المتوقعة من التقلب', 'وقف متحرك بمتوسط النطاق الحقيقي', 'خروج تشاندلير', 'وقف التقلب',
  'نسبة نطاق الأعلى والأدنى', 'تقلب الفجوات', 'شبه التقلب المحقق',
] as const;

export const VOLATILITY_PRESENTATION_ENTRIES = buildCategoryPresentationEntries(VOLATILITY_DEFINITIONS, {
  arabicNames: ARABIC_NAMES,
  decimalKeys: ['deviation', 'threshold', 'multiplier', 'bollingerDeviation', 'keltnerMultiplier', 'confidencePct'],
  histogramKeys: ['momentum', 'positive_gap', 'negative_gap'],
});
