'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, LayoutGrid, Table2 } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import type { BacktestGroupItem, BacktestViewMode } from './strategy-builder-fixtures';
import StrategyBacktestTreemap from './StrategyBacktestTreemap';
import { getMockBacktestPreview } from './strategy-backtest-model';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import StrategyLiveUniversePanel from './StrategyLiveUniversePanel';
import type { StrategyUniverseCompany } from './strategy-universe-catalog';
import type { BacktestAssumptions } from '../../../../lib/strategies/run-simple-backtest';

interface StrategyBacktestPanelProps {
  readonly strategyId: string;
  readonly strategyName: string;
  readonly hasRules: boolean;
  readonly draftRevision: number;
  readonly locale: 'en' | 'ar';
  readonly simpleProgram: ExecutableStrategyProgram | null;
  readonly selectedSymbols: readonly string[] | null;
  readonly universe: readonly StrategyUniverseCompany[];
  readonly startDate: string;
  readonly endDate: string;
  readonly assumptions: BacktestAssumptions;
  readonly onChooseCompanies: () => void;
  readonly onSelectTicker?: (symbol: string) => void;
}

type GroupSort = 'return' | 'alpha' | 'trades';

export default function StrategyBacktestPanel({ strategyId, hasRules, locale, simpleProgram, selectedSymbols, universe, startDate, endDate, assumptions, onChooseCompanies, onSelectTicker }: StrategyBacktestPanelProps) {
  const isAr = locale === 'ar';
  const { isPrivacy } = usePrivacyMode();
  const [viewMode, setViewMode] = useState<BacktestViewMode>('table');
  const [sortBy, setSortBy] = useState<GroupSort>('return');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const preview = useMemo(() => getMockBacktestPreview(strategyId, 'all', 'industryGroup', hasRules, 'primary'), [strategyId, hasRules]);
  const groups = useMemo(() => [...(preview?.groups ?? [])].sort((a, b) => {
    const metric = sortBy === 'return' ? 'returnPct' : sortBy === 'alpha' ? 'alphaPct' : 'trades';
    return b[metric] - a[metric];
  }), [preview, sortBy]);
  const percent = (value: number) => isPrivacy ? '••••' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  const plainPercent = (value: number) => isPrivacy ? '••••' : `${value.toFixed(0)}%`;
  const count = (value: number) => isPrivacy ? '••••' : String(value);

  if (simpleProgram) return <StrategyLiveUniversePanel program={simpleProgram} selectedSymbols={selectedSymbols} universe={universe} locale={locale} startDate={startDate} endDate={endDate} assumptions={assumptions} onChooseCompanies={onChooseCompanies} onSelectTicker={(symbol) => onSelectTicker?.(symbol)} />;

  if (!preview) return <section className="flex min-h-[360px] flex-col items-center justify-center border border-dashed border-plt-border px-6 text-center" aria-label={isAr ? 'نظرة عامة على السوق' : 'Market overview'}>
    <LayoutGrid size={24} className="text-plt-faint" />
    <h2 className="mt-4 text-sm font-semibold">{hasRules ? (isAr ? 'لا توجد نتائج اختبار بعد' : 'No backtest results yet') : (isAr ? 'أكمل قواعد الاستراتيجية' : 'Complete the strategy rules')}</h2>
    <p className="mt-2 max-w-sm text-xs leading-5 text-plt-muted">{hasRules ? (isAr ? 'سير العمل المخصص غير متصل بعد بمحرك اختبار خلفي. لن نعرض عوائد نموذجية على أنها نتائجه.' : 'This custom workflow is not connected to a backtest engine yet. Example returns are not shown as its results.') : (isAr ? 'أضف قاعدة شراء وقاعدة بيع لعرض معاينة الأداء.' : 'Add a buy and a sell rule to open the performance preview.')}</p>
  </section>;

  const kpis = [
    { id: 'return', label: isAr ? 'عائد الاستراتيجية' : 'Strategy return', value: percent(preview.kpis.strategyReturn), context: isAr ? 'عينة EGX' : 'EGX sample', tone: 'positive' },
    { id: 'alpha', label: isAr ? 'ألفا مقابل EGX 30' : 'Alpha vs EGX 30', value: percent(preview.kpis.alpha), context: isAr ? `المؤشر ${percent(preview.kpis.benchmarkReturn)}` : `benchmark ${percent(preview.kpis.benchmarkReturn)}`, tone: 'positive' },
    { id: 'win-rate', label: isAr ? 'نسبة الصفقات الرابحة' : 'Win rate', value: plainPercent(preview.kpis.winRate), context: isAr ? `${count(preview.kpis.totalTrades)} صفقة` : `${count(preview.kpis.totalTrades)} closed trades`, tone: 'neutral' },
    { id: 'drawdown', label: isAr ? 'أقصى تراجع' : 'Max drawdown', value: percent(preview.kpis.maxDrawdown), context: isAr ? 'من القمة إلى القاع' : 'peak to trough', tone: 'negative' },
  ] as const;

  return <section className="min-w-0 bg-plt-base" aria-label={isAr ? 'نظرة عامة على السوق' : 'Market overview'}>
    <div className="border-b border-plt-border pb-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-sm font-semibold text-plt-text">{isAr ? 'نظرة عامة على السوق' : 'Market overview'}</h2><p className="mt-1 text-[11px] text-plt-muted">{isAr ? 'مقارنة إجمالية ونتائج حسب مجموعة الصناعة' : 'Aggregate comparison and industry-group results'}</p></div>
        <span className="badge badge-warning">{isAr ? 'معاينة توضيحية' : 'Illustrative preview'}</span>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-plt-muted">{isAr ? 'نتائج نموذجية، لم تُحسب من سير العمل هذا. تواريخ الرسم البياني لا تغير هذه الأرقام.' : 'Sample results, not calculated from this workflow. Chart dates do not recalculate these figures.'}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-plt-faint tabular-nums">
        <span>{isAr ? 'الفترة النموذجية: ٥ يناير – ٢٨ ديسمبر ٢٠٢٥' : 'Sample period: 5 Jan – 28 Dec 2025'}</span>
        <span>{isAr ? `${groups.length} مجموعات صناعية` : `${groups.length} industry groups`}</span>
      </div>
    </div>

    <div className="strategy-analytics-kpis mt-4" aria-label={isAr ? 'مؤشرات الأداء النموذجية' : 'Sample performance metrics'}>
      {kpis.map((kpi) => <div key={kpi.id} className="strategy-analytics-kpi">
        <span className="text-[11px] text-plt-muted">{kpi.label}</span>
        <strong className={`mt-2 block text-xl font-semibold tabular-nums ${kpi.tone === 'positive' ? 'text-plt-profit' : kpi.tone === 'negative' ? 'text-plt-risk' : 'text-plt-text'}`}>{kpi.value}</strong>
        <span className="mt-1 block text-[10px] text-plt-faint tabular-nums">{kpi.context}</span>
      </div>)}
    </div>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-b border-plt-border pb-3">
      <div><h3 className="text-xs font-semibold text-plt-text">{isAr ? 'الأداء حسب مجموعة الصناعة' : 'Industry-group performance'}</h3><p className="mt-1 text-[10px] text-plt-muted">{isAr ? 'حدد مجموعة لعرض شركاتها' : 'Open a group to inspect its companies'}</p></div>
      <div className="seg-control" role="tablist" aria-label={isAr ? 'نوع العرض' : 'View mode'}>
        <button type="button" role="tab" aria-selected={viewMode === 'table'} onClick={() => setViewMode('table')} className={`seg-control-btn inline-flex items-center gap-1 ${viewMode === 'table' ? 'active' : ''}`} aria-label={isAr ? 'عرض الجدول' : 'Table view'}><Table2 size={13} />{isAr ? 'جدول' : 'Table'}</button>
        <button type="button" role="tab" aria-selected={viewMode === 'heatmap'} onClick={() => setViewMode('heatmap')} className={`seg-control-btn inline-flex items-center gap-1 ${viewMode === 'heatmap' ? 'active' : ''}`} aria-label={isAr ? 'عرض الخريطة' : 'Treemap view'}><LayoutGrid size={13} />{isAr ? 'خريطة' : 'Treemap'}</button>
      </div>
    </div>

    {viewMode === 'heatmap' ? <div data-testid="strategy-backtest-heatmap" className="pt-3">
      <p className="mb-2 text-[10px] text-plt-muted">{isAr ? 'المساحة = عدد الصفقات النموذجية · اللون = العائد النموذجي' : 'Area = sample trade count · Colour = sample return'}</p>
      <StrategyBacktestTreemap groups={groups} selectedTickerId={null} locale={locale} onSelectTicker={(symbol) => onSelectTicker?.(symbol)} />
    </div> : <div data-testid="strategy-backtest-table" className="min-w-0 overflow-x-auto custom-scrollbar">
      <table className="data-table strategy-industry-table w-full text-xs">
        <thead><tr>
          <th className="text-start">{isAr ? 'المجموعة / الشركة' : 'Group / company'}</th>
          <th className="text-end"><button type="button" aria-label="Sort groups by return" aria-pressed={sortBy === 'return'} onClick={() => setSortBy('return')}>{isAr ? 'العائد' : 'Return'}</button></th>
          <th className="text-end"><button type="button" aria-label="Sort groups by alpha" aria-pressed={sortBy === 'alpha'} onClick={() => setSortBy('alpha')}>{isAr ? 'ألفا' : 'Alpha'}</button></th>
          <th className="text-end"><button type="button" aria-label="Sort groups by trades" aria-pressed={sortBy === 'trades'} onClick={() => setSortBy('trades')}>{isAr ? 'الصفقات' : 'Trades'}</button></th>
        </tr></thead>
        <tbody>{groups.map((group: BacktestGroupItem) => <FragmentGroup key={group.id} group={group} isAr={isAr} expanded={expandedGroup === group.id} percent={percent} count={count} onToggle={() => setExpandedGroup((current) => current === group.id ? null : group.id)} onSelectTicker={onSelectTicker} />)}</tbody>
      </table>
    </div>}
  </section>;
}

