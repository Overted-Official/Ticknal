'use client';

import React, { useState, useMemo } from 'react';
import { Download } from '@/components/ui/icon-library';
import type { FullBacktestReport } from '@/strategies/registry';

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
  const [tradeFilter, setTradeFilter] = useState<'all' | 'wins' | 'losses'>('all');

  const filteredTrades = useMemo(() => {
    if (tradeFilter === 'wins') return trades.filter((t) => t.netPnl > 0);
    if (tradeFilter === 'losses') return trades.filter((t) => t.netPnl <= 0);
    return trades;
  }, [trades, tradeFilter]);

  return (
    <section id="section-strategy-trades-history" className="space-y-3.5 select-none font-sans">
      {/* Section Header */}
      <div className="flex flex-col gap-0.5 pb-2.5 border-b border-border-subtle">
        <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-snug">
          Trade History &amp; Executions
        </h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Audited execution log of all backtested signals, fill levels, net returns, and exit rationale
        </p>
      </div>

      {/* Header Filters & Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="seg-control shrink-0">
          {(['all', 'wins', 'losses'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setTradeFilter(filter)}
              className={`seg-control-btn capitalize ${
                tradeFilter === filter ? 'seg-control-btn-active' : ''
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onExportCSV}
          className="filter-control-btn"
        >
          <Download size={13} />
          <span>Download CSV</span>
        </button>
      </div>

      {/* Minimal Trades Table: No outer borders, hairline row separators only */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-[11px]">
              <th className="py-2.5 px-3 text-left font-medium">#</th>
              <th className="py-2.5 px-3 text-left font-medium">Entry Date</th>
              <th className="py-2.5 px-3 text-right font-medium">Entry Price</th>
              <th className="py-2.5 px-3 text-left font-medium">Exit Date</th>
              <th className="py-2.5 px-3 text-right font-medium">Exit Price</th>
              <th className="py-2.5 px-3 text-right font-medium">Units</th>
              <th className="py-2.5 px-3 text-right font-medium">Net PnL</th>
              <th className="py-2.5 px-3 text-right font-medium">Return %</th>
              <th className="py-2.5 px-3 text-left font-medium">Exit Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-white/40">
                  No trades found matching current filter.
                </td>
              </tr>
            ) : (
              filteredTrades
                .slice()
                .reverse()
                .map((t) => {
                  const isWin = t.netPnl > 0;
                  return (
                    <tr key={t.id} className="tabular-nums hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white/70">{t.tradeNumber}</td>
                      <td className="py-2.5 px-3 text-white/70">{t.entryDate}</td>
                      <td className="py-2.5 px-3 text-right text-white font-medium">
                        {t.entryPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-white/70">{t.exitDate}</td>
                      <td className="py-2.5 px-3 text-right text-white font-medium">
                        {t.exitPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-white/60">
                        {t.shares.toLocaleString()}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          isWin ? 'text-profit-num' : 'text-loss-num'
                        }`}
                      >
                        {isWin ? '+' : ''}
                        {t.netPnl.toFixed(2)} {currencySymbol}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          isWin ? 'text-profit-num' : 'text-loss-num'
                        }`}
                      >
                        {isWin ? '+' : ''}
                        {t.returnPct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-white/50 text-[11px] truncate max-w-[180px]">
                        {t.exitReason}
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
