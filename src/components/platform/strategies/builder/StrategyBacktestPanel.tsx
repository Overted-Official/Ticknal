'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, LayoutGrid, Table2 } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import {
  BACKTEST_GROUPS,
  type BacktestGroupItem,
  type BacktestViewMode,
} from './strategy-builder-fixtures';
import StrategyBacktestTreemap from './StrategyBacktestTreemap';
import { getMockBacktestPreview, type BacktestMode } from './strategy-backtest-model';

function TickerLogoAvatar({ logoUrl, symbol }: { logoUrl?: string | null; symbol: string }) {
  const [imgError, setImgError] = useState(false);
  const cleanSymbol = symbol.replace('.CA', '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);

  if (logoUrl && !imgError) {
    return (
      <div className="w-6 h-6 rounded-full border border-white/10 bg-white/[0.04] overflow-hidden flex items-center justify-center shrink-0">
        <img
          src={logoUrl}
          alt={cleanSymbol}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-6 h-6 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-[9px] font-bold text-neutral-300 shrink-0 select-none">
      {initial}
    </div>
  );
}

interface StrategyBacktestPanelProps {
  readonly strategyId: string;
  readonly strategyName: string;
  readonly hasRules: boolean;
  readonly draftRevision: number;
  readonly locale: 'en' | 'ar';
  readonly onSelectTicker?: (symbol: string) => void;
}

export default function StrategyBacktestPanel({
  strategyId,
  hasRules,
  locale,
  onSelectTicker,
}: StrategyBacktestPanelProps) {
  const isAr = locale === 'ar';
  const { isPrivacy } = usePrivacyMode();
  const [viewMode, setViewMode] = useState<BacktestViewMode>('heatmap');
  const [selectedTickerId, setSelectedTickerId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const mode: BacktestMode = 'all';

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const preview = useMemo(
    () => getMockBacktestPreview(strategyId, mode, 'industryGroup', hasRules, 'primary'),
    [hasRules, mode, strategyId],
  );

  const groups = useMemo<readonly BacktestGroupItem[]>(() => {
    return preview?.groups ?? BACKTEST_GROUPS;
  }, [preview]);

  const handleSelectTicker = (symbol: string) => {
    setSelectedTickerId(symbol);
    onSelectTicker?.(symbol);
  };

  const percent = (value: number) => (isPrivacy ? '••••' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`);
  const plainPercent = (value: number) => (isPrivacy ? '••••' : `${value.toFixed(0)}%`);
  const count = (value: number) => (isPrivacy ? '••••' : String(value));

  const kpis = preview
    ? [
        {
          id: 'return',
          label: isAr ? 'عائد الاستراتيجية' : 'Strategy return',
          value: percent(preview.kpis.strategyReturn),
          context: isAr ? 'سوق EGX' : 'EGX universe',
          tone: 'positive' as const,
        },
        {
          id: 'alpha',
          label: isAr ? 'ألفا مقابل EGX 30' : 'Alpha vs EGX 30',
          value: percent(preview.kpis.alpha),
          context: isAr
            ? `المؤشر ${percent(preview.kpis.benchmarkReturn)}`
            : `benchmark ${percent(preview.kpis.benchmarkReturn)}`,
          tone: 'positive' as const,
        },
        {
          id: 'win-rate',
          label: isAr ? 'نسبة الفوز' : 'Win rate',
          value: plainPercent(preview.kpis.winRate),
          context: isAr ? `${count(preview.kpis.totalTrades)} صفقة مغلقة` : `${count(preview.kpis.totalTrades)} closed trades`,
          tone: 'neutral' as const,
        },
        {
          id: 'drawdown',
          label: isAr ? 'أقصى تراجع' : 'Max drawdown',
          value: percent(preview.kpis.maxDrawdown),
          context: isAr ? 'من القمة إلى القاع' : 'peak to trough',
          tone: 'negative' as const,
        },
      ]
    : [];

  return (
    <section className="min-w-0 bg-black p-0" aria-label={isAr ? 'لوحة الاختبار الخلفي' : 'Backtesting dashboard'}>
      {preview ? (
        <>
          {/* 1. View Mode Switch (Treemap vs Table) */}
          <div className="mb-2.5 flex items-center justify-end">
            <div className="seg-control shrink-0" role="tablist" aria-label={isAr ? 'نوع العرض' : 'View mode'}>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'heatmap'}
                onClick={() => setViewMode('heatmap')}
                className={`seg-control-btn inline-flex items-center gap-1.5 ${
                  viewMode === 'heatmap' ? 'seg-control-btn-active active' : ''
                }`}
                aria-label={isAr ? 'عرض خريطة الأداء' : 'Treemap view'}
              >
                <LayoutGrid size={13} />
                <span>{isAr ? 'خريطة الأداء' : 'Treemap'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'table'}
                onClick={() => setViewMode('table')}
                className={`seg-control-btn inline-flex items-center gap-1.5 ${
                  viewMode === 'table' ? 'seg-control-btn-active active' : ''
                }`}
                aria-label={isAr ? 'عرض الجدول' : 'Table view'}
              >
                <Table2 size={13} />
                <span>{isAr ? 'الجدول' : 'Table'}</span>
              </button>
            </div>
          </div>

          {/* 2. Sleek & Condensed KPI Rail */}
          <div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.id}
                className="group flex flex-col justify-between rounded-lg border border-white/10 bg-black px-3 py-2 sm:px-3.5 sm:py-2.5 transition-colors hover:border-white/20 hover:bg-white/[0.02] cursor-default"
              >
                <div className="flex items-center justify-between gap-2 leading-none">
                  <span className="truncate text-[10px] sm:text-[11px] font-medium text-white/50 tracking-tight">
                    {kpi.label}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      kpi.tone === 'positive'
                        ? 'bg-plt-profit shadow-[0_0_6px_rgba(34,197,94,0.4)]'
                        : kpi.tone === 'negative'
                        ? 'bg-plt-risk shadow-[0_0_6px_rgba(239,68,68,0.4)]'
                        : 'bg-white/30'
                    }`}
                  />
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2 leading-none">
                  <span
                    className={`shrink-0 text-sm sm:text-base font-bold tabular-nums tracking-tight ${
                      kpi.tone === 'positive'
                        ? 'text-plt-profit'
                        : kpi.tone === 'negative'
                        ? 'text-plt-risk'
                        : 'text-white'
                    }`}
                  >
                    {kpi.value}
                  </span>
                  <span className="truncate text-end text-[9px] sm:text-[10px] font-normal text-white/40 tabular-nums">
                    {isPrivacy ? '••••' : kpi.context}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Treemap vs Table View */}
          {viewMode === 'heatmap' ? (
            <div data-testid="strategy-backtest-heatmap">
              <StrategyBacktestTreemap
                groups={groups}
                selectedTickerId={selectedTickerId}
                locale={locale}
                onSelectTicker={handleSelectTicker}
              />
            </div>
          ) : (
            <div
              className="custom-scrollbar max-h-[500px] overflow-auto rounded-xl border border-white/10"
              data-testid="strategy-backtest-table"
            >
              <table className="w-full min-w-[560px] border-collapse font-sans text-xs">
                <thead className="sticky top-0 z-10 border-b border-white/10 bg-black text-[10px] font-medium text-plt-muted">
                  <tr>
                    <th className="py-2.5 px-3 text-start font-medium">{isAr ? 'المجموعة / السهم' : 'Group / Ticker'}</th>
                    <th className="px-3 py-2.5 text-end font-medium">{isAr ? 'العائد' : 'Return'}</th>
                    <th className="px-3 py-2.5 text-end font-medium">{isAr ? 'ألفا' : 'Alpha'}</th>
                    <th className="px-3 py-2.5 text-end font-medium">{isAr ? 'نسبة الفوز' : 'Win rate'}</th>
                    <th className="px-3 py-2.5 text-end font-medium">{isAr ? 'الصفقات' : 'Trades'}</th>
                    <th className="px-3 py-2.5 text-center font-medium">{isAr ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {groups.map((group) => {
                    const isCollapsed = Boolean(collapsedGroups[group.id]);
                    return (
                      <React.Fragment key={group.id}>
                        {/* Group Header Row */}
                        <tr
                          onClick={() => toggleGroupCollapse(group.id)}
                          className="bg-white/[0.03] hover:bg-white/[0.06] text-white font-semibold text-[11px] cursor-pointer transition-colors select-none"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <ChevronDown
                                size={13}
                                className={`text-white/50 transition-transform duration-200 shrink-0 ${
                                  isCollapsed ? (isAr ? 'rotate-90' : '-rotate-90') : 'rotate-0'
                                }`}
                              />
                              <span className="truncate">{isAr ? group.nameAr : group.name}</span>
                              <span className="text-[10px] text-white/40 font-normal">
                                ({group.tickers.length} {isAr ? 'أسهم' : 'tickers'})
                              </span>
                            </div>
                          </td>
                          <td
                            className={`px-3 py-2.5 text-end tabular-nums font-bold ${
                              group.returnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                            }`}
                          >
                            {percent(group.returnPct)}
                          </td>
                          <td className="px-3 py-2.5 text-end tabular-nums text-white/70">{percent(group.alphaPct)}</td>
                          <td className="px-3 py-2.5 text-end tabular-nums text-white/70">{group.winRate}%</td>
                          <td className="px-3 py-2.5 text-end tabular-nums text-white/70">{group.trades}</td>
                          <td className="px-3 py-2.5 text-center text-white/30 text-[10px]">—</td>
                        </tr>

                        {/* Constituent Ticker Rows */}
                        {!isCollapsed &&
                          group.tickers.map((t) => (
                            <tr
                              key={t.id}
                              onClick={() => handleSelectTicker(t.symbol)}
                              className="hover:bg-white/[0.06] transition-colors cursor-pointer group"
                            >
                              <td className="py-2.5 ps-7 pe-3 text-start">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <TickerLogoAvatar logoUrl={t.logoUrl} symbol={t.symbol} />
                                  <div className="min-w-0 flex items-center gap-2">
                                    <span className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                                      {isAr ? t.nameAr : t.name}
                                    </span>
                                    <span className="text-[10px] text-white/50 font-normal px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 shrink-0">
                                      {t.symbol}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td
                                className={`px-3 py-2.5 text-end tabular-nums font-bold ${
                                  t.returnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                                }`}
                              >
                                {percent(t.returnPct)}
                              </td>
                              <td className="px-3 py-2.5 text-end tabular-nums text-white/70">{percent(t.alphaPct)}</td>
                              <td className="px-3 py-2.5 text-end tabular-nums text-white/70">{t.winRate}%</td>
                              <td className="px-3 py-2.5 text-end tabular-nums text-white/70">{t.trades}</td>
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectTicker(t.symbol);
                                  }}
                                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                                >
                                  {isAr ? 'عرض ←' : 'View →'}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
          <LayoutGrid size={24} className="text-white/25" />
          <h3 className="mt-4 text-sm font-semibold text-white">{isAr ? 'أكمل قواعد الاستراتيجية' : 'Complete the strategy rules'}</h3>
          <p className="mt-2 max-w-sm text-xs leading-5 text-plt-muted">
            {isAr
              ? 'أضف قاعدة شراء واحدة وقاعدة بيع واحدة على الأقل لعرض معاينة الأداء.'
              : 'Add at least one buy rule and one sell rule to unlock the performance preview.'}
          </p>
        </div>
      )}
    </section>
  );
}
