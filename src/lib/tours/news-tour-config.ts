import { TourStep } from '@/components/ui/tour';

export const NEWS_TOUR_STORAGE_KEY = 'ticknal_news_tour_v1';

export function getNewsTourSteps(isAr: boolean): TourStep[] {
  return [
    {
      target: '[data-tour="news-categories-nav"]',
      title: isAr ? 'قنوات الأخبار والتصنيفات الاستثمارية' : 'Market Wire & Category Channels',
      content: isAr
        ? 'تنقل فوري بين تحليلات نبض تكنال الخاصة، قرارات وسياسات البنك المركزي المصري، إفصاحات شركات البورصة، صناديق الاستثمار، وأسواق الذهب والفضة.'
        : 'Quickly switch channels across Ticknal Take editorial briefings, Central Bank of Egypt (CBE) macroeconomic policies, EGX listed company disclosures, mutual investment funds, and precious metals (Gold & Silver).',
      placement: 'bottom',
      padding: 10,
    },
    {
      target: '[data-tour="news-sidebar-filters"]',
      title: isAr ? 'البحث والتصفية بالشركات والأسهم' : 'Ticker Filter & Full-Text Search',
      content: isAr
        ? 'ابحث فورياً في أرشيف الأخبار أو اضغط على أي سهم متداول (مثل @COMI أو @TMGH أو @GOLD21K) لتصفية وعزل الإفصاحات والتقارير الخاصة به.'
        : 'Search across the entire news archive or click any trending EGX ticker (like @COMI, @TMGH, or @GOLD21K) to isolate company-specific disclosures and corporate filings.',
      placement: 'right',
      padding: 12,
    },
    {
      target: '[data-tour="news-feed-timeline"]',
      title: isAr ? 'شريط الأخبار اللحظي وقارئ الإفصاحات' : 'Institutional News Stream & Reading Drawer',
      content: isAr
        ? 'استعرض شريط الأخبار المباشر المصحوب بتقييمات التأثير ومؤشرات المشاعر اللحظية. اضغط على أي منشور لفتح درج القراءة الكامل بدون تشتيت مع مراجع التقرير.'
        : 'Read live institutional market briefs with algorithmic sentiment tags and impact indicators. Click any post to open the distraction-free reading drawer with deep source references.',
      placement: 'top',
      padding: 12,
    },
    {
      target: '[data-tour="news-refresh-btn"]',
      title: isAr ? 'تحديث تدفق الأخبار اللحظي' : 'Live Wire Refresh',
      content: isAr
        ? 'اضغط هنا للتحديث الفوري وإعادة مزامنة الأخبار والإفصاحات الرسمية الجديدة الصادرة عن البورصة المصرية ومصادر البيانات الكلية.'
        : 'Trigger an immediate background synchronization with EGX company wires and macroeconomic feeds at any time.',
      placement: 'bottom',
      padding: 8,
    },
  ];
}
