'use client';

import React from 'react';
import BotHistoryKPIs from './history/BotHistoryKPIs';
import BotTradesLedgerCard, { type ClosedTrade } from './history/BotTradesLedgerCard';

interface BotHistoryViewProps {
  metrics?: {
    totalTrades: number;
    winRate: number;
    totalPnlPct: number;
    profitFactor: number;
    winningTrades: number;
    losingTrades: number;
  };
  trades: ClosedTrade[];
  onExportCsv: () => void;
}

export default function BotHistoryView({
  metrics,
  trades,
  onExportCsv,
}: BotHistoryViewProps) {
  return (
    <div className="page-sections-stack select-none">
      {/* SECTION 1: Historical Performance Summary */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Historical Performance Summary</h2>
          <p className="section-subtitle">All-time trade count, cumulative strategy returns, win rate, and profit factor</p>
        </div>

        <BotHistoryKPIs metrics={metrics} />
      </section>

      {/* SECTION 2: Executed & Closed Trades Ledger */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Executed & Closed Trades Ledger</h2>
          <p className="section-subtitle">Audited record of all algorithmic entries, exits, targets, and realized returns</p>
        </div>

        <BotTradesLedgerCard trades={trades} onExportCsv={onExportCsv} />
      </section>
    </div>
  );
}
