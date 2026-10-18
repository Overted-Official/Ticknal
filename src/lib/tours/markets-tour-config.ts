import { TourStep } from '@/components/ui/tour';

export const MARKETS_TOUR_STORAGE_KEY = 'ticknal_markets_tour_v1';

export function getMarketsTourSteps(isAr: boolean): TourStep[] {
  return [
    {
      target: '[data-tour="markets-overview"]',
      title: isAr ? 'نظرة عامة على السوق ومؤشرات الأداء' : 'Market Overview & Key Benchmarks',
      content: isAr
        ? 'تابع أداء مؤشرات البورصة المصرية الرئيسية (EGX30 و EGX70)، اتساع السوق بين الشركات الصاعدة والهابطة، إجمالي قيم التداول، وتدفقات رؤوس الأموال المؤسسية.'
        : 'Track headline EGX benchmarks (EGX30, EGX70), market breadth (advancers vs. decliners), daily turnover, and institutional capital flows across Egyptian, Arab, and Foreign participants.',
      placement: 'bottom',
      padding: 12,
    },
    {
      target: '[data-tour="markets-fx"]',
      title: isAr ? 'مخاطر العملة وأسعار الصرف المتوازية' : 'FX & Currency Risk Barometer',
      content: isAr
        ? 'راقب القيمة العادلة المرجحة للجنيه، دولار الصاغة المشتق من الذهب المحلي، دولار شهادات CIB في لندن، ومؤشر ضغط التعويم مع نمو المعروض النقدي M2.'
        : 'Monitor triangulated EGP shadow fair value, Sagha gold rate proxy, offshore London CIB arbitrage, and ATR-weighted devaluation pressure alongside M2 money supply expansion.',
      placement: 'top',
      padding: 12,
    },
    {
      target: '[data-tour="markets-sector-rotation"]',
      title: isAr ? 'مصفوفة دوران القطاعات (RRG)' : 'Sector Rotation Matrix (RRG)',
      content: isAr
        ? 'اكتشف القطاعات الرائدة والناشئة ذات العائد المتفوق على مؤشر السوق، لرصد التدوير المؤسسي للسيولة وتحديد القطاعات التي تستعد للانطلاق.'
        : 'Explore Relative Rotation Graphs (RRG) to identify Leading, Weakening, Lagging, and Improving sectors outperforming the benchmark and anticipate capital rotation.',
      placement: 'top',
      padding: 12,
    },
    {
      target: '[data-tour="markets-heatmap"]',
      title: isAr ? 'خريطة السوق التفاعلية (Heatmap)' : 'Interactive Market Treemap',
      content: isAr
        ? 'خريطة مرئية لكافة أسهم البورصة المصرية مصنفة حسب القطاعات وموزونة بقيم أو أحجام التداول، تتيح لك فحص أداء كل سهم والوصول السريع لبياناته.'
        : 'Visual hierarchy of all EGX listed stocks sized by turnover, volume, or equal weight, color-coded by performance with 1-click drilldown into constituent data.',
      placement: 'top',
      padding: 12,
    },
    {
      target: '[data-tour="markets-floating-nav"]',
      title: isAr ? 'شريط التنقل السريع بين الأقسام' : 'Markets Quick Navigator',
      content: isAr
        ? 'تنقل بسلاسة وبضغطة واحدة بين مؤشرات السوق الكلية، مخاطر العملة، مصفوفة القطاعات، وخريطة الأسهم في أي وقت.'
        : 'Instantly jump between Market Overview, FX Risk, Sector Rotation, and the Treemap Heatmap anywhere on the page.',
      placement: 'bottom',
      padding: 8,
    },
  ];
}
