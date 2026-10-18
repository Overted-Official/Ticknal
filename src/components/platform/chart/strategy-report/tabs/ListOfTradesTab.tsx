'use client';

import React, { useState, useMemo } from 'react';
import { Download } from '@/components/ui/icon-library';
import type { FullBacktestReport } from '@/strategies/registry';
import { useTranslation } from '@/lib/i18n';

interface ListOfTradesTabProps {
  trades: FullBacktestReport['trades'];
  currencySymbol: string;
  onExportCSV: () => void;
}

export default function ListOfTradesTab({
  trades,
  currencySymbol,
  onExportCSV,
}: ListOfTradesTabProps) {
  const { locale } = useTranslation();
  const [tradeFilter, setTradeFilter] = useState<'all' | 'wins' | 'losses'>('all');

  const displayCurrency = currencySymbol === 'EGP' && locale === 'ar' ? 'ج.م' : currencySymbol;

  const filteredTrades = useMemo(() => {
    if (tradeFilter === 'wins') return trades.filter((t) => t.netPnl > 0);
    if (tradeFilter === 'losses') return trades.filter((t) => t.netPnl <= 0);
    return trades;
  }, [trades, tradeFilter]);

  return (
    <section id="section-strategy-trades-history" className="space-y-3.5 select-none font-sans">
      {/* Section Header */}
      <div className="flex flex-col gap-0.5 pb-2.5 border-b border-plt-border-soft">
        <h3 className="text-sm sm:text-[15px] font-bold text-plt-text tracking-tight leading-snug">
          {locale === 'ar' ? 'سجل الصفقات والتنفيذات' : 'Trade History & Executions'}
        </h3>
        <p className="text-xs text-plt-muted leading-relaxed">
          {locale === 'ar'
            ? 'سجل تدقيق كامل لجميع إشارات الاختبار التاريخي، ومستويات التنفيذ، وصافي العوائد، وأسباب الخروج'
            : 'Audited execution log of all backtested signals, fill levels, net returns, and exit rationale'}
        </p>
      </div>

      {/* Header Filters & Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="seg-control shrink-0">
          {(['all', 'wins', 'losses'] as const).map((filter) => {
            const label =
              filter === 'all'
                ? locale === 'ar' ? 'الكل' : 'All'
                : filter === 'wins'
                ? locale === 'ar' ? 'الرابحة' : 'Wins'
                : locale === 'ar' ? 'الخاسرة' : 'Losses';

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setTradeFilter(filter)}
                className={`seg-control-btn capitalize ${
                  tradeFilter === filter ? 'seg-control-btn-active' : ''
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onExportCSV}
          className="filter-control-btn cursor-pointer"
        >
          <Download size={13} />
          <span>{locale === 'ar' ? 'تحميل CSV' : 'Download CSV'}</span>
        </button>
      </div>

      {/* Minimal Trades Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-plt-border text-plt-muted text-[11px]">
              <th className="py-2.5 px-3 text-start font-medium">#</th>
              <th className="py-2.5 px-3 text-start font-medium">{locale === 'ar' ? 'تاريخ الدخول' : 'Entry Date'}</th>
              <th className="py-2.5 px-3 text-end font-medium">{locale === 'ar' ? 'سعر الدخول' : 'Entry Price'}</th>
              <th className="py-2.5 px-3 text-start font-medium">{locale === 'ar' ? 'تاريخ الخروج' : 'Exit Date'}</th>
              <th className="py-2.5 px-3 text-end font-medium">{locale === 'ar' ? 'سعر الخروج' : 'Exit Price'}</th>
              <th className="py-2.5 px-3 text-end font-medium">{locale === 'ar' ? 'الكمية' : 'Units'}</th>
              <th className="py-2.5 px-3 text-end font-medium">{locale === 'ar' ? 'صافي الربح/الخسارة' : 'Net PnL'}</th>
              <th className="py-2.5 px-3 text-end font-medium">{locale === 'ar' ? 'العائد %' : 'Return %'}</th>
              <th className="py-2.5 px-3 text-start font-medium">{locale === 'ar' ? 'سبب الخروج' : 'Exit Reason'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-plt-border-soft">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-plt-faint">
                  {locale === 'ar' ? 'لا توجد صفقات مطابقة للتصفية المحددة.' : 'No trades found matching current filter.'}
                </td>
              </tr>
            ) : (
              filteredTrades
                .slice()
                .reverse()
                .map((t) => {
                  const isWin = t.netPnl > 0;
                  const isOpen = !t.exitDate || t.isOpen || t.exitDate === '' || t.exitReason === 'Backtest End' || t.exitReason === 'Open Position';
                  return (
                    <tr key={t.id} className="tabular-nums hover:bg-plt-hover transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-plt-subtle text-start">{t.tradeNumber}</td>
                      <td className="py-2.5 px-3 text-plt-subtle text-start">{t.entryDate}</td>
                      <td className="py-2.5 px-3 text-end text-plt-text font-medium">
                        {t.entryPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-start">
                        {isOpen ? (
                          <span className="text-plt-faint font-normal select-none">—</span>
                        ) : (
                          <span className="text-plt-subtle">{t.exitDate}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-end font-medium">
                        {isOpen ? (
                          <span className="text-plt-faint font-normal select-none">—</span>
                        ) : (
                          <span className="text-plt-text">{t.exitPrice ? t.exitPrice.toFixed(2) : '—'}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-end text-plt-muted">
                        {t.shares.toLocaleString()}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-end font-semibold ${
                          isWin ? 'text-profit-num' : 'text-loss-num'
                        }`}
                      >
                        {isWin ? '+' : ''}
                        {t.netPnl.toFixed(2)} {displayCurrency}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-end font-semibold ${
                          isWin ? 'text-profit-num' : 'text-loss-num'
                        }`}
                      >
                        {isWin ? '+' : ''}
                        {t.returnPct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-start text-[11px] truncate max-w-[180px]">
                        {isOpen ? (
                          <span className="text-amber-400/90 font-medium inline-flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>{locale === 'ar' ? 'صفقة مفتوحة' : 'Open Position'}</span>
                          </span>
                        ) : (
                          <span className="text-plt-muted">{t.exitReason}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
