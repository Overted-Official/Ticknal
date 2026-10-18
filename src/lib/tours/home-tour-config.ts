import { TourStep } from '@/components/ui/tour';

export const HOME_TOUR_STORAGE_KEY = 'ticknal_home_tour_v2';

export function getHomeTourSteps(
  isAr: boolean,
  canViewProprietary: boolean = true,
  isMobile: boolean = false
): TourStep[] {
  const steps: TourStep[] = [
    {
      target: '[data-tour="home-portfolio-summary"]',
      title: isAr ? 'نظرة عامة على المحفظة وصافي الثروة' : 'Portfolio Overview & Net Worth',
      content: isAr
        ? 'تابع إجمالي قيمة أصولك، الأرباح والخسائر غير المحققة، والعائد الفعلي على الاستثمار مع مقارنة فورية بمعدلات التضخم والدولار.'
        : 'Track your total asset value, unrealized P&L, real-time ROI, and cash vs. equity allocation benchmarked against official inflation and USD rates.',
      placement: 'bottom',
      padding: 12,
    },
    {
      target: '[data-tour="home-positions-section"]',
      title: isAr ? 'الأسهم المفتوحة وإشارات التخارج' : 'Active Positions & Safeguards',
      content: isAr
        ? 'استعرض الأسهم المملوكة في محفظتك مع إشارات وقف الخسارة وجني الأرباح التلقائية وفقاً لتحركات ومؤشرات تقلب السوق.'
        : 'Review open stock holdings with automated profit targets and stop-loss volatility safeguards calculated from real-time market data.',
      placement: 'top',
      padding: 12,
    },
  ];

  if (canViewProprietary) {
    steps.push({
      target: '[data-tour="home-signals-section"]',
      title: isAr ? 'فرص الشراء الكمية والخوارزمية' : 'Quantitative Buy Opportunities',
      content: isAr
        ? 'اكتشف إشارات الشراء الممسوحة لحظياً لأسهم البورصة المصرية والمبنية على استراتيجيات كمية متقدمة مثل استراتيجية Champion.'
        : 'Discover high-probability entry setups scanned continuously across EGX equities using proprietary quantitative strategies like Champion and Trend Following.',
      placement: 'top',
      padding: 12,
    });
  }

  steps.push({
    target: '[data-tour="home-floating-nav"]',
    title: isAr ? 'شريط التحكم والتنفيذ السريع' : 'Command Bar & Quick Execution',
    content: isAr
      ? 'انتقل مباشرة لأقسام الصفحة أو اضغط على "إضافة أمر" لتسجيل صفقات الأسهم والإيداعات البنكية وتحديث أرصدتك.'
      : 'Navigate between key sections instantly or tap "Add Order" to log stock executions, cash deposits, and manage integrated accounts.',
    placement: 'bottom',
    padding: 8,
  });

  if (isMobile) {
    steps.push(
      {
        target: '[data-tour="home-mobile-quick-add-btn"]',
        title: isAr ? 'زر الإضافة السريعة (Add Order & Cash)' : 'Quick Add Orders & Cashflows',
        content: isAr
          ? 'زر عائم لتسجيل صفقات الشراء والبيع في البورصة، أو توثيق المعاملات البنكية والإيداعات النقدية بضغطة واحدة من أي مكان.'
          : 'Floating action button to rapidly log equity buy/sell orders, cash deposits, or expenses on the fly without leaving the screen.',
        placement: 'top',
        padding: 8,
      },
      {
        target: '[data-tour="home-mobile-notifications-btn"]',
        title: isAr ? 'زر التنبيهات والإشعارات اللحظية (Alerts)' : 'Live Notifications & Alerts Drawer',
        content: isAr
          ? 'زر عائم يفتح درج الإشعارات للاطلاع المباشر على إشارات الخوارزميات، وتنبيهات اختراق الأسعار، وإفصاحات السوق الرسمية.'
          : 'Floating button opening your real-time notification drawer for algorithm trade alerts, breakout signals, and EGX company filings.',
        placement: 'top',
        padding: 8,
      }
    );
  }

  return steps;
}
