'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { BACKTEST_GROUPS, type BacktestTickerItem } from './strategy-builder-fixtures';
import type { StrategyVisualizationModel } from './strategy-visualization-model';
import StrategyVisualizationPanel from './StrategyVisualizationPanel';
import type { CompanyBacktestState } from './use-simple-company-backtest';
import { readSelectedUniverse, UNIVERSE_STORAGE_PREFIX } from './strategy-universe-selection';
import type { StrategyUniverseCompany } from './strategy-universe-catalog';

type CompanySort = 'return' | 'alpha' | 'winRate' | 'trades';

interface StrategyCompanyResultsPanelProps {
  readonly strategyId: string;
  readonly model: StrategyVisualizationModel | null;
  readonly ticker: string;
  readonly focusedBlockId: string | null;
  readonly locale: 'en' | 'ar';
  readonly liveBacktest: CompanyBacktestState;
  readonly liveEligible: boolean;
  readonly universe: readonly StrategyUniverseCompany[];
  readonly savedSelectedSymbols: readonly string[] | null;
  readonly onSaveSelection?: (symbols: readonly string[]) => Promise<boolean>;
  readonly backtestPeriod: { readonly startDate: string; readonly endDate: string };
  readonly onTickerChange: (ticker: string) => void;
  readonly onFocusBlock: (blockId: string) => void;
}

const COMPANIES = BACKTEST_GROUPS.flatMap((group) => group.tickers.map((company) => ({ ...company, industry: group.name, industryAr: group.nameAr })));

