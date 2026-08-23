'use client';

import React from 'react';
import { Download } from '@/components/ui/icon-library';

export interface ClosedTrade {
  id: number;
  tickerSymbol: string;
  companyName: string | null;
  strategyId: string;
  timeframe: string;
  entryPrice: string;
  entryTime: string;
  exitPrice: string;
  exitTime: string;
  exitReason: string;
  realizedPnlPct: string;
  quantity: string;
}

interface BotTradesLedgerCardProps {
  trades: ClosedTrade[];
  onExportCsv: () => void;
}

export default function BotTradesLedgerCard({ trades, onExportCsv }: BotTradesLedgerCardProps) {
  return (
    <div className="card-widget space-y-3 select-none">
      <div className="flex items-center justify-between pb-2 border-b border-plt-border-soft">
        <h2 className="section-title">Closed Trades Ledger</h2>
        <button
          type="button"
          onClick={onExportCsv}
          className="btn-token btn-secondary btn-compact"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-10">
          <p className="text-xs font-semibold text-plt-text font-sans">No closed trades recorded yet.</p>
          <p className="text-[11px] text-plt-muted font-sans mt-1">Closed trades will automatically populate here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar max-h-120">
          <table className="w-full text-left text-xs border-separate border-spacing-y-1 font-sans">
            <thead className="sticky top-0 z-10 bg-plt-surface text-[11px] font-semibold text-plt-muted uppercase tracking-wider">
              <tr>
                <th className="py-2 px-3.5 first:rounded-l-lg">Ticker</th>
                <th className="py-2 px-3.5">Strategy</th>
                <th className="py-2 px-3.5">Entry Price / Time</th>
                <th className="py-2 px-3.5">Exit Price / Time</th>
                <th className="py-2 px-3.5">Exit Reason</th>
                <th className="py-2 px-3.5 text-right last:rounded-r-lg">Realized Return</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const pnl = Number(trade.realizedPnlPct || 0);
                return (
                  <tr key={trade.id} className="hover:bg-plt-hover/60 transition-colors group">
                    <td className="py-2.5 px-3.5 first:rounded-l-xl row-title font-sans font-bold text-plt-text">{trade.tickerSymbol}</td>
                    <td className="py-2.5 px-3.5 row-subtitle font-sans">{trade.strategyId}</td>
                    <td className="py-2.5 px-3.5 font-sans">
                      <div className="font-semibold text-plt-text">{Number(trade.entryPrice).toFixed(2)} £</div>
                      <div className="text-[10px] text-plt-muted font-sans">
                        {new Date(trade.entryTime).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 font-sans">
                      <div className="font-semibold text-plt-text">{Number(trade.exitPrice).toFixed(2)} £</div>
                      <div className="text-[10px] text-plt-muted font-sans">
                        {new Date(trade.exitTime).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="badge badge-muted font-sans">
                        {trade.exitReason}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-sans last:rounded-r-xl">
                      <span
                        className={`badge font-sans ${
                          pnl >= 0 ? 'badge-profit' : 'badge-risk'
                        }`}
                      >
                        {pnl >= 0 ? '+' : ''}
                        {pnl.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
