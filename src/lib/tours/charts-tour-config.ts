import { TourStep } from '@/components/ui/tour';

export const CHARTS_TOUR_STORAGE_KEY = 'ticknal_charts_tour_v1';

export function getChartsTourSteps(isAr: boolean, canViewProprietary: boolean = true): TourStep[] {
  return [
    {
      target: '[data-tour="chart-ticker-search"]',
      title: isAr ? 'البحث والتنقل بين الأصول والأسهم' : 'Ticker Search & Multi-Asset Discovery',
      content: isAr
        ? 'ابحث فورياً أو اضغط ⌘K لفتح درج التنقل الذكي بين كافة أسهم البورصة المصرية، صناديق الاستثمار، والذهب والفضة مع فلاتر سريعة للقطاعات.'
        : 'Search instantly or press ⌘K to open the asset navigator across all EGX stocks, mutual investment funds, and precious metals (Gold & Silver).',
      placement: 'bottom',
      padding: 8,
    },
    {
      target: '[data-tour="chart-predict-btn"]',
      title: isAr ? 'توقعات الأسعار بالذكاء الاصطناعي (AI Forecast)' : 'AI Price Prediction & Forecasts',
      content: isAr
        ? 'نافذة ذكاء اصطناعي تحسب المسار السعري المتوقع للسهم، نطاقات التذبذب الإحصائية، ونقاط الدعم والمقاومة المستقبلية بالاعتماد على خوارزميات التعلم الآلي.'
        : 'Opens the AI forecasting popover generating probabilistic trajectory bands, expected price ranges, and predictive pivot targets powered by machine learning.',
      placement: 'bottom',
      padding: 8,
    },
    {
      target: '[data-tour="chart-indicators-btn"]',
      title: isAr ? 'مكتبة المؤشرات الفنية والكمية' : 'Technical & Quantitative Indicators',
      content: isAr
        ? 'نافذة المؤشرات الفنية التي تتيح لك تطبيق أكثر من 20 مؤشراً رياضياً (RSI، MACD، SuperTrend، وغيرها) مع ضبط المعاملات فورياً وتثبيتها برابط الرسم البياني.'
        : 'Open the indicator panel to configure 20+ quantitative overlays and oscillators (RSI, SuperTrend, MACD, Bollinger Bands) with instant live tuning.',
      placement: 'bottom',
      padding: 8,
    },
    ...(canViewProprietary
      ? [
          {
            target: '[data-tour="chart-strategy-report-btn"]',
            title: isAr ? 'درج تقرير الاستراتيجية والاختبار التاريخي' : 'Strategy Backtest & Performance Drawer',
            content: isAr
              ? 'درج منزلق متقدم يستعرض الأداء التاريخي لاستراتيجيات Ticknal الكمية (PSI، Thoth، Champion)، سجل الصفقات، معدل الربحية (Win Rate)، ومؤشر شارب مع إمكانية تعديل المعاملات.'
              : 'Slide-over drawer detailing historical backtest metrics (Win Rate, Profit Factor, Sharpe Ratio), signal execution logs, and live strategy parameter tuning.',
            placement: 'bottom' as const,
            padding: 8,
          },
        ]
      : []),
    {
      target: '[data-tour="chart-positions-btn"]',
      title: isAr ? 'درج الصفقات والأوامر المفتوحة' : 'Active Positions & Order Manager',
      content: isAr
        ? 'درج منزلق يستعرض كافة الصفقات المفتوحة للسهم الحالي، متوسط سعر التكلفة، الأرباح والخسائر اللحظية، وتعديل أوامر وقف الخسارة وجني الأرباح مباشرة.'
        : 'Slide-over drawer managing your open lots, average fill cost, real-time unrealized P&L, and quick options to edit stop-loss or take-profit targets.',
      placement: 'bottom',
      padding: 8,
    },
    {
      target: '[data-tour="chart-add-order-btn"]',
      title: isAr ? 'نافذة تسجيل وتوثيق الصفقات' : 'Log Executions & Orders',
      content: isAr
        ? 'نافذة سريعة لتسجيل عمليات الشراء والبيع وتوزيعها على محافظك الاستثمارية المختلفة، مع تحديث فوري للمحفظة وصافي الثروة.'
        : 'Quickly log buy/sell executions linked to your brokerage accounts with automated balance, portfolio, and net worth synchronization.',
      placement: 'bottom',
      padding: 8,
    },
    {
      target: '[data-tour="chart-main-canvas"]',
      title: isAr ? 'الرسم البياني التفاعلي والإشارات' : 'Interactive Chart & Signal Overlays',
      content: isAr
        ? 'مساحة العرض الرئيسية المدعومة ببيانات البورصة المصرية اللحظية (تأخير 15 دقيقة مجاناً)، تعرض إشارات الشراء والبيع الآلية من الخوارزميات مع أحجام التداول والتقاطعات.'
        : 'High-performance TradingView canvas with delayed EGX intraday feeds, automated quantitative buy/sell signal markers, volume bars, and crosshair metrics.',
      placement: 'top',
      padding: 12,
    },
    {
      target: '[data-tour="chart-watchlist-sidebar"]',
      title: isAr ? 'قائمة المتابعة والأسعار الحية' : 'Watchlist & Market Quotes',
      content: isAr
        ? 'شريط جانبي يستعرض أسعار التداول اللحظية، نطاق السعر لـ 52 أسبوعاً، وقائمة مراقبة قابلة للتصفية بين الأسهم المصرية، المعادن الثمينة، وصناديق الاستثمار.'
        : 'Side panel featuring live market quotes, 52-week price ranges, and a searchable watchlist with fast category filtering between Equities, Metals, and Mutual Funds.',
      placement: 'left',
      padding: 12,
    },
    {
      target: '[data-tour="chart-bottom-toolbar"]',
      title: isAr ? 'النطاقات الزمنية وساعة السوق' : 'Timeframe Range & Market Clock',
      content: isAr
        ? 'شريط التحكم السفلي للتبديل السريع بين الفترات الزمنية (1D، 1W، 1M، 1Y) ومتابعة ساعة القاهرة الرسمية وتوقيت جلسات التداول.'
        : 'Bottom control bar to switch chart horizons (1D, 1W, 1M, 1Y) and track official Cairo local exchange time with data sync indicators.',
      placement: 'top',
      padding: 8,
    },
  ];
}
