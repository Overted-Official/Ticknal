'use client';

import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown } from '@/components/ui/icon-library';
import { triggerCronAction } from '@/lib/server/console-actions';
import InlineSpinner from '@/components/ui/InlineSpinner';
import type { ConsoleOperationsPageData } from '@/lib/server/console-queries';

interface FeedsWatchdogTableProps {
  tickers: ConsoleOperationsPageData['feeds']['tickers'];
  onRefresh?: () => void;
}

export default function FeedsWatchdogTable({
  tickers,
  onRefresh,
}: FeedsWatchdogTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const filteredTickers = useMemo(() => {
    if (!searchTerm.trim()) return tickers;
    const q = searchTerm.toLowerCase();
    return tickers.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        (t.companyName && t.companyName.toLowerCase().includes(q)) ||
        (t.sector && t.sector.toLowerCase().includes(q))
    );
  }, [tickers, searchTerm]);

  const handleRunStocksIngestion = async () => {
    setIsTriggering(true);
    setFeedback(null);
    try {
      const res = await triggerCronAction('update-stocks');
      if (res.success) {
        setFeedback({ tone: 'success', message: 'Stocks ingestion completed successfully.' });
        onRefresh?.();
      } else {
        setFeedback({ tone: 'error', message: `Ingestion error: ${res.error}` });
      }
    } catch (err) {
      setFeedback({ tone: 'error', message: `Error: ${String(err)}` });
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`operations-feedback operations-feedback-${feedback.tone}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2 min-w-0">
            {feedback.tone === 'success' ? (
              <CheckCircle2 className="operations-feedback-icon text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertTriangle className="operations-feedback-icon text-rose-400" aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="drawer-close-btn !w-6 !h-6"
            aria-label="Dismiss ingestion status"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      {/* Toolbar: Search + Manual Trigger */}
      <div className="operations-toolbar">
        <div className="operations-search">
          <Search className="operations-search-icon" aria-hidden="true" />
          <label htmlFor="operations-feed-search" className="sr-only">Search securities</label>
          <input
            id="operations-feed-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search securities by symbol, company, or sector..."
            className="input-token"
          />
        </div>

        <button
          disabled={isTriggering}
          onClick={handleRunStocksIngestion}
          className="btn-token btn-secondary btn-compact shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
      <div className="operations-table-shell">
        <div className="operations-table-scroll custom-scrollbar">
          <table className="data-table operations-table">
            <caption className="sr-only">Tracked EGX securities and market data feed status</caption>
            <thead>
              <tr>
                <th className="text-left">Security</th>
                <th className="text-left">Sector</th>
                <th className="text-right">Latest Close</th>
                <th className="text-right">Data As Of</th>
                <th className="text-right">Feed Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/40 text-xs">
                    No securities match your search query.
                  </td>
                </tr>
              ) : (
                (showAll ? filteredTickers : filteredTickers.slice(0, 5)).map((t) => (
                  <tr key={t.symbol}>
                    {/* 1. Security */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center font-bold text-white text-[10px] shrink-0 border border-white/10">
                          {t.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-white block">{t.symbol}</span>
                          <span className="text-[11px] text-white/60 block truncate max-w-[200px]">
                            {t.companyName || t.symbol}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Sector */}
                    <td className="py-3 px-3 text-white/70 text-[11px]">
                      {t.sector || 'Unassigned'}
                    </td>

                    {/* 3. Latest Close */}
                    <td className="py-3 px-3 text-right tabular-nums text-white font-medium">
                      {t.latestClose !== null ? `${t.latestClose.toFixed(2)} ${t.currency}` : 'N/A'}
                    </td>

                    {/* 4. Data As Of */}
                    <td className="py-3 px-3 text-right text-white/50 tabular-nums text-[11px]">
                      {t.latestDate || 'No data'}
                    </td>

                    {/* 5. Feed Status */}
                    <td className="py-3 pr-4 pl-3 text-right">
                      {t.isSynced ? (
                        <span className="badge badge-profit !text-[10px] !min-h-5 !px-2">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Synced</span>
                        </span>
                      ) : (
                        <span className="badge badge-warning !text-[10px] !min-h-5 !px-2">
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

        {/* Footer: Row Counter + Show All / Show Less Toggle Button */}
        <div className="operations-table-footer">
          <span className="tabular-nums">
            Showing <span className="text-white font-medium">{showAll ? filteredTickers.length : Math.min(5, filteredTickers.length)}</span> of <span className="text-white font-medium">{filteredTickers.length}</span> securities
          </span>
          {filteredTickers.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="btn-token btn-secondary btn-compact self-start sm:self-auto"
              aria-expanded={showAll}
            >
              <span>{showAll ? 'Show Less (5)' : `Show All (${filteredTickers.length})`}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showAll ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
