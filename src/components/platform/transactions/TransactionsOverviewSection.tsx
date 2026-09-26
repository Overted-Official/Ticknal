'use client';

import React, { useState, useMemo } from 'react';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { isBrokerageAccount } from '@/lib/portfolio-finance';
import { type ClosedTradeItem, type TransactionsTimeframe } from './types';
import TransactionsKPIRail from './TransactionsKPIRail';
import TransactionsAnalyticsSection from './TransactionsAnalyticsSection';

export type TransactionsOverviewView = 'all' | 'banking' | 'investments';

interface TransactionsOverviewSectionProps {
  transactions: BankTransaction[];
  filteredTransactions: BankTransaction[];
  closedTrades: ClosedTradeItem[];
  accounts: BankAccount[];
  usdRate?: number;
  timeframe: TransactionsTimeframe;
  onTimeframeChange: (tf: TransactionsTimeframe) => void;
}

const TIMEFRAMES: TransactionsTimeframe[] = ['3M', '6M', '1Y', 'All'];

export default function TransactionsOverviewSection({
  transactions,
  filteredTransactions,
  closedTrades,
  accounts,
  usdRate = 50.20,
  timeframe,
  onTimeframeChange,
}: TransactionsOverviewSectionProps) {
  const [overviewView, setOverviewView] = useState<TransactionsOverviewView>('all');

  const brokerageAccountIds = useMemo(() => {
    return new Set(accounts.filter(isBrokerageAccount).map((a) => a.id));
  }, [accounts]);

  const isInvestmentTx = (t: BankTransaction) => {
    if (['Investments', 'Trading', 'Trading Injection'].includes(t.category || '')) return true;
    if (['BROKER_INJECTION', 'BROKER_WITHDRAWAL', 'BROKERAGE_BUY', 'BROKERAGE_SELL'].includes(t.type)) return true;
    if (t.accountId && brokerageAccountIds.has(t.accountId)) return true;
    return false;
  };

  const viewFilteredTransactions = useMemo(() => {
    if (overviewView === 'banking') {
      return filteredTransactions.filter((t) => !isInvestmentTx(t));
    }
    if (overviewView === 'investments') {
      return filteredTransactions.filter(isInvestmentTx);
    }
    return filteredTransactions;
  }, [filteredTransactions, overviewView, brokerageAccountIds]);

  const viewAllTransactions = useMemo(() => {
    if (overviewView === 'banking') {
      return transactions.filter((t) => !isInvestmentTx(t));
    }
    if (overviewView === 'investments') {
      return transactions.filter(isInvestmentTx);
    }
    return transactions;
  }, [transactions, overviewView, brokerageAccountIds]);

  const viewClosedTrades = useMemo(() => {
    if (overviewView === 'banking') {
      return [];
    }
    return closedTrades;
  }, [closedTrades, overviewView]);

  return (
    <section id="section-transactions-overview" className="section-container section-viewport-fit space-y-3 sm:space-y-4">
      {/* 1. Header with Section Title, View Switcher & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="section-title">Transactions Overview</h2>
          <p className="section-subtitle">
            {overviewView === 'all' &&
              'Consolidated cashflow velocity, income generation, and monthly turnover dynamics'}
            {overviewView === 'banking' &&
              'Liquid bank operating cashflow, living expenses, and net savings retention'}
            {overviewView === 'investments' &&
              'Capital injected, capital withdrawn, trading turnover, and realized investment returns'}
          </p>
        </div>

        {/* View Switcher & Timeframe Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {/* View Switcher: All Flows | Banking | Investments */}
          <div className="seg-control">
            <button
              type="button"
              onClick={() => setOverviewView('all')}
              className={`seg-control-btn ${overviewView === 'all' ? 'seg-control-btn-active' : ''}`}
            >
              All Flows
            </button>
            <button
              type="button"
              onClick={() => setOverviewView('banking')}
              className={`seg-control-btn ${overviewView === 'banking' ? 'seg-control-btn-active' : ''}`}
            >
              Banking
            </button>
            <button
              type="button"
              onClick={() => setOverviewView('investments')}
              className={`seg-control-btn ${overviewView === 'investments' ? 'seg-control-btn-active' : ''}`}
            >
              Investments
            </button>
          </div>

          {/* Timeframe Switcher */}
          <div className="seg-control">
            {TIMEFRAMES.map((tf) => {
              const isSelected = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onTimeframeChange(tf)}
                  className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Zone 2: Cashflow & Velocity KPI Rail */}
      <TransactionsKPIRail
        transactions={viewFilteredTransactions}
        closedTrades={viewClosedTrades}
        usdRate={usdRate}
        timeframe={timeframe}
        overviewView={overviewView}
      />

      {/* 3. Zone 3: Visual Analytics (Progression Chart + Breakdown Donut) */}
      <div id="section-cashflow-analytics" className="w-full">
        <TransactionsAnalyticsSection
          transactions={viewAllTransactions}
          filteredTransactions={viewFilteredTransactions}
          accounts={accounts}
          usdRate={usdRate}
          timeframe={timeframe}
        />
      </div>
    </section>
  );
}
