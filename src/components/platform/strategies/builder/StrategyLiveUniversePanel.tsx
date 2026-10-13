'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, LayoutGrid } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import { summarizeUniverseBacktest, type UniverseGroupSummary } from './strategy-universe-analytics';
import { readSelectedUniverse } from './strategy-universe-selection';
import type { StrategyUniverseCompany } from './strategy-universe-catalog';
import { useSimpleUniverseBacktest } from './use-simple-universe-backtest';

interface StrategyLiveUniversePanelProps {
  readonly strategyId: string;
  readonly program: ExecutableStrategyProgram;
  readonly selectedSymbols: readonly string[] | null;
  readonly universe: readonly StrategyUniverseCompany[];
  readonly locale: 'en' | 'ar';
  readonly startDate: string;
  readonly endDate: string;
  readonly onChooseCompanies: () => void;
  readonly onSelectTicker: (symbol: string) => void;
}

export default function StrategyLiveUniversePanel({ strategyId, program, selectedSymbols, universe, locale, startDate, endDate, onChooseCompanies, onSelectTicker }: StrategyLiveUniversePanelProps) {
  const isAr = locale === 'ar';
  const { isPrivacy } = usePrivacyMode();
  const symbols = useMemo(() => selectedSymbols ?? readSelectedUniverse(strategyId, universe.map((company) => company.symbol)), [selectedSymbols, strategyId, universe]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const result = useSimpleUniverseBacktest({ program, symbols, startDate, endDate });
  const summary = useMemo(() => result.status === 'ready' ? summarizeUniverseBacktest(result.results, universe) : null, [result, universe]);
  const percent = (value: number | null) => value === null ? '—' : isPrivacy ? '••••' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  const count = (value: number) => isPrivacy ? '••••' : String(value);

  return <section className="min-w-0 bg-black" aria-label={isAr ? 'اختبار نطاق الشركات' : 'Selected universe backtest'}>
    <header className="border-b border-white/10 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-sm font-semibold text-white">{isAr ? 'اختبار نطاق الشركات' : 'Selected universe backtest'}</h2><p className="mt-1 text-[11px] text-plt-muted">{isAr ? 'نتائج الاستراتيجية حسب المجموعة والشركة المحددة' : 'Strategy results by selected industry group and company'}</p></div>
        <span className={`badge ${result.status === 'ready' ? 'badge-info' : 'badge-muted'}`}>{result.status === 'ready' ? (isAr ? 'نطاق مختار محسوب' : 'Calculated selected universe') : (isAr ? 'نطاق مختار' : 'Selected universe')}</span>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-white/60">{isAr ? 'متوسط متساوي الوزن لعوائد الشركات المكتملة، وليس عائد محفظة. الشركات التي لا تتوفر بياناتها مستبعدة من المتوسط.' : 'Equal-weight mean of completed company returns—not portfolio ROI. Companies without usable data are excluded from the mean.'}</p>
      <p className="mt-2 text-[10px] text-plt-muted tabular-nums">{startDate} → {endDate} · {isAr ? 'تنفيذ عند افتتاح الجلسة التالية · رسوم ٠٫١٪ لكل جانب' : 'Next-session open fills · 0.1% fee per side'}</p>
    </header>

    {result.status !== 'ready' && <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center" role="status">
      <LayoutGrid size={24} className="text-white/25" />
      <h3 className="mt-4 text-sm font-semibold text-white">{result.status === 'selection-required' ? (isAr ? 'اختر شركة واحدة على الأقل' : 'Select at least one company') : result.status === 'loading' || result.status === 'idle' ? (isAr ? 'جارٍ حساب النتائج' : 'Calculating selected companies') : result.status === 'unauthorized' ? (isAr ? 'تسجيل الدخول مطلوب' : 'Sign in required') : (isAr ? 'تعذر حساب النتائج' : 'Could not calculate results')}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-plt-muted">{universe.length === 0 ? (isAr ? 'تعذر تحميل قائمة شركات البورصة. أعد تحميل الصفحة.' : 'The EGX company catalogue is unavailable. Reload the page.') : result.status === 'loading' ? (isAr ? `${result.completed} من ${result.total} شركة · تُعالج الطلبات على دفعات مع إعادة استخدام بيانات الأسعار` : `${result.completed} of ${result.total} companies · processed in bounded batches with cached price history`) : result.status === 'selection-required' ? (isAr ? 'حدد الشركات التي تريد اختبارها في تبويب الشركات.' : 'Choose the companies to test in the Companies tab.') : result.status === 'unauthorized' ? (isAr ? 'سجل الدخول لتشغيل الاختبار الخلفي.' : 'Sign in to run this backtest.') : result.status === 'error' ? (isAr ? 'أغلق التحليلات وأعد فتحها للمحاولة مجدداً.' : 'Close and reopen Analytics to retry.') : (isAr ? 'تُستخدم بيانات الأسعار المخزنة مؤقتاً لتقليل نقل البيانات.' : 'Cached price history limits repeated data transfer.')}</p>
      {result.status === 'selection-required' && <button type="button" className="btn-token btn-compact btn-secondary mt-4" onClick={onChooseCompanies}>{isAr ? 'اختيار الشركات' : 'Choose companies'}</button>}
    </div>}

    {result.status === 'ready' && summary && <>
      <div data-testid="live-universe-summary" className="strategy-analytics-kpis mt-4" aria-label={isAr ? 'ملخص النطاق المحسوب' : 'Calculated universe summary'}>
        <Metric label={isAr ? 'متوسط عائد الشركة' : 'Mean company return'} value={percent(summary.meanReturnPct)} tone={summary.meanReturnPct === null ? 'neutral' : summary.meanReturnPct >= 0 ? 'positive' : 'negative'} />
        <Metric label={isAr ? 'تغطية البيانات' : 'Data coverage'} value={isPrivacy ? '••••' : `${summary.completed} of ${summary.selected}`} context={summary.unavailable > 0 ? (isAr ? `${count(summary.unavailable)} غير متاحة` : `${count(summary.unavailable)} unavailable`) : undefined} />
        <Metric label={isAr ? 'شركات رابحة' : 'Profitable companies'} value={count(summary.profitable)} context={isAr ? 'من الشركات المكتملة' : 'of completed companies'} />
        <Metric label={isAr ? 'صفقات مغلقة' : 'Closed trades'} value={count(summary.closedTrades)} />
      </div>
      {summary.completed === 0 && <p className="mt-5 border-t border-white/10 py-6 text-center text-xs text-plt-muted">{isAr ? 'لا توجد نتائج قابلة للحساب ضمن هذا النطاق والفترة.' : 'No selected company has a calculable result for this period.'}</p>}
      <div className="mt-6 border-b border-white/10 pb-3"><h3 className="text-xs font-semibold text-white">{isAr ? 'الأداء حسب مجموعة الصناعة' : 'Industry-group performance'}</h3><p className="mt-1 text-[10px] text-plt-muted">{isAr ? 'المتوسط لكل مجموعة يعتمد فقط على الشركات ذات النتائج المكتملة.' : 'Each group mean uses only companies with completed results.'}</p></div>
      <div className="min-w-0 overflow-x-auto custom-scrollbar">
        <table className="data-table strategy-industry-table w-full text-xs">
          <thead><tr><th className="text-start">{isAr ? 'المجموعة / الشركة' : 'Group / company'}</th><th className="text-end">{isAr ? 'متوسط العائد' : 'Mean return'}</th><th className="text-end">{isAr ? 'التغطية' : 'Coverage'}</th><th className="text-end">{isAr ? 'الصفقات' : 'Trades'}</th></tr></thead>
          <tbody>{summary.groups.map((group) => <GroupRows key={group.id} group={group} isAr={isAr} expanded={expandedGroup === group.id} percent={percent} count={count} privateValues={isPrivacy} onToggle={() => setExpandedGroup((current) => current === group.id ? null : group.id)} onSelectTicker={onSelectTicker} />)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-plt-muted">{isAr ? 'ألفا مقابل EGX 30 والمحفظة ذات الوزن المتساوي يتطلبان اختباراً منفصلاً ولم يُحتسبا هنا.' : 'EGX 30 alpha and equal-weight portfolio performance are not calculated in this view.'}</p>
    </>}
  </section>;
}

function Metric({ label, value, context, tone = 'neutral' }: { readonly label: string; readonly value: string; readonly context?: string; readonly tone?: 'neutral' | 'positive' | 'negative' }) {
  return <div className="strategy-analytics-kpi"><span className="text-[11px] text-plt-muted">{label}</span><strong className={`mt-2 block text-lg font-semibold tabular-nums ${tone === 'positive' ? 'text-plt-profit' : tone === 'negative' ? 'text-plt-risk' : 'text-white'}`}>{value}</strong>{context && <span className="mt-1 block text-[10px] text-white/45">{context}</span>}</div>;
}

function GroupRows({ group, isAr, expanded, percent, count, privateValues, onToggle, onSelectTicker }: {
  readonly group: UniverseGroupSummary;
  readonly isAr: boolean;
  readonly expanded: boolean;
  readonly percent: (value: number | null) => string;
  readonly count: (value: number) => string;
  readonly privateValues: boolean;
  readonly onToggle: () => void;
  readonly onSelectTicker: (symbol: string) => void;
}) {
  return <>
    <tr data-testid="live-universe-group" aria-expanded={expanded}>
      <td><button type="button" className="flex min-w-0 items-center gap-1.5 text-start font-semibold text-white" onClick={onToggle} aria-expanded={expanded}><ChevronDown size={13} className={`shrink-0 text-plt-muted transition-transform ${expanded ? '' : '-rotate-90'}`} /><span className="truncate">{isAr ? group.nameAr : group.name}</span></button></td>
      <td className={`text-end font-semibold tabular-nums ${group.meanReturnPct === null ? 'text-white/55' : group.meanReturnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>{percent(group.meanReturnPct)}</td>
      <td className="text-end tabular-nums">{privateValues ? '••••' : `${group.completed}/${group.selected}`}</td>
      <td className="text-end tabular-nums">{count(group.closedTrades)}</td>
    </tr>
    {expanded && group.items.map((item) => <tr key={item.symbol}>
      <td><button type="button" className="ps-5 text-start text-tv-blue-400 hover:underline" onClick={() => onSelectTicker(item.symbol)}>{item.symbol}<span className="sr-only">{isAr ? ' عرض تفاصيل الشركة' : ' View company details'}</span></button></td>
      <td className="text-end tabular-nums">{item.status === 'ok' ? percent(item.metrics.totalReturnPct) : '—'}</td>
      <td className="text-end text-[10px]">{item.status === 'ok' ? (isAr ? 'مكتمل' : 'Complete') : (isAr ? 'غير متاح' : 'Unavailable')}</td>
      <td className="text-end tabular-nums">{item.status === 'ok' ? count(item.metrics.closedTrades) : '—'}</td>
    </tr>)}
  </>;
}
