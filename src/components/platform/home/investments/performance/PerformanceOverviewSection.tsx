'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from '@/components/ui/icon-library';
import AddAccountDrawer from '@/components/platform/wallet/AddAccountDrawer';
import PerformanceKPIRails, { type PerformanceViewTab } from './kpi-rails/PerformanceKPIRails';
import PerformanceChart from './PerformanceChart';
import SectorBreakdownChart from './SectorBreakdownChart';
import NetWorthProgressionChart from './charts/NetWorthProgressionChart';
import NetWorthBreakdownChart from './charts/NetWorthBreakdownChart';
import CashFlowProgressionChart from './charts/CashFlowProgressionChart';
import TransactionsBreakdownChart from './charts/TransactionsBreakdownChart';
import { type OrderStats } from '../homeInvestmentsTypes';
import { type BankAccount, type BankTransaction, type BankItem } from '@/types/bank';
import { type NetWorthHistoryPoint } from '@/lib/portfolio-finance';

interface PerformanceOverviewSectionProps {
  orderStats: OrderStats;
  initialAccounts?: BankAccount[];
  initialTransactions?: BankTransaction[];
  usdRate?: number;
  cbeInflationRate?: number;
  initialNetWorthHistory?: NetWorthHistoryPoint[];
  initialInflationSeries?: Array<{ yearMonth: string; cbeHeadlineInflation: string; usCpiInflation?: string }>;
}

export default function PerformanceOverviewSection({
  orderStats,
  initialAccounts = [],
  initialTransactions = [],
  usdRate = 50.20,
  cbeInflationRate = 14.9,
  initialNetWorthHistory = [],
  initialInflationSeries = [],
}: PerformanceOverviewSectionProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PerformanceViewTab>('investments');
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  const [transactions, setTransactions] = useState<BankTransaction[]>(initialTransactions);
  const [availableBanks, setAvailableBanks] = useState<BankItem[]>([]);

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/banks/list')
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.banks && Array.isArray(d.banks)) {
          setAvailableBanks(d.banks);
        }
      })
      .catch((err) => console.warn('Failed to load available banks:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAccountCreated = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        fetch('/api/banks/accounts'),
        fetch('/api/banks/transactions'),
      ]);
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData?.accounts) setAccounts(accData.accounts);
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData?.transactions) setTransactions(txData.transactions);
      }
    } catch (err) {
      console.warn('Failed to refresh accounts after creation:', err);
    }
    setActiveTab('banks');
    router.refresh();
  };

  return (
    <section id="section-performance-overview" className="section-container section-viewport-fit space-y-3 sm:space-y-4">
      {/* Section Header with 3-Way Switcher Rail & Add Account Button */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="section-title">Performance Overview</h2>
          <p className="section-subtitle">
            {activeTab === 'net-worth' &&
              'Mark-to-market consolidated net worth, capital allocation, and CBE inflation drag'}
            {activeTab === 'investments' &&
              'Mark-to-market portfolio returns, win rates, and monthly capital progression'}
            {activeTab === 'banks' &&
              'Aggregated liquidity, foreign currency reserves, and connected institution balances'}
          </p>
        </div>

        {/* View Switcher Rail & Add Account Action */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <div className="seg-control">
            <button
              type="button"
              onClick={() => setActiveTab('net-worth')}
              className={`seg-control-btn ${activeTab === 'net-worth' ? 'seg-control-btn-active' : ''}`}
            >
              Net Worth
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('investments')}
              className={`seg-control-btn ${activeTab === 'investments' ? 'seg-control-btn-active' : ''}`}
            >
              Investments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('banks')}
              className={`seg-control-btn ${activeTab === 'banks' ? 'seg-control-btn-active' : ''}`}
            >
              Banks &amp; Accounts
            </button>
          </div>

          {/* Add Account Button */}
          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="btn-primary-cta"
            title="Create a new bank or brokerage account"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Dynamic per activeTab (Net Worth, Investments, Banks & Accounts) */}
      <PerformanceKPIRails
        activeTab={activeTab}
        orderStats={orderStats}
        accounts={accounts}
        transactions={transactions}
        usdRate={usdRate}
        cbeInflationRate={cbeInflationRate}
      />

      {/* Monthly Performance Progression Chart & Sector Breakdown - Hidden on phone, side-by-side on desktop */}
      <div id="section-monthly-progression" className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 w-full mt-2">
        {activeTab === 'investments' && (
          <>
            <div className="lg:col-span-7 flex flex-col min-h-0">
              <PerformanceChart data={orderStats.monthlyData} />
            </div>
            <div className="lg:col-span-5 flex flex-col min-h-0">
              <SectorBreakdownChart
                openOrders={orderStats.openOrders}
                sectorData={orderStats.sectorData}
                totalValue={orderStats.openMarketValue}
              />
            </div>
          </>
        )}

        {activeTab === 'net-worth' && (
          <>
            <div className="lg:col-span-7 flex flex-col min-h-0">
              <NetWorthProgressionChart
                netWorthHistory={initialNetWorthHistory}
                inflationSeries={initialInflationSeries}
                cbeAnnualInflation={cbeInflationRate}
                accounts={accounts}
                openOrders={orderStats.openOrders}
                usdRate={usdRate}
              />
            </div>
            <div className="lg:col-span-5 flex flex-col min-h-0">
              <NetWorthBreakdownChart
                accounts={accounts}
                openOrders={orderStats.openOrders}
                usdRate={usdRate}
              />
            </div>
          </>
        )}

        {activeTab === 'banks' && (
          <>
            <div className="lg:col-span-7 flex flex-col min-h-0">
              <CashFlowProgressionChart
                transactions={transactions}
                accounts={accounts}
                usdRate={usdRate}
              />
            </div>
            <div className="lg:col-span-5 flex flex-col min-h-0">
              <TransactionsBreakdownChart
                transactions={transactions}
                usdRate={usdRate}
              />
            </div>
          </>
        )}
      </div>

      {/* Add Account Modal Drawer */}
      <AddAccountDrawer
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        availableBanks={availableBanks}
        onAccountCreated={handleAccountCreated}
      />
    </section>
  );
}
