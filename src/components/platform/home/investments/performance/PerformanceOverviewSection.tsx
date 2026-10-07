'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
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

  const refreshBankData = async () => {
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
      console.warn('Failed to refresh bank data:', err);
    }
  };

  const handleAccountCreated = async () => {
    await refreshBankData();
    setActiveTab('banks');
    router.refresh();
  };

  const { locale } = useTranslation();

  return (
    <section id="section-performance-overview" className="section-container section-viewport-fit space-y-3 sm:space-y-4">
      {/* Section Header with 3-Way Switcher Rail & Add Account Button */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="section-title">
            {locale === 'ar' ? 'نظرة عامة على الأداء' : 'Performance Overview'}
          </h2>
          <p className="section-subtitle">
            {activeTab === 'net-worth' &&
              (locale === 'ar'
                ? 'صافي القيمة الموحدة بسعر السوق، وتوزيع رأس المال، ومعدل تضخم البنك المركزي المصري'
                : 'Mark-to-market consolidated net worth, capital allocation, and CBE inflation drag')}
            {activeTab === 'investments' &&
              (locale === 'ar'
                ? 'عوائد المحفظة المحدثة بسعر السوق، ونسب النجاح، والنمو الشهري لرأس المال'
                : 'Mark-to-market portfolio returns, win rates, and monthly capital progression')}
            {activeTab === 'banks' &&
              (locale === 'ar'
                ? 'إجمالي السيولة النقدية، واحتياطيات النقد الأجنبي، وأرصدة الحسابات البنكية'
                : 'Aggregated liquidity, foreign currency reserves, and connected institution balances')}
          </p>
        </div>

        {/* Desktop View Switcher Rail & Add Account Action */}
        <div className="hidden sm:flex items-center gap-2 self-auto shrink-0">
          <div className="seg-control">
            <button
              type="button"
              onClick={() => setActiveTab('net-worth')}
              className={`seg-control-btn ${activeTab === 'net-worth' ? 'seg-control-btn-active' : ''}`}
            >
              {locale === 'ar' ? 'صافي القيمة' : 'Net Worth'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('investments')}
              className={`seg-control-btn ${activeTab === 'investments' ? 'seg-control-btn-active' : ''}`}
            >
              {locale === 'ar' ? 'الاستثمارات' : 'Investments'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('banks')}
              className={`seg-control-btn ${activeTab === 'banks' ? 'seg-control-btn-active' : ''}`}
            >
              {locale === 'ar' ? 'البنوك والحسابات' : 'Banks & Accounts'}
            </button>
          </div>

          {/* Add Account Button */}
          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="btn-primary-cta"
            title={locale === 'ar' ? 'إنشاء حساب بنكي أو وساطة جديد' : 'Create a new bank or brokerage account'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{locale === 'ar' ? 'إضافة حساب' : 'Add Account'}</span>
          </button>
        </div>
      </div>

      {/* Mobile View: Add Account button full width FIRST, then Switcher full width SECOND */}
      <div className="flex flex-col gap-2 w-full sm:hidden">
        <button
          type="button"
          onClick={() => setIsAddAccountOpen(true)}
          className="btn-primary-cta w-full justify-center py-2 text-xs font-semibold"
          title={locale === 'ar' ? 'إنشاء حساب بنكي أو وساطة جديد' : 'Create a new bank or brokerage account'}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{locale === 'ar' ? 'إضافة حساب' : 'Add Account'}</span>
        </button>

        <div className="seg-control w-full grid grid-cols-3 text-center">
          <button
            type="button"
            onClick={() => setActiveTab('net-worth')}
            className={`seg-control-btn w-full justify-center text-center ${activeTab === 'net-worth' ? 'seg-control-btn-active' : ''}`}
          >
            {locale === 'ar' ? 'صافي القيمة' : 'Net Worth'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('investments')}
            className={`seg-control-btn w-full justify-center text-center ${activeTab === 'investments' ? 'seg-control-btn-active' : ''}`}
          >
            {locale === 'ar' ? 'الاستثمارات' : 'Investments'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('banks')}
            className={`seg-control-btn w-full justify-center text-center ${activeTab === 'banks' ? 'seg-control-btn-active' : ''}`}
          >
            {locale === 'ar' ? 'الحسابات' : 'Banks & Accounts'}
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
        initialNetWorthHistory={initialNetWorthHistory}
        onAccountsUpdated={refreshBankData}
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
