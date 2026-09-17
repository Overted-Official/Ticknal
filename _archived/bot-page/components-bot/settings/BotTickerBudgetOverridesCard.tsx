'use client';

import React from 'react';
import { Search, Filter } from '@/components/ui/icon-library';
import { type TickerWalletItem } from '../analytics/BotUniverseMatrixCard';

interface BotTickerBudgetOverridesCardProps {
  tickerWallets: TickerWalletItem[];
  filteredTickerWallets: TickerWalletItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSector: string;
  onSectorChange: (s: string) => void;
  sectors: string[];
  editingBudgets: Record<string, { budget: number; maxLoss: number }>;
  onEditBudget: (symbol: string, budget: number, maxLoss: number) => void;
  onSaveBudget: (symbol: string, budget: number, maxLoss: number) => void;
  isSavingBudget: string | null;
  onToggleTickerActive: (symbol: string, currentState: boolean) => void;
  onSetBulkBudgets: (budget: number) => void;
}

export default function BotTickerBudgetOverridesCard({
  tickerWallets,
  filteredTickerWallets,
  searchQuery,
  onSearchChange,
  selectedSector,
  onSectorChange,
  sectors,
  editingBudgets,
  onEditBudget,
  onSaveBudget,
  isSavingBudget,
  onToggleTickerActive,
  onSetBulkBudgets,
}: BotTickerBudgetOverridesCardProps) {
  return (
    <div className="card-widget space-y-4 select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-plt-border-soft">
        <div>
          <h2 className="section-title">
            Ticker Universe, Budgets & Drawdown Risk Limits
          </h2>
          <p className="section-subtitle mt-0.5">
            Configure dedicated capital allocation and individual stop-loss halts per ticker wallet.
          </p>
        </div>

        {/* Bulk Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onSetBulkBudgets(5000)}
            className="btn-token btn-secondary btn-compact font-sans"
          >
            Set All 5K £
          </button>
          <button
            type="button"
            onClick={() => onSetBulkBudgets(2000)}
            className="btn-token btn-secondary btn-compact font-sans"
          >
            Set All 2K £
          </button>
          <button
            type="button"
            onClick={() => {
              tickerWallets.forEach((t) => onToggleTickerActive(t.tickerSymbol, false));
            }}
            className="btn-token btn-secondary btn-compact font-sans"
          >
            Enable All
          </button>
          <button
            type="button"
            onClick={() => {
              tickerWallets.forEach((t) => onToggleTickerActive(t.tickerSymbol, true));
            }}
            className="btn-token btn-danger btn-compact font-sans"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-plt-muted" />
          <input
            type="text"
            placeholder="Search ticker symbol or company..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-token pl-8"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-48">
          <Filter size={14} className="text-plt-muted shrink-0" />
          <select
            value={selectedSector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="select-token"
          >
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 'ALL' ? 'All Sectors' : sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Editable Per-Ticker Budget Table */}
      <div className="overflow-x-auto custom-scrollbar max-h-120">
        <table className="w-full text-left text-xs border-separate border-spacing-y-1 font-sans">
          <thead className="sticky top-0 z-10 bg-plt-surface text-[11px] font-semibold text-plt-muted uppercase tracking-wider">
            <tr>
              <th className="py-2 px-3.5 first:rounded-l-lg">Active</th>
              <th className="py-2 px-3.5">Ticker</th>
              <th className="py-2 px-3.5">Historical Alpha</th>
              <th className="py-2 px-3.5">Win Rate</th>
              <th className="py-2 px-3.5">Dedicated Budget (£)</th>
              <th className="py-2 px-3.5">Max Loss Halt (%)</th>
              <th className="py-2 px-3.5 text-right last:rounded-r-lg">Save</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickerWallets.map((ticker) => {
              const currentBudget =
                editingBudgets[ticker.tickerSymbol]?.budget ?? ticker.allocatedBudgetEgp;
              const currentMaxLoss =
                editingBudgets[ticker.tickerSymbol]?.maxLoss ?? ticker.maxLossHaltPct;

              return (
                <tr
                  key={ticker.id}
                  className={`hover:bg-plt-hover/60 transition-colors group ${
                    ticker.isEnabled ? '' : 'opacity-50'
                  }`}
                >
                  <td className="py-2.5 px-3.5 first:rounded-l-xl">
                    <button
                      type="button"
                      onClick={() => onToggleTickerActive(ticker.tickerSymbol, ticker.isEnabled)}
                      className={`toggle-token ${ticker.isEnabled ? 'toggle-token-active' : ''}`}
                    >
                      <div
                        className={`toggle-thumb ${ticker.isEnabled ? 'toggle-thumb-active' : ''}`}
                      />
                    </button>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="row-title font-sans font-bold">{ticker.tickerSymbol}</div>
                    <div className="row-subtitle truncate max-w-36 font-sans">
                      {ticker.companyName}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 font-sans font-semibold text-plt-profit">
                    +{ticker.historicalAlpha.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3.5 font-sans">{ticker.historicalWinRate.toFixed(1)}%</td>
                  <td className="py-2.5 px-3.5 font-sans">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="500"
                        value={currentBudget}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onEditBudget(ticker.tickerSymbol, val, currentMaxLoss);
                        }}
                        className="h-7 w-24 rounded-lg bg-plt-card border border-plt-border-soft px-2 text-xs font-sans text-plt-text focus:border-plt-border-active focus:outline-none"
                      />
                      <span className="text-plt-muted text-mini">£</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 font-sans">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        value={currentMaxLoss}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onEditBudget(ticker.tickerSymbol, currentBudget, val);
                        }}
                        className="h-7 w-16 rounded-lg bg-plt-card border border-plt-border-soft px-2 text-xs font-sans text-plt-text focus:border-plt-border-active focus:outline-none"
                      />
                      <span className="text-plt-muted text-mini">%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-sans last:rounded-r-xl">
                    <button
                      type="button"
                      onClick={() =>
                        onSaveBudget(ticker.tickerSymbol, currentBudget, currentMaxLoss)
                      }
                      disabled={isSavingBudget === ticker.tickerSymbol}
                      className="btn-token btn-secondary btn-compact font-sans"
                    >
                      {isSavingBudget === ticker.tickerSymbol ? 'Saving...' : 'Apply'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
