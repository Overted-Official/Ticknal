'use client';

import React from 'react';
import { RefreshCw } from '@/components/ui/icon-library';

export interface ActivePosition {
  id: number;
  tickerSymbol: string;
  companyName: string | null;
  strategyId: string;
  timeframe: string;
  status: string;
  entryPrice: string;
  entryTime: string;
  quantity: string;
  highestPrice: string | null;
  targetPrice: string | null;
  trailingStopPrice: string | null;
  currentPrice: string | null;
  unrealizedPnlPct: string | null;
}

interface BotActivePositionsCardProps {
  positions: ActivePosition[];
  onRefresh: () => void;
  onForceClose: (id: number) => void;
  closingPositionId: number | null;
}

export default function BotActivePositionsCard({
  positions,
  onRefresh,
  onForceClose,
  closingPositionId,
}: BotActivePositionsCardProps) {
  return (
    <div className="card-widget space-y-3 select-none flex flex-col h-[400px]">
      <div className="flex items-center justify-between pb-2 border-b border-plt-border-soft shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="section-title">Active Live Positions</h2>
          <span className="badge badge-accent">
            {positions.length} Open
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="btn-token btn-ghost btn-compact"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <p className="text-xs font-semibold text-plt-text font-sans">No open intraday positions right now.</p>
          <p className="text-[11px] text-plt-muted font-sans mt-1">
            Monitoring authorized basket triggers on 15m candle closes.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-separate border-spacing-y-1 font-sans">
            <thead className="sticky top-0 z-10 bg-plt-surface text-[11px] font-semibold text-plt-muted uppercase tracking-wider">
              <tr>
                <th className="py-2 px-3.5 first:rounded-l-lg">Ticker</th>
                <th className="py-2 px-3.5">Entry</th>
                <th className="py-2 px-3.5">Current</th>
                <th className="py-2 px-3.5">Target</th>
                <th className="py-2 px-3.5">P&L</th>
                <th className="py-2 px-3.5 text-right last:rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const pnl = Number(pos.unrealizedPnlPct || 0);
                return (
                  <tr key={pos.id} className="hover:bg-plt-hover/60 transition-colors group">
                    <td className="py-2.5 px-3.5 first:rounded-l-xl">
                      <div className="row-title font-sans font-bold">{pos.tickerSymbol}</div>
                      <div className="row-subtitle truncate max-w-28 font-sans">
                        {pos.companyName || '—'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 font-sans font-medium">{Number(pos.entryPrice).toFixed(2)} £</td>
                    <td className="py-2.5 px-3.5 font-sans font-medium text-plt-text">
                      {Number(pos.currentPrice || pos.entryPrice).toFixed(2)} £
                    </td>
                    <td className="py-2.5 px-3.5 font-sans font-medium text-plt-profit">
                      {pos.targetPrice ? `${Number(pos.targetPrice).toFixed(2)} £` : '—'}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`badge font-sans ${
                          pnl >= 0 ? 'badge-profit' : 'badge-risk'
                        }`}
                      >
                        {pnl >= 0 ? '+' : ''}
                        {pnl.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right last:rounded-r-xl">
                      <button
                        type="button"
                        onClick={() => onForceClose(pos.id)}
                        disabled={closingPositionId === pos.id}
                        className="btn-token btn-danger btn-compact font-sans"
                      >
                        {closingPositionId === pos.id ? '...' : 'EXIT'}
                      </button>
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
