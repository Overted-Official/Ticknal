/**
 * Canonical Egyptian Exchange (EGX) Sector & Industry Arabic Translations
 */

export const EGX_SECTOR_TRANSLATIONS_AR: Record<string, string> = {
  // Sectors & GICS Names
  'Real Estate': 'العقارات',
  'Banks': 'البنوك',
  'Banking': 'البنوك',
  'Basic Resources': 'الموارد الأساسية',
  'Food & Beverage': 'الأغذية والمشروبات',
  'Food, Beverage and Tobacco': 'الأغذية والمشروبات والتبغ',
  'Non-bank financial services': 'خدمات مالية غير مصرفية',
  'Non-Bank Financial Services': 'خدمات مالية غير مصرفية',
  'Financial Services (excluding Banks)': 'خدمات مالية باستثناء البنوك',
  'Financial Services': 'الخدمات المالية',
  'Industrial Goods and Services and Automobiles': 'سلع وخدمات صناعية وسيارات',
  'Industrial Goods, Services and Automobiles': 'سلع وخدمات صناعية وسيارات',
  'Industrial Goods': 'سلع وخدمات صناعية',
  'Industrial': 'الصناعة',
  'Building Materials': 'مواد البناء',
  'Contracting and Construction Services': 'مقاولات وخدمات هندسية',
  'Contracting & Construction Services': 'مقاولات وخدمات هندسية',
  'Healthcare and Pharmaceuticals': 'رعاية صحية وأدوية',
  'Health Care & Pharmaceuticals': 'رعاية صحية وأدوية',
  'Healthcare': 'الرعاية الصحية',
  'Travel and Leisure': 'سياحة وترفيه',
  'Travel & Leisure': 'سياحة وترفيه',
  'Tourism & Entertainment': 'سياحة وترفيه',
  'Telecommunications, Media and Technology (TMT)': 'اتصالات وإعلام وتكنولوجيا',
  'Telecommunications': 'الاتصالات',
  'Technology': 'التكنولوجيا',
  'Trade and Distributors': 'تجارة وموزعون',
  'Trade & Distributors': 'تجارة وموزعون',
  'Shipping and Transportation Services': 'خدمات نقل وشحن',
  'Shipping & Transportation Services': 'خدمات نقل وشحن',
  'Education Services': 'خدمات تعليمية',
  'Utilities': 'المرافق',
  'Energy': 'الطاقة',
  'Consumer Goods': 'السلع الاستهلاكية',
  'Equities': 'الأسهم',
};

export function localizeSectorName(name?: string | null, locale: string = 'en'): string {
  if (!name) return '';
  if (locale !== 'ar') return name;
  return EGX_SECTOR_TRANSLATIONS_AR[name] || name;
}

export const ROTATION_REGIME_TRANSLATIONS_AR: Record<string, string> = {
  Leading: 'رائد ومتقدم',
  Improving: 'في تحسن',
  Weakening: 'في ضعف',
  Lagging: 'متراجع ومتأخر',
};

export function localizeRegimeName(regime?: string | null, locale: string = 'en'): string {
  if (!regime) return '';
  if (locale !== 'ar') return regime;
  return ROTATION_REGIME_TRANSLATIONS_AR[regime] || regime;
}
