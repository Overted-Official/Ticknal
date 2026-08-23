'use client';

import React from 'react';
import BotStrategySelectorCard from './settings/BotStrategySelectorCard';
import BotTickerBudgetOverridesCard from './settings/BotTickerBudgetOverridesCard';
import BotRiskControlsCard from './settings/BotRiskControlsCard';
import { type TickerWalletItem } from './analytics/BotUniverseMatrixCard';

interface BotSettingsViewProps {
  currentStrategyId: string;
  onSelectStrategy: (id: string) => void;
  maxConcurrentPositions: number;
  eodRule: string;
  dailyLossHaltPct: string;
  brokerMode: string;
  onUpdateSetting: (field: string, value: any) => void;
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

export default function BotSettingsView({
  currentStrategyId,
  onSelectStrategy,
  maxConcurrentPositions,
  eodRule,
  dailyLossHaltPct,
  brokerMode,
  onUpdateSetting,
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
}: BotSettingsViewProps) {
  return (
    <div className="page-sections-stack select-none">
      {/* SECTION 1: Quantitative Strategy Model */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Quantitative Strategy Model</h2>
          <p className="section-subtitle">Select the mathematical model powering intraday signal generation</p>
        </div>

        <BotStrategySelectorCard
          currentStrategyId={currentStrategyId}
          onSelectStrategy={onSelectStrategy}
        />
      </section>

      {/* SECTION 2: Ticker Universe & Dedicated Budgets */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Ticker Universe & Dedicated Budgets</h2>
          <p className="section-subtitle">Dedicated capital allocation, sector filters, and individual drawdown stop halts</p>
        </div>

        <BotTickerBudgetOverridesCard
          tickerWallets={tickerWallets}
          filteredTickerWallets={filteredTickerWallets}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedSector={selectedSector}
          onSectorChange={onSectorChange}
          sectors={sectors}
          editingBudgets={editingBudgets}
          onEditBudget={onEditBudget}
          onSaveBudget={onSaveBudget}
          isSavingBudget={isSavingBudget}
          onToggleTickerActive={onToggleTickerActive}
          onSetBulkBudgets={onSetBulkBudgets}
        />
      </section>

      {/* SECTION 3: Execution Safeguards & Broker Routing */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Execution Safeguards & Broker Routing</h2>
          <p className="section-subtitle">Global circuit breakers, maximum simultaneous positions, and paper vs live execution</p>
        </div>

        <BotRiskControlsCard
          maxConcurrentPositions={maxConcurrentPositions}
          eodRule={eodRule}
          dailyLossHaltPct={dailyLossHaltPct}
          brokerMode={brokerMode}
          onUpdateSetting={onUpdateSetting}
        />
      </section>
    </div>
  );
}
