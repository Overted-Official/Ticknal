'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, LayoutGrid } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import type { BacktestAssumptions } from '../../../../lib/strategies/run-simple-backtest';
import { summarizeUniverseBacktest, type UniverseGroupSummary } from './strategy-universe-analytics';
import { resolveStrategyUniverseScope } from './strategy-universe-selection';
import type { StrategyUniverseCompany } from './strategy-universe-catalog';
import { useSimpleUniverseBacktest } from './use-simple-universe-backtest';
import StrategyExecutionSummary from './StrategyExecutionSummary';

interface StrategyLiveUniversePanelProps {
  readonly program: ExecutableStrategyProgram;
  readonly selectedSymbols: readonly string[] | null;
  readonly universe: readonly StrategyUniverseCompany[];
  readonly locale: 'en' | 'ar';
  readonly startDate: string;
  readonly endDate: string;
  readonly assumptions: BacktestAssumptions;
  readonly onChooseCompanies: () => void;
  readonly onSelectTicker: (symbol: string) => void;
}

export default function StrategyLiveUniversePanel({ program, selectedSymbols, universe, locale, startDate, endDate, assumptions, onChooseCompanies, onSelectTicker }: StrategyLiveUniversePanelProps) {
  const isAr = locale === 'ar';
  const { isPrivacy } = usePrivacyMode();
  const scope = useMemo(() => resolveStrategyUniverseScope(universe, selectedSymbols ?? universe.map((company) => company.symbol)), [selectedSymbols, universe]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const result = useSimpleUniverseBacktest({ program, symbols: scope.evaluationSymbols, startDate, endDate, assumptions });
  const hasProgress = result.status === 'ready' || result.status === 'loading' || result.status === 'failed';
  const summary = useMemo(() => summarizeUniverseBacktest(hasProgress ? result.results : [], universe), [hasProgress, result, universe]);
  const percent = (value: number | null) => value === null ? '—' : isPrivacy ? '••••' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  const count = (value: number) => isPrivacy ? '••••' : String(value);

  return <section className="min-w-0 bg-plt-base" aria-label={isAr ? 'اختبار السوق الكامل' : 'Full-market backtest'}>
    <header className="border-b border-plt-border pb-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-sm font-semibold text-plt-text">{isAr ? 'اختبار السوق الكامل' : 'Full-market backtest'}</h2><p className="mt-1 text-[11px] text-plt-muted">{isAr ? 'نتائج كل شركات البورصة حسب مجموعة الصناعة' : 'Results for every listed EGX company, grouped by industry'}</p></div>
        <span className={`badge ${result.status === 'ready' ? 'badge-info' : 'badge-muted'}`}>{isAr ? `${scope.enabledSymbols.length} مفعّلة` : `${scope.enabledSymbols.length} enabled`}</span>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-plt-muted">{isAr ? 'يُختبر السوق بالكامل حتى لو فعّلت التنبيهات لشركات قليلة فقط. المتوسط متساوي الوزن للشركات المكتملة، وليس عائد محفظة.' : 'The whole market is tested even if alerts are enabled for only a few companies. The mean is equal-weight across completed companies, not portfolio ROI.'}</p>
      <p className="mt-2 text-[10px] text-plt-muted tabular-nums">{startDate} → {endDate} · <StrategyExecutionSummary program={program} locale={locale} feeBps={assumptions.feeBps} /> · {isAr ? `رأس مال ${assumptions.initialCapital.toLocaleString()} لكل شركة` : `${assumptions.initialCapital.toLocaleString()} initial capital per company`}</p>
      <button type="button" className="mt-3 text-[11px] font-medium text-tv-blue-400 hover:underline" onClick={onChooseCompanies}>{isAr ? 'اختيار شركات التنبيهات' : 'Choose companies for alerts'}</button>
    </header>

    {result.status === 'loading' && <div className="border-b border-plt-border py-3" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[11px] text-plt-muted"><span>{isAr ? 'جارٍ اختبار السوق' : 'Calculating market'}</span><span className="tabular-nums">{result.completed} {isAr ? 'من' : 'of'} {result.total}</span></div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={result.completed} aria-valuemin={0} aria-valuemax={result.total} aria-label={isAr ? 'تقدم الاختبار' : 'Backtest progress'}><div className="h-full bg-tv-blue-500 transition-[width] duration-300" style={{ width: `${result.total > 0 ? result.completed / result.total * 100 : 0}%` }} /></div>
    </div>}

    {result.status === 'failed' && <div className="mt-3 flex items-center justify-between gap-3 border-b border-plt-border py-3 text-xs" role="alert"><span className="text-plt-risk">{isAr ? `توقف الاختبار بعد ${result.completed} من ${result.total}. النتائج المكتملة محفوظة.` : `Backtest paused after ${result.completed} of ${result.total}. Completed results are preserved.`}</span><button type="button" className="btn-token btn-compact btn-secondary shrink-0" onClick={result.retry}>{isAr ? 'استكمال' : 'Resume'}</button></div>}

    {!hasProgress && <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center" role="status">
      <LayoutGrid size={24} className="text-plt-faint" />
      <h3 className="mt-4 text-sm font-semibold text-plt-text">{result.status === 'unauthorized' ? (isAr ? 'تسجيل الدخول مطلوب' : 'Sign in required') : universe.length === 0 ? (isAr ? 'قائمة الشركات غير متاحة' : 'Company catalogue unavailable') : (isAr ? 'تعذر حساب النتائج' : 'Could not calculate results')}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-plt-muted">{universe.length === 0 ? (isAr ? 'أعد تحميل الصفحة للحصول على قائمة الشركات.' : 'Reload the page to load the EGX catalogue.') : result.status === 'unauthorized' ? (isAr ? 'سجل الدخول لتشغيل الاختبار الخلفي.' : 'Sign in to run this backtest.') : (isAr ? 'أغلق التحليلات وأعد فتحها للمحاولة مجدداً.' : 'Close and reopen Analytics to retry.')}</p>
    </div>}

    {hasProgress && <>
      <div data-testid="live-universe-summary" className="strategy-analytics-kpis mt-4" aria-label={isAr ? 'ملخص النطاق المحسوب' : 'Calculated universe summary'}>
        <Metric label={isAr ? 'متوسط عائد الشركة' : 'Mean company return'} value={percent(summary.meanReturnPct)} tone={summary.meanReturnPct === null ? 'neutral' : summary.meanReturnPct >= 0 ? 'positive' : 'negative'} />
        <Metric label={isAr ? 'تغطية البيانات' : 'Data coverage'} value={isPrivacy ? '••••' : `${summary.completed} of ${summary.selected}`} context={summary.pending > 0 ? (isAr ? `${count(summary.pending)} بانتظار الحساب` : `${count(summary.pending)} pending`) : summary.unavailable > 0 ? (isAr ? `${count(summary.unavailable)} غير متاحة` : `${count(summary.unavailable)} unavailable`) : undefined} />
        <Metric label={isAr ? 'شركات رابحة' : 'Profitable companies'} value={count(summary.profitable)} context={isAr ? 'من الشركات المكتملة' : 'of completed companies'} />
        <Metric label={isAr ? 'صفقات مغلقة' : 'Closed trades'} value={count(summary.closedTrades)} />
      </div>
      {result.status === 'ready' && summary.completed === 0 && <p className="mt-5 border-t border-plt-border py-6 text-center text-xs text-plt-muted">{isAr ? 'لا توجد نتائج قابلة للحساب ضمن هذا النطاق والفترة.' : 'No company has a calculable result for this period.'}</p>}
      <div className="mt-6 border-b border-plt-border pb-3"><h3 className="text-xs font-semibold text-plt-text">{isAr ? 'الأداء حسب مجموعة الصناعة' : 'Industry-group performance'}</h3><p className="mt-1 text-[10px] text-plt-muted">{isAr ? 'المتوسط لكل مجموعة يعتمد فقط على الشركات ذات النتائج المكتملة.' : 'Each group mean uses only companies with completed results.'}</p></div>
      <div className="min-w-0 overflow-x-auto custom-scrollbar" aria-busy={result.status === 'loading'}>
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
  return <div className="strategy-analytics-kpi"><span className="text-[11px] text-plt-muted">{label}</span><strong className={`mt-2 block text-lg font-semibold tabular-nums ${tone === 'positive' ? 'text-plt-profit' : tone === 'negative' ? 'text-plt-risk' : 'text-plt-text'}`}>{value}</strong>{context && <span className="mt-1 block text-[10px] text-plt-faint">{context}</span>}</div>;
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
      <td><button type="button" className="flex min-w-0 items-center gap-1.5 text-start font-semibold text-plt-text" onClick={onToggle} aria-expanded={expanded}><ChevronDown size={13} className={`shrink-0 text-plt-muted transition-transform ${expanded ? '' : '-rotate-90'}`} /><span className="truncate">{isAr ? group.nameAr : group.name}</span></button></td>
      <td className={`text-end font-semibold tabular-nums ${group.meanReturnPct === null ? 'text-plt-muted' : group.meanReturnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>{percent(group.meanReturnPct)}</td>
      <td className="text-end tabular-nums">{privateValues ? '••••' : `${group.completed}/${group.selected}`}</td>
      <td className="text-end tabular-nums">{count(group.closedTrades)}</td>
    </tr>
    {expanded && group.items.map((item) => <tr key={item.symbol}>
      <td><button type="button" className="ps-5 text-start text-tv-blue-400 hover:underline" onClick={() => onSelectTicker(item.symbol)}>{item.symbol}<span className="sr-only">{isAr ? ' عرض تفاصيل الشركة' : ' View company details'}</span></button></td>
      <td className="text-end tabular-nums">{item.status === 'ok' ? percent(item.metrics.totalReturnPct) : '—'}</td>
      <td className="text-end text-[10px]">{item.status === 'ok' ? (isAr ? 'مكتمل' : 'Complete') : (isAr ? 'غير متاح' : 'Unavailable')}</td>
      <td className="text-end tabular-nums">{item.status === 'ok' ? count(item.metrics.closedTrades) : '—'}</td>
    </tr>)}
    {expanded && group.pending > 0 && <tr><td colSpan={4} className="ps-5 text-[10px] text-plt-muted tabular-nums">{isAr ? `${group.pending} شركة قيد الحساب` : `${group.pending} companies pending`}</td></tr>}
  </>;
}
