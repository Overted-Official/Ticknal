'use client';

import React from 'react';

export interface TickerWalletItem {
  id: number;
  tickerSymbol: string;
  companyName: string;
  sector: string;
  isEnabled: boolean;
  status: string;
  allocatedBudgetEgp: number;
  maxLossHaltPct: number;
  currentExposureEgp: number;
  hasOpenPosition: boolean;
  unrealizedPnlPct: number;
  unrealizedPnlEgp: number;
  realizedPnlPct: number;
  realizedPnlEgp: number;
  tradesToday: number;
  winRateToday: number;
  historicalAlpha: number;
  historicalWinRate: number;
  avgBars: number;
}

interface BotUniverseMatrixCardProps {
  wallets: TickerWalletItem[];
  enabledCount: number;
}

export default function BotUniverseMatrixCard({ wallets, enabledCount }: BotUniverseMatrixCardProps) {
  return (
    <div className="card-widget space-y-3 select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-plt-border-soft">
        <div>
          <h2 className="section-title">Ticker Wallets & Session Performance Breakdown</h2>
          <p className="section-subtitle mt-0.5">
            Individual balance, risk limits, and realized returns per ticker for this session.
          </p>
        </div>
        <span className="chip-token">
          {enabledCount} Authorized Tickers
        </span>
      </div>

      <div className="overflow-x-auto custom-scrollbar max-h-96">
        <table className="w-full text-left text-xs border-separate border-spacing-y-1 font-sans">
          <thead className="sticky top-0 z-10 bg-plt-surface text-[11px] font-semibold text-plt-muted uppercase tracking-wider">
            <tr>
              <th className="py-2 px-3.5 first:rounded-l-lg">Ticker</th>
              <th className="py-2 px-3.5">Allocated Budget</th>
              <th className="py-2 px-3.5">Current Exposure</th>
              <th className="py-2 px-3.5">Realized P&L</th>
              <th className="py-2 px-3.5">Floating P&L</th>
              <th className="py-2 px-3.5">Trades (Win Rate)</th>
              <th className="py-2 px-3.5 text-right last:rounded-r-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((wallet) => (
              <tr
                key={wallet.id}
                className={`hover:bg-plt-hover/60 transition-colors group ${
                  wallet.isEnabled ? '' : 'opacity-40'
                }`}
              >
                <td className="py-2.5 px-3.5 first:rounded-l-xl">
                  <div className="row-title font-sans font-bold">{wallet.tickerSymbol}</div>
                  <div className="row-subtitle truncate max-w-36 font-sans">
                    {wallet.companyName}
                  </div>
                </td>
                <td className="py-2.5 px-3.5 font-sans font-medium text-plt-text">
                  {wallet.allocatedBudgetEgp.toLocaleString()} £
                </td>
                <td className="py-2.5 px-3.5 font-sans">
                  {wallet.currentExposureEgp > 0 ? (
                    <span className="text-plt-warning font-semibold">
                      {wallet.currentExposureEgp.toFixed(2)} £
                    </span>
                  ) : (
                    <span className="text-plt-faint">0.00 £</span>
                  )}
                </td>
                <td className="py-2.5 px-3.5 font-sans">
                  <span
                    className={`font-semibold ${
                      wallet.realizedPnlEgp >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                    }`}
                  >
                    {wallet.realizedPnlEgp >= 0 ? '+' : ''}
                    {wallet.realizedPnlEgp.toFixed(2)} £
                  </span>
                </td>
                <td className="py-2.5 px-3.5 font-sans">
                  {wallet.hasOpenPosition ? (
                    <span
                      className={`font-semibold ${
                        wallet.unrealizedPnlEgp >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                      }`}
                    >
                      {wallet.unrealizedPnlEgp >= 0 ? '+' : ''}
                      {wallet.unrealizedPnlEgp.toFixed(2)} £ ({wallet.unrealizedPnlPct.toFixed(2)}%)
                    </span>
                  ) : (
                    <span className="text-plt-faint">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3.5 font-sans">
                  {wallet.tradesToday > 0 ? (
                    <span>
                      {wallet.tradesToday} ({wallet.winRateToday.toFixed(0)}% WR)
                    </span>
                  ) : (
                    <span className="text-plt-faint">0 trades</span>
                  )}
                </td>
                <td className="py-2.5 px-3.5 text-right last:rounded-r-xl">
                  <span className={`badge font-sans ${wallet.isEnabled ? 'badge-profit' : 'badge-muted'}`}>
                    {wallet.isEnabled ? 'Active' : 'Paused'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