function CompanyLogo({ company }: { readonly company: BacktestTickerItem }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return <span data-testid="company-avatar" className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 text-[9px] font-semibold text-white/70">
    {company.symbol.slice(0, 2)}
    {company.logoUrl && !failed && <img src={company.logoUrl} alt="" className={`absolute inset-0 h-full w-full bg-black object-cover ${loaded ? 'opacity-100' : 'opacity-0'}`} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
  </span>;
}

export default function StrategyCompanyResultsPanel({ strategyId, model, ticker, focusedBlockId, locale, liveBacktest, liveEligible, universe, savedSelectedSymbols, onSaveSelection, backtestPeriod, onTickerChange, onFocusBlock }: StrategyCompanyResultsPanelProps) {
  const isAr = locale === 'ar';
  const hasSampleResults = strategyId === 'psi' || strategyId === 'psi_v2' || strategyId === 'hydra';
  const { isPrivacy } = usePrivacyMode();
  const companies = useMemo(() => hasSampleResults ? COMPANIES : universe.map((company) => ({
    id: company.symbol, symbol: company.symbol, name: company.name, nameAr: company.name,
    industry: company.group, industryAr: company.group, logoUrl: company.logoUrl,
    returnPct: 0, alphaPct: 0, winRate: 0, trades: 0, endPrice: 0,
  })), [hasSampleResults, universe]);
  const knownSymbols = companies.map((company) => company.symbol);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<CompanySort>('return');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(() => savedSelectedSymbols ? [...savedSelectedSymbols] : readSelectedUniverse(strategyId, knownSymbols));
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!dirty && savedSelectedSymbols) setSelectedSymbols([...savedSelectedSymbols]); }, [savedSelectedSymbols, dirty]);

  const visibleCompanies = useMemo(() => {
    const metric: 'returnPct' | 'alphaPct' | 'winRate' | 'trades' = sortBy === 'return' ? 'returnPct' : sortBy === 'alpha' ? 'alphaPct' : sortBy;
    return companies.filter((company) => `${company.symbol} ${company.name} ${company.nameAr} ${company.industry}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => hasSampleResults ? b[metric] - a[metric] : a.symbol.localeCompare(b.symbol));
  }, [query, sortBy, hasSampleResults, companies]);
  const activeCompany = companies.find((company) => company.symbol === ticker) ?? companies[0] ?? COMPANIES[0]!;
  const toggleCompany = (symbol: string) => {
    setSelectedSymbols((current) => current.includes(symbol) ? current.filter((value) => value !== symbol) : [...current, symbol]);
    setSaved(false);
    setDirty(true);
  };
  const setAll = (include: boolean) => { setSelectedSymbols(include ? [...knownSymbols] : []); setSaved(false); setDirty(true); };
  const save = async () => {
    setSaving(true); setSaveError(false);
    try {
      const ok = onSaveSelection ? await onSaveSelection(selectedSymbols) : (localStorage.setItem(`${UNIVERSE_STORAGE_PREFIX}${strategyId}`, JSON.stringify(selectedSymbols)), true);
      setSaved(ok); setDirty(!ok); setSaveError(!ok);
    } catch { setSaved(false); setSaveError(true); }
    finally { setSaving(false); }
  };
  const percent = (value: number) => isPrivacy ? '••••' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  const count = (value: number) => isPrivacy ? '••••' : String(value);
  const secondaryMetric = (company: BacktestTickerItem) => {
    if (sortBy === 'trades') return `${isAr ? 'الصفقات' : 'Trades'} ${count(company.trades)}`;
    if (sortBy === 'winRate') return `${isAr ? 'نسبة الفوز' : 'Win'} ${isPrivacy ? '••••' : `${company.winRate}%`}`;
    return `${isAr ? 'ألفا' : 'α'} ${percent(company.alphaPct)}`;
  };

  if (!hasSampleResults && universe.length === 0) return <section className="min-w-0 bg-black p-6 text-center text-xs text-plt-muted" role="status">{isAr ? 'تعذر تحميل قائمة شركات البورصة. أعد تحميل الصفحة.' : 'The EGX company catalogue is unavailable. Reload the page.'}</section>;

  return <section className="min-w-0 bg-black" aria-label={isAr ? 'نتائج الشركات' : 'Company results'}>
    <header className="border-b border-white/10 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-sm font-semibold text-white">{hasSampleResults || liveEligible ? (isAr ? 'نتائج الشركات' : 'Company results') : (isAr ? 'نطاق الشركات' : 'Company universe')}</h2><p className="mt-1 text-[11px] text-plt-muted">{isAr ? 'افحص شركة وحدد نطاق تطبيق الاستراتيجية بشكل مستقل' : 'Inspect a company and choose the strategy universe separately'}</p></div><span className={`badge ${hasSampleResults ? 'badge-warning' : liveBacktest.status === 'ready' ? 'badge-info' : 'badge-muted'}`}>{hasSampleResults ? (isAr ? 'معاينة توضيحية' : 'Illustrative preview') : liveBacktest.status === 'ready' ? (isAr ? 'اختبار محسوب' : 'Calculated backtest') : liveBacktest.status === 'loading' ? (isAr ? 'جارٍ الحساب' : 'Calculating') : (isAr ? 'بانتظار الاختبار' : 'Awaiting backtest')}</span></div>
      <p className="mt-3 text-[11px] leading-4 text-white/55">{hasSampleResults ? (isAr ? 'المؤشرات نموذجية وليست اختباراً خلفياً. الرسم البياني والإشارات محاكاة توضيحية.' : 'Company metrics are sample metrics, not a backtest. The chart and signals are illustrative simulations.') : liveEligible ? (isAr ? 'يُحسب الاختبار للشركة المعروضة. احفظ أي عدد من الشركات للمقارنة في تبويب السوق؛ تُعالج على دفعات.' : 'The displayed company is backtested from your rules. Save any number of companies to compare in Market; they run in bounded batches.') : (isAr ? 'يمكنك تحديد الشركات الآن. لن تظهر نتائج لهذا المسار المخصص قبل ربطه بمحرك اختبار خلفي.' : 'Choose eligible companies now. This custom workflow has no calculated company results until a backtest engine is connected.')}</p>
    </header>

    <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
      <div><h3 className="text-xs font-semibold text-white">{isAr ? 'نطاق الشركات' : 'Company universe'}</h3><p className="mt-1 text-[10px] text-plt-muted tabular-nums">{isAr ? `${selectedSymbols.length} من ${knownSymbols.length} محددة` : `${selectedSymbols.length} of ${knownSymbols.length} selected`}</p></div>
      <div className="flex gap-2 text-[11px]"><button type="button" className="text-tv-blue-400 hover:underline" onClick={() => setAll(true)}>{isAr ? 'تحديد الكل' : 'Select all'}</button><button type="button" className="text-white/55 hover:text-white" onClick={() => setAll(false)}>{isAr ? 'مسح' : 'Clear'}</button></div>
    </div>
    <div className="mt-3 flex gap-2">
      <label className="input-token flex min-w-0 flex-1 items-center gap-2"><Search size={14} className="shrink-0 text-plt-muted" /><input type="search" aria-label={isAr ? 'البحث عن الشركات' : 'Search companies'} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isAr ? 'الاسم أو الرمز' : 'Name or symbol'} className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35" /></label>
      {hasSampleResults && <><label className="sr-only" htmlFor="strategy-company-sort">{isAr ? 'ترتيب الشركات' : 'Sort companies'}</label><select id="strategy-company-sort" className="select-token min-w-0 max-w-32 text-xs" value={sortBy} onChange={(event) => setSortBy(event.target.value as CompanySort)}><option value="return">{isAr ? 'العائد' : 'Return'}</option><option value="alpha">{isAr ? 'ألفا' : 'Alpha'}</option><option value="winRate">{isAr ? 'نسبة الفوز' : 'Win rate'}</option><option value="trades">{isAr ? 'الصفقات' : 'Trades'}</option></select></>}
    </div>

    <div className="strategy-company-list custom-scrollbar mt-3" aria-label={isAr ? 'قائمة الشركات' : 'Company list'}>
      {visibleCompanies.length ? visibleCompanies.map((company) => <div key={company.symbol} data-testid="company-result-row" className={`strategy-company-row ${activeCompany.symbol === company.symbol ? 'is-active' : ''}`}>
        <input type="checkbox" className="h-4 w-4 shrink-0 accent-tv-blue-500" checked={selectedSymbols.includes(company.symbol)} onChange={() => toggleCompany(company.symbol)} aria-label={isAr ? `تطبيق الاستراتيجية على ${company.symbol}` : `Apply strategy to ${company.symbol}`} />
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-start" aria-label={isAr ? `فحص ${company.symbol}` : `Inspect ${company.symbol}`} aria-pressed={activeCompany.symbol === company.symbol} onClick={() => onTickerChange(company.symbol)}>
          <CompanyLogo company={company} /><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-white">{company.symbol} <span className="font-normal text-plt-muted">{isAr ? company.nameAr : company.name}</span></span><span className="mt-0.5 block truncate text-[10px] text-white/40">{isAr ? company.industryAr : company.industry}</span></span>
          {hasSampleResults && <span className="shrink-0 text-end"><span className={`block text-xs font-semibold tabular-nums ${company.returnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>{percent(company.returnPct)}</span><span className="block text-[10px] text-white/45 tabular-nums">{secondaryMetric(company)}</span></span>}
        </button>
      </div>) : <p className="py-8 text-center text-xs text-plt-muted">{isAr ? 'لا توجد شركات تطابق البحث' : 'No companies match this search'}</p>}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4"><p className="max-w-[230px] text-[10px] leading-4 text-plt-muted">{onSaveSelection ? (isAr ? 'يُحفظ النطاق مع الاستراتيجية في حسابك ولا ينفذ أوامر تداول.' : 'Saved with your strategy in your account; this does not execute trades.') : (isAr ? 'يُحفظ نطاق المعاينة في هذا المتصفح فقط.' : 'This preview selection is stored in this browser only.')}</p><button type="button" className="btn-token btn-compact btn-secondary" onClick={() => { void save(); }} disabled={!dirty || saving}>{saving ? (isAr ? 'جارٍ الحفظ' : 'Saving…') : (isAr ? 'حفظ الاختيار' : 'Save company selection')}</button></div>
    {saved && <p className="mt-2 text-[10px] text-plt-profit" role="status">{onSaveSelection ? (isAr ? 'تم الحفظ في حسابك' : 'Saved to your account') : (isAr ? 'تم الحفظ في هذا المتصفح' : 'Saved in this browser')}</p>}
    {saveError && <p className="mt-2 text-[10px] text-plt-risk" role="alert">{isAr ? 'تعذر حفظ اختيار الشركات.' : 'Could not save company selection.'}</p>}

    <div className="mt-5"><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-white">{activeCompany.symbol} <span className="font-normal text-plt-muted">{isAr ? activeCompany.nameAr : activeCompany.name}</span></h3><p className="mt-1 text-[10px] text-plt-muted">{isAr ? activeCompany.industryAr : activeCompany.industry}</p></div><span className="badge badge-muted">{selectedSymbols.includes(activeCompany.symbol) ? (isAr ? 'ضمن النطاق' : 'Included') : (isAr ? 'مستبعد' : 'Excluded')}</span></div>
      {hasSampleResults ? <><div className="strategy-analytics-kpis mt-3" aria-label={isAr ? 'مقاييس الشركة' : 'Company metrics'}>
        <CompanyMetric label={isAr ? 'عائد نموذجي' : 'Sample return'} value={percent(activeCompany.returnPct)} tone={activeCompany.returnPct >= 0 ? 'positive' : 'negative'} />
        <CompanyMetric label={isAr ? 'ألفا نموذجية' : 'Sample alpha'} value={percent(activeCompany.alphaPct)} tone={activeCompany.alphaPct >= 0 ? 'positive' : 'negative'} />
        <CompanyMetric label={isAr ? 'نسبة الفوز' : 'Win rate'} value={isPrivacy ? '••••' : `${activeCompany.winRate}%`} />
        <CompanyMetric label={isAr ? 'صفقات نموذجية' : 'Sample trades'} value={count(activeCompany.trades)} />
      </div>
      <p className="mt-2 text-[10px] text-plt-muted">{isAr ? 'أقصى تراجع الشركة وقائمة الصفقات غير متاحين في العينة.' : 'Company drawdown and trade history are unavailable in this sample.'}</p>
      <div className="mt-5 border-t border-white/10 pt-4"><h4 className="text-xs font-semibold text-white">{isAr ? 'رسم توضيحي للإشارات' : 'Illustrative signal chart'}</h4><p className="mb-3 mt-1 text-[10px] text-plt-muted">{isAr ? 'النافذة الزمنية أعلاه تتحكم في الرسم فقط، لا في المقاييس النموذجية.' : 'The chart window above changes this chart only, not the sample metrics.'}</p><StrategyVisualizationPanel model={model} ticker={ticker} focusedBlockId={focusedBlockId} locale={locale} onTickerChange={onTickerChange} onFocusBlock={onFocusBlock} showTickerSearch={false} /></div></> : liveEligible ? <div className="mt-4 border-t border-white/10 pt-4" aria-live="polite" data-testid="live-company-backtest">
        {liveBacktest.status === 'ready' ? <>
          <div className="strategy-analytics-kpis" aria-label={isAr ? 'مقاييس الاختبار المحسوبة' : 'Calculated backtest metrics'}>
            <CompanyMetric label={isAr ? 'عائد الاستراتيجية' : 'Strategy return'} value={percent(liveBacktest.metrics.totalReturnPct)} tone={liveBacktest.metrics.totalReturnPct >= 0 ? 'positive' : 'negative'} />
            <CompanyMetric label={isAr ? 'أقصى تراجع' : 'Max drawdown'} value={percent(liveBacktest.metrics.maxDrawdownPct)} tone="negative" />
            <CompanyMetric label={isAr ? 'نسبة الفوز' : 'Win rate'} value={liveBacktest.metrics.winRatePct === null ? '—' : isPrivacy ? '••••' : `${liveBacktest.metrics.winRatePct.toFixed(1)}%`} />
            <CompanyMetric label={isAr ? 'صفقات مغلقة' : 'Closed trades'} value={count(liveBacktest.metrics.closedTrades)} />
          </div>
          <p className="mt-3 text-[10px] leading-4 text-plt-muted tabular-nums">{backtestPeriod.startDate} → {backtestPeriod.endDate} · {isAr ? 'آخر بيانات' : 'Data as of'} {liveBacktest.asOf} · {isAr ? 'تنفيذ عند افتتاح الجلسة التالية، رأس مال ١٠٠٬٠٠٠، رسوم ٠٫١٪ لكل جانب' : 'Next-session open fills · 100,000 initial capital · 0.1% fee per side'}</p>
          <p className="mt-2 text-[10px] text-plt-muted">{isAr ? 'لا يتوفر رسم الصفقات الحقيقي في هذا العرض بعد.' : 'Trade-by-trade chart is not available in this view yet.'}</p>
        </> : <p className="py-6 text-center text-xs text-plt-muted" role="status">{liveBacktest.status === 'loading' ? (isAr ? 'جارٍ حساب نتيجة الشركة…' : 'Calculating company result…') : liveBacktest.status === 'unauthorized' ? (isAr ? 'سجل الدخول لتشغيل الاختبار الخلفي.' : 'Sign in to run this backtest.') : liveBacktest.status === 'unavailable' ? (isAr ? 'بيانات هذه الشركة غير متاحة لهذه الفترة أو لهذه القواعد.' : 'This company has no usable data for the selected period or rules.') : (isAr ? 'تعذر تحميل نتيجة الاختبار. أغلق التحليلات وأعد فتحها للمحاولة مجدداً.' : 'The backtest could not load. Close and reopen Analytics to retry.')}</p>}
      </div> : <div className="mt-4 border-t border-white/10 py-8 text-center"><h4 className="text-xs font-semibold text-white">{isAr ? 'لا توجد نتائج اختبار للشركة بعد' : 'No company backtest results yet'}</h4><p className="mx-auto mt-2 max-w-xs text-[11px] leading-4 text-plt-muted">{isAr ? 'اختيار الشركة محفوظ، لكن العائد والصفقات والرسم البياني للنتائج غير متاحة حتى يُشغّل الاختبار الخلفي.' : 'Your universe choice can be saved, but returns, trades, and a results chart require a real backtest.'}</p></div>}
    </div>
  </section>;
}

function CompanyMetric({ label, value, tone }: { readonly label: string; readonly value: string; readonly tone?: 'positive' | 'negative' }) {
  return <div className="strategy-analytics-kpi"><span className="text-[11px] text-plt-muted">{label}</span><strong className={`mt-2 block text-lg font-semibold tabular-nums ${tone === 'positive' ? 'text-plt-profit' : tone === 'negative' ? 'text-plt-risk' : 'text-white'}`}>{value}</strong></div>;
}