function FragmentGroup({ group, isAr, expanded, percent, count, onToggle, onSelectTicker }: {
  readonly group: BacktestGroupItem;
  readonly isAr: boolean;
  readonly expanded: boolean;
  readonly percent: (value: number) => string;
  readonly count: (value: number) => string;
  readonly onToggle: () => void;
  readonly onSelectTicker?: (symbol: string) => void;
}) {
  return <>
    <tr data-testid="industry-group-row" aria-expanded={expanded}>
      <td><button type="button" className="flex min-w-0 items-center gap-1.5 text-start font-semibold text-plt-text" onClick={onToggle} aria-expanded={expanded}><ChevronDown size={13} className={`shrink-0 text-plt-muted transition-transform ${expanded ? '' : '-rotate-90'}`} /><span className="truncate">{isAr ? group.nameAr : group.name}</span></button></td>
      <td className={`text-end font-semibold tabular-nums ${group.returnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>{percent(group.returnPct)}</td>
      <td className="text-end tabular-nums">{percent(group.alphaPct)}</td>
      <td className="text-end tabular-nums">{count(group.trades)}</td>
    </tr>
    {expanded && group.tickers.map((stock) => <tr key={stock.id}>
      <td><button type="button" className="ps-5 text-start text-tv-blue-400 hover:underline" onClick={() => onSelectTicker?.(stock.symbol)}>{stock.symbol}<span className="sr-only">{isAr ? ' عرض التفاصيل' : ' View company'}</span></button></td>
      <td className={`text-end tabular-nums ${stock.returnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>{percent(stock.returnPct)}</td>
      <td className="text-end tabular-nums">{percent(stock.alphaPct)}</td>
      <td className="text-end tabular-nums">{count(stock.trades)}</td>
    </tr>)}
  </>;
}
