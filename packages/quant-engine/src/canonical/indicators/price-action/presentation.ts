import { buildCategoryPresentationEntries } from '../shared/category-presentation';
import { PRICE_ACTION_DEFINITIONS } from './definitions';

const ARABIC_NAMES = ['تشريح الشمعة', 'عائلة الدوجي', 'المطرقة والرجل المشنوق', 'المطرقة المقلوبة والشهاب', 'الابتلاع الصعودي والهبوطي', 'هارامي', 'الخط الثاقب والسحابة الداكنة', 'نجمة الصباح والمساء', 'الجنود البيض والغربان السود', 'ماروبوزو', 'الشمعة الداخلية', 'الشمعة الخارجية', 'شمعة البن بار', 'قمة وقاع الملقط', 'فجوة صاعدة وهابطة', 'أضيق نطاق 4 و7', 'شمعة واسعة النطاق', 'شمعة ذروة الحجم', 'درجة شمعة الانعكاس', 'مرشح نمط متعدد الشموع'] as const;
export const PRICE_ACTION_PRESENTATION_ENTRIES = buildCategoryPresentationEntries(PRICE_ACTION_DEFINITIONS, { arabicNames: ARABIC_NAMES, decimalKeys: ['bodyThresholdPct', 'wickRatio', 'penetrationPct', 'smallBodyRatio', 'wickTolerancePct', 'tolerancePct', 'ratioThreshold', 'volumeRatio', 'rangeRatio', 'minimumBodyPct'], histogramKeys: ['score', 'body_pct', 'range_ratio'] });
