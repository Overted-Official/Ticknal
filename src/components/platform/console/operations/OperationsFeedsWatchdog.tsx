'use client';

import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, CheckCircle2, AlertTriangle } from '@/components/ui/icon-library';
import { triggerCronAction } from '@/lib/server/console-actions';
import InlineSpinner from '@/components/ui/InlineSpinner';
import type { ConsoleOperationsPageData } from '@/lib/server/console-queries';

interface OperationsFeedsWatchdogProps {
  feeds: ConsoleOperationsPageData['feeds'];
  onRefresh?: () => void;
}

export default function OperationsFeedsWatchdog({
  feeds,
  onRefresh,
}: OperationsFeedsWatchdogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredTickers = useMemo(() => {
    if (!searchTerm.trim()) return feeds.tickers;
    const q = searchTerm.toLowerCase();
    return feeds.tickers.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        (t.companyName && t.companyName.toLowerCase().includes(q)) ||
        (t.sector && t.sector.toLowerCase().includes(q))
    );
  }, [feeds.tickers, searchTerm]);

  const handleRunStocksIngestion = async () => {
    setIsTriggering(true);
    setFeedback(null);
    try {
      const res = await triggerCronAction('update-stocks');
      if (res.success) {
        setFeedback('Stocks ingestion completed successfully.');
        onRefresh?.();
      } else {
        setFeedback(`Ingestion error: ${res.error}`);
      }
    } catch (err) {
      setFeedback(`Error: ${String(err)}`);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Feeds Watchdog KPI Rail */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* KPI 1: Tracked Securities */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Tracked Securities
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-blue-500/10 text-blue-400 border border-blue-500/20">
              EGX Market
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {feeds.totalTickers}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Equities
            </span>
          </div>
        </div>

        {/* KPI 2: Sync Freshness Rate */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Market Feed Sync Rate
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {feeds.syncedTickersCount} Synced
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {feeds.syncRatePct}%
            </span>
            <span className="text-[10px] sm:text-[11px] text-emerald-400 font-medium leading-none">
              Fresh Daily Bars
            </span>
          </div>
        </div>

        {/* KPI 3: Stale / Missing Equities */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Stale / Missing Feeds
            </span>
            <span
              className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${
                feeds.staleTickersCount === 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {feeds.staleTickersCount === 0 ? 'Optimal' : 'Needs Ingestion'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {feeds.staleTickersCount}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Tickers Pending
            </span>
          </div>
        </div>

        {/* KPI 4: Active Strategy Models */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Quant Pipeline Models
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Algorithmic
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              3 Models
            </span>
            <span className="text-[10px] sm:text-[11px] text-purple-400 font-medium leading-none">
              Champion / PSI / Mom
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="border border-white/20 p-3 bg-black/60 rounded-xl text-xs text-white flex items-center justify-between">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toolbar: Search + Manual Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10 p-3 bg-transparent rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search securities by symbol, company, or sector..."
            className="w-full bg-black border border-white/15 text-white placeholder-zinc-500 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <button
          disabled={isTriggering}
          onClick={handleRunStocksIngestion}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
        >
          {isTriggering ? (
            <InlineSpinner className="w-3 h-3" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          <span>Trigger Stocks Ingestion</span>
        </button>
      </div>

      {/* Tickers Table */}
      <div className="border border-white/10 bg-transparent rounded-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium bg-black">
                <th className="py-2.5 px-4 text-left font-medium">Security</th>
                <th className="py-2.5 px-3 text-left font-medium">Sector</th>
                <th className="py-2.5 px-3 text-right font-medium">Latest Close</th>
                <th className="py-2.5 px-3 text-right font-medium">Data As Of</th>
                <th className="py-2.5 pr-4 pl-3 text-right font-medium">Feed Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredTickers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 text-xs">
                    No securities match your search query.
                  </td>
                </tr>
              ) : (
                filteredTickers.map((t) => (
                  <tr key={t.symbol} className="hover:bg-white/[0.03] transition-colors">
                    {/* 1. Security */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-[10px] shrink-0 border border-white/10">
                          {t.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-white block">{t.symbol}</span>
                          <span className="text-[11px] text-zinc-400 block truncate max-w-[200px]">
                            {t.companyName || t.symbol}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Sector */}
                    <td className="py-3 px-3 text-zinc-300 text-[11px]">
                      {t.sector || 'Unassigned'}
                    </td>

                    {/* 3. Latest Close */}
                    <td className="py-3 px-3 text-right tabular-nums text-white font-medium">
                      {t.latestClose !== null ? `${t.latestClose.toFixed(2)} ${t.currency}` : 'N/A'}
                    </td>

                    {/* 4. Data As Of */}
                    <td className="py-3 px-3 text-right text-zinc-400 tabular-nums text-[11px]">
                      {t.latestDate || 'No data'}
                    </td>

                    {/* 5. Feed Status */}
                    <td className="py-3 pr-4 pl-3 text-right">
                      {t.isSynced ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Synced</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Stale</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
