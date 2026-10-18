import { TourStep } from '@/components/ui/tour';

export const TRANSACTIONS_TOUR_STORAGE_KEY = 'ticknal_transactions_tour_v1';

export function getTransactionsTourSteps(isAr: boolean): TourStep[] {
  return [
    {
      target: '[data-tour="transactions-floating-nav"]',
      title: isAr ? 'شريط التنقل السريع بين المعاملات' : 'Transactions Quick Navigator',
      content: isAr
        ? 'تنقل فوري وبضغطة واحدة بين النظرة العامة على السيولة، الرسوم البيانية التحليلية، وسجل الحركات والصفقات المغلقة.'
        : 'Instantly jump between the Cashflow Overview, Interactive Analytics Charts, and the Master Activity Ledger.',
      placement: 'bottom',
      padding: 10,
    },
    {
      target: '[data-tour="transactions-kpi-rail"]',
      title: isAr ? 'مؤشرات السيولة ومعدل التدفق النقدي' : 'Cashflow & Velocity KPI Rail',
      content: isAr
        ? 'راقب صافي التدفق النقدي الشهري، مصادر الدخل، السيولة المحقونة في شركات السمسرة (مثل ثاندر)، وصافي الأرباح المحققة من التداول مع فلاتر مخصصة.'
        : 'Track net monthly cashflow, income generation, capital injections into Egyptian brokerages (e.g. Thndr), and net realized trading profits with custom view toggles.',
      placement: 'bottom',
      padding: 12,
    },
    {
      target: '[data-tour="transactions-analytics-section"]',
      title: isAr ? 'التحليلات المرئية ومخطط التدفق التراكمي' : 'Cashflow Progression & Breakdown Analytics',
      content: isAr
        ? 'مخطط تراكمي يوضح مسار نمو السيولة النقدية عبر الزمن مع رسم بياني دائري لتوزيع المصروفات وتصنيفات الدخل الشهرية.'
        : 'Visualize cumulative cashflow trajectory over time alongside detailed categorical spending and income donut distributions.',
      placement: 'top',
      padding: 12,
    },
    {
      target: '[data-tour="transactions-ledger-table"]',
      title: isAr ? 'سجل الحركات الشامل والصفقات المنفذة' : 'Master Activity & Trades Ledger',
      content: isAr
        ? 'سجل زمني موحد يجمع الحركات البنكية، النفقات، توزيعات الأرباح، والصفقات الاستثمارية المغلقة في البورصة مع تصفية فورية حسب الحساب أو الفترة.'
        : 'Unified chronological ledger combining liquid bank transactions, operating expenses, dividends, and closed EGX stock trades with multi-account filtering.',
      placement: 'top',
      padding: 12,
    },
    {
      target: '[data-tour="transactions-add-btn"]',
      title: isAr ? 'تسجيل معاملة وضبط الأرصدة النقدية' : 'Log Transactions & Adjust Cash',
      content: isAr
        ? 'سجل بسهولة أي حركة إيداع، نفقة تشغيلية، تحويل استثماري، أو تسوية نقدية مع تحديث تلقائي لمحفظتك وصافي ثروتك.'
        : 'Quickly record a manual bank transaction, operating expense, investment transfer, or cash adjustment with automatic net worth sync.',
      placement: 'bottom',
      padding: 8,
    },
  ];
}
