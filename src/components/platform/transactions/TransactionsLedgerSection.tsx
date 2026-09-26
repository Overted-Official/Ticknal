'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Plus,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { formatCleanAccountTitle } from '@/lib/format-bank-name';
import { type UnifiedLedgerItem, type ClosedTradeItem, type LedgerFilterType } from './types';
import TransactionRowItem from './TransactionRowItem';
import TransactionDetailDrawer from './TransactionDetailDrawer';
import LogTransactionDrawer from '@/components/platform/wallet/LogTransactionDrawer';

interface TransactionsLedgerSectionProps {
  transactions: BankTransaction[];
  accounts: BankAccount[];
  closedTrades?: ClosedTradeItem[];
  categories?: string[];
  onTransactionsChanged?: () => void;
}

const DEFAULT_CATEGORIES = [
  'Living & Bills',
  'Housing & Rent',
  'Food & Dining',
  'Trading & Investments',
  'Salary & Income',
  'Savings',
  'Interest & Yield',
  'Other',
];

export default function TransactionsLedgerSection({
  transactions = [],
  accounts = [],
  closedTrades = [],
  categories = DEFAULT_CATEGORIES,
  onTransactionsChanged,
}: TransactionsLedgerSectionProps) {
  const { isPrivacy } = usePrivacyMode();

  // Timeframe presets & date calculations
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const threeMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const threeMonthsCutoff = `${threeMonthsAgoDate.getFullYear()}-${String(threeMonthsAgoDate.getMonth() + 1).padStart(2, '0')}-01`;

  // Defaults to current month per requirements
  const [timePreset, setTimePreset] = useState<'THIS_MONTH' | 'LAST_MONTH' | '3M' | 'ALL' | 'CUSTOM'>('THIS_MONTH');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  const [activeFilter, setActiveFilter] = useState<LedgerFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('ALL');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [selectedItemForDrawer, setSelectedItemForDrawer] = useState<UnifiedLedgerItem | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatMoney = (value: number, currency: string = 'EGP', showSign: boolean = false): string => {
    if (isPrivacy) return `•••••• ${currency === 'USD' ? '$' : '£'}`;
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    const unit = currency === 'USD' ? '$' : '£';
    return `${sign}${formatted} ${unit}`;
  };

  // Convert raw bank transactions & closed trades into UnifiedLedgerItem stream
  const unifiedItems: UnifiedLedgerItem[] = useMemo(() => {
    const items: UnifiedLedgerItem[] = [];

    const accountMap = new Map<number, BankAccount>();
    for (const a of accounts) {
      accountMap.set(a.id, a);
    }

    const resolveAccountCleanTitle = (acc?: BankAccount | null, fallback?: string): string => {
      if (!acc) return fallback || 'Account';
      const meta = formatCleanAccountTitle(acc);
      if (meta.bankShort && meta.subName && meta.bankShort.toLowerCase() !== meta.subName.toLowerCase()) {
        return `${meta.bankShort} (${meta.subName})`;
      }
      return meta.bankShort || acc.accountName;
    };

    // 1. Bank transactions
    for (const t of transactions) {
      const amt = Math.abs(Number(t.amount) || 0);
      const isPositive = ['INCOME', 'DEPOSIT', 'INTEREST', 'BROKERAGE_SELL'].includes(t.type);

      const fromAcc = accountMap.get(t.accountId);
      const fromAccountName = resolveAccountCleanTitle(fromAcc, t.accountName || 'Bank Account');

      let toAccountName: string | null = null;
      if (t.type === 'TRANSFER') {
        if (t.toAccountId) {
          const toAcc = accountMap.get(t.toAccountId);
          toAccountName = resolveAccountCleanTitle(toAcc, (t as any).toAccountName || null);
        } else if ((t as any).toAccountName) {
          toAccountName = (t as any).toAccountName;
        } else if (t.notes) {
          const lowerNotes = t.notes.toLowerCase();
          for (const a of accounts) {
            const aName = (a.accountName || '').toLowerCase();
            const bName = (a.bankName || a.customBankName || '').toLowerCase();
            if ((aName && lowerNotes.includes(aName)) || (bName && lowerNotes.includes(bName))) {
              toAccountName = resolveAccountCleanTitle(a, a.accountName);
              break;
            }
          }
        }
      }

      items.push({
        id: `tx-${t.id}`,
        originalId: t.id,
        kind: 'transaction',
        type: t.type,
        title: t.notes || (t.type === 'TRANSFER' ? 'Account Transfer' : t.category || 'Transaction'),
        category: t.category || 'General',
        accountName: fromAccountName,
        toAccountName: toAccountName,
        bankLogoUrl: t.bankLogoUrl,
        amount: amt,
        currency: t.currency || 'EGP',
        date: String(t.transactionDate || '').slice(0, 10),
        isPositive,
        notes: t.notes,
        rawTransaction: t,
      });
    }

    // 2. Closed Trades
    for (const tr of closedTrades) {
      const isPositive = tr.profitLoss >= 0;
      items.push({
        id: `trade-${tr.id}`,
        originalId: tr.id,
        kind: 'trade',
        type: 'TRADE_CLOSED',
        title: `${tr.side === 'BUY' ? 'Sold' : 'Covered'} ${tr.tickerSymbol.replace('.CA', '')}`,
        category: 'Trading',
        accountName: tr.accountName || 'Brokerage',
        tickerSymbol: tr.tickerSymbol,
        tickerLogoUrl: tr.logoUrl,
        amount: Math.abs(tr.profitLoss),
        currency: 'EGP',
        date: String(tr.exitDate || tr.entryDate || '').slice(0, 10),
        isPositive,
        notes: tr.notes,
        tradeDetails: {
          side: tr.side,
          entryPrice: tr.entryPrice,
          exitPrice: tr.exitPrice,
          quantity: tr.quantity,
          realizedPnl: tr.profitLoss,
          realizedPnlPct: tr.profitLossPct,
          strategyId: tr.strategyId,
        },
      });
    }

    // Sort by date descending
    return items.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }, [transactions, closedTrades]);

  // Account selector options
  const accountOptions = useMemo(() => [
    { id: 'ALL', label: 'All Accounts' },
    ...accounts.map((a) => {
      const meta = formatCleanAccountTitle(a);
      return {
        id: String(a.id),
        label: `${meta.bankShort} (${meta.subName})`,
      };
    }),
  ], [accounts]);

  const activeAccountLabel = useMemo(() => {
    if (selectedAccountId === 'ALL') return 'All Accounts';
    const match = accountOptions.find((a) => a.id === selectedAccountId);
    return match ? match.label : 'All Accounts';
  }, [selectedAccountId, accountOptions]);

  const formatMonthName = (ym: string) => {
    if (!ym || ym.length < 7) return ym;
    const [year, month] = ym.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const idx = Number(month) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYearMonth);
    set.add(lastYearMonth);
    for (const item of unifiedItems) {
      if (item.date && item.date.length >= 7) {
        set.add(item.date.slice(0, 7));
      }
    }
    return Array.from(set).sort().reverse();
  }, [unifiedItems, currentYearMonth, lastYearMonth]);

  const monthEntriesCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of unifiedItems) {
      if (item.date && item.date.length >= 7) {
        const ym = item.date.slice(0, 7);
        map[ym] = (map[ym] || 0) + 1;
      }
    }
    return map;
  }, [unifiedItems]);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const prevYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    handleSelectMonth(prevYm);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const nextYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    handleSelectMonth(nextYm);
  };

  const handleSelectMonth = (ym: string) => {
    setSelectedMonth(ym);
    if (ym === currentYearMonth) {
      setTimePreset('THIS_MONTH');
    } else if (ym === lastYearMonth) {
      setTimePreset('LAST_MONTH');
    } else {
      setTimePreset('CUSTOM');
    }
    setIsMonthDropdownOpen(false);
  };

  const handleSelectPreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | '3M' | 'ALL' | 'CUSTOM') => {
    setTimePreset(preset);
    if (preset === 'THIS_MONTH') {
      setSelectedMonth(currentYearMonth);
    } else if (preset === 'LAST_MONTH') {
      setSelectedMonth(lastYearMonth);
    }
    setIsMonthDropdownOpen(false);
  };

  // Filter items by time, type, search query, and account
  const filteredItems = useMemo(() => {
    let result = unifiedItems;

    // 1. Filter by Timeframe Preset / Selected Month
    if (timePreset === 'THIS_MONTH') {
      result = result.filter((i) => i.date.startsWith(currentYearMonth));
    } else if (timePreset === 'LAST_MONTH') {
      result = result.filter((i) => i.date.startsWith(lastYearMonth));
    } else if (timePreset === '3M') {
      result = result.filter((i) => i.date >= threeMonthsCutoff);
    } else if (timePreset === 'CUSTOM') {
      result = result.filter((i) => i.date.startsWith(selectedMonth));
    }

    // 2. Filter by Account
    if (selectedAccountId !== 'ALL') {
      const targetAccId = Number(selectedAccountId);
      result = result.filter((item) => {
        if (item.kind === 'transaction' && item.rawTransaction) {
          return item.rawTransaction.accountId === targetAccId || item.rawTransaction.toAccountId === targetAccId;
        }
        return true;
      });
    }

    // 3. Filter by Type Pill
    if (activeFilter === 'INFLOWS') {
      result = result.filter((i) => i.isPositive && i.type !== 'TRANSFER');
    } else if (activeFilter === 'EXPENSES') {
      result = result.filter((i) => !i.isPositive && i.type !== 'TRANSFER');
    } else if (activeFilter === 'TRANSFERS') {
      result = result.filter((i) => i.type === 'TRANSFER');
    } else if (activeFilter === 'TRADES') {
      result = result.filter((i) => i.kind === 'trade' || i.type === 'BROKERAGE_BUY' || i.type === 'BROKERAGE_SELL');
    } else if (activeFilter === 'YIELD') {
      result = result.filter((i) => i.type === 'INTEREST' || i.category.toLowerCase().includes('yield'));
    }

    // 4. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.accountName.toLowerCase().includes(q) ||
          (i.notes && i.notes.toLowerCase().includes(q)) ||
          (i.tickerSymbol && i.tickerSymbol.toLowerCase().includes(q))
      );
    }

    return result;
  }, [
    unifiedItems,
    timePreset,
    selectedMonth,
    currentYearMonth,
    lastYearMonth,
    threeMonthsCutoff,
    selectedAccountId,
    activeFilter,
    searchQuery,
  ]);

  // Split into Column 1 (Inflows / Realized Gains) & Column 2 (Outflows / Expenses)
  const inflowsList = useMemo(() => {
    return filteredItems.filter((i) => i.isPositive);
  }, [filteredItems]);

  const outflowsList = useMemo(() => {
    return filteredItems.filter((i) => !i.isPositive);
  }, [filteredItems]);

  const activePeriodDescription = useMemo(() => {
    if (timePreset === 'ALL') return 'all time';
    if (timePreset === '3M') return 'the trailing 3 months';
    return formatMonthName(selectedMonth);
  }, [timePreset, selectedMonth]);

  const handleDeleteTransaction = async (id: number) => {
    try {
      const res = await fetch(`/api/banks/transactions?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok && onTransactionsChanged) {
        onTransactionsChanged();
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  const handleEditTransaction = (tx: BankTransaction) => {
    setEditingTransaction(tx);
    setIsLogDrawerOpen(true);
  };

  return (
    <section id="section-activity-ledger" className="section-container section-viewport-fit space-y-3 sm:space-y-4">
      {/* 1. Header with Title & Live Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="section-title">Activity Ledger</h2>
          <p className="section-subtitle">
            Chronological record of banking cashflows, expenses, and investment trade executions
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 self-start sm:self-auto shrink-0">
          <div className="text-xs text-text-muted">
            Total Activity:{' '}
            <span className="text-text-primary font-semibold tabular-nums">
              {filteredItems.length.toLocaleString()} entries
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingTransaction(null);
              setIsLogDrawerOpen(true);
            }}
            className="btn-primary-cta"
            title="Log a new bank transaction, expense, or transfer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* 2. Toolbar: Search, Account Selector, Month Stepper & Quick Timeframe Presets */}
      <div className="flex flex-col gap-2.5 pb-2 border-b border-border-subtle/60">
        {/* Row 1: Search, Account Selector & Time Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Left: Search input + Account selector */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[160px] sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, tickers, accounts..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/10 bg-surface-raised/60 hover:bg-surface-raised focus:bg-surface-base text-text-primary text-xs placeholder:text-text-muted outline-none focus:border-brand-blue transition-colors"
              />
            </div>

            {/* Account Dropdown */}
            <div className="relative shrink-0" ref={accountDropdownRef}>
              <button
                type="button"
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                className="h-8 px-2.5 rounded-xl border border-white/10 bg-surface-raised/60 hover:bg-surface-raised text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors select-none"
              >
                <span className="truncate max-w-[120px] sm:max-w-[150px]">{activeAccountLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              </button>

              {isAccountDropdownOpen && (
                <div className="absolute left-0 mt-1 w-48 sm:w-56 py-1 rounded-xl bg-surface-raised border border-border-subtle shadow-xl z-50 overflow-hidden">
                  {accountOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccountId(opt.id);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-surface-active transition-colors ${
                        selectedAccountId === opt.id ? 'text-brand-blue font-semibold' : 'text-text-primary'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {selectedAccountId === opt.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Month Stepper & Quick Timeframe Presets */}
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
            {/* Month Stepper & Selector */}
            <div className="relative shrink-0" ref={monthDropdownRef}>
              <div className="inline-flex items-center rounded-xl border border-white/10 bg-surface-raised/60 p-0.5 text-xs h-8">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-surface-active text-text-muted hover:text-text-primary transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className="px-2 h-7 font-medium text-text-primary hover:bg-surface-active rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-brand-blue" />
                  <span className="tabular-nums">
                    {timePreset === 'ALL'
                      ? 'All Months'
                      : timePreset === '3M'
                      ? 'Trailing 3M'
                      : formatMonthName(selectedMonth)}
                  </span>
                  <ChevronDown className="w-3 h-3 text-text-muted" />
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-surface-active text-text-muted hover:text-text-primary transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Month Dropdown Menu */}
              {isMonthDropdownOpen && (
                <div className="absolute right-0 mt-1 w-52 py-1 rounded-xl bg-surface-raised border border-border-subtle shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-text-muted border-b border-border-subtle/50">
                    Select Month
                  </div>
                  {availableMonths.map((ym) => {
                    const isSelected = (timePreset === 'THIS_MONTH' || timePreset === 'LAST_MONTH' || timePreset === 'CUSTOM') && selectedMonth === ym;
                    const count = monthEntriesCount[ym] || 0;
                    return (
                      <button
                        key={ym}
                        type="button"
                        onClick={() => handleSelectMonth(ym)}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-surface-active transition-colors ${
                          isSelected ? 'text-brand-blue font-semibold' : 'text-text-primary'
                        }`}
                      >
                        <span className="truncate">{formatMonthName(ym)}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-text-muted tabular-nums">
                            {count} {count === 1 ? 'entry' : 'entries'}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Access Presets (defaults to This Month) */}
            <div className="seg-control shrink-0">
              <button
                type="button"
                onClick={() => handleSelectPreset('THIS_MONTH')}
                className={`seg-control-btn text-[11px] px-2.5 py-0.5 ${timePreset === 'THIS_MONTH' ? 'seg-control-btn-active' : ''}`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('LAST_MONTH')}
                className={`seg-control-btn text-[11px] px-2.5 py-0.5 ${timePreset === 'LAST_MONTH' ? 'seg-control-btn-active' : ''}`}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('3M')}
                className={`seg-control-btn text-[11px] px-2.5 py-0.5 ${timePreset === '3M' ? 'seg-control-btn-active' : ''}`}
              >
                3M
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('ALL')}
                className={`seg-control-btn text-[11px] px-2.5 py-0.5 ${timePreset === 'ALL' ? 'seg-control-btn-active' : ''}`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Type Filter Pills & Live Entry Counter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-0.5">
          {/* Seg Control Type Pills */}
          <div className="seg-control self-start sm:self-auto overflow-x-auto no-scrollbar max-w-full">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'INFLOWS', label: 'Inflows' },
                { id: 'EXPENSES', label: 'Expenses' },
                { id: 'TRANSFERS', label: 'Transfers' },
                { id: 'TRADES', label: 'Trades' },
                { id: 'YIELD', label: 'Yield' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`seg-control-btn whitespace-nowrap text-[11px] px-2.5 py-0.5 ${
                  activeFilter === tab.id ? 'seg-control-btn-active' : ''
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Period / Entry Counter */}
          <div className="text-xs text-text-muted self-start sm:self-auto shrink-0 select-none">
            Showing <span className="text-text-primary font-semibold tabular-nums">{filteredItems.length}</span> of <span className="tabular-nums">{unifiedItems.length}</span> entries
            {timePreset !== 'ALL' && (
              <span className="text-brand-blue font-medium ml-1">
                ({timePreset === '3M' ? 'Trailing 3M' : formatMonthName(selectedMonth)})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Content (Matching MyPositionsSection layout) */}
      <div className="flex-1 min-h-0 w-full">
        {filteredItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-text-muted text-xs">
            <span>No activity found matching your criteria in {activePeriodDescription}.</span>
          </div>
        ) : activeFilter === 'ALL' ? (
          /* When ALL is selected: 2-Column split (Inflows vs Outflows) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* COLUMN 1: INFLOWS & REALIZED RETURNS */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
                <div className="flex items-center gap-1.5 text-base font-bold text-text-primary">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  <span>Inflows &amp; Realized Returns</span>
                </div>
                <span className="text-[11px] text-text-muted font-medium tabular-nums">
                  {inflowsList.length} entries
                </span>
              </div>

              <div className="divide-y divide-border-subtle/70">
                {inflowsList.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-xs">
                    No inflows recorded in {activePeriodDescription}.
                  </div>
                ) : (
                  inflowsList.map((item) => (
                    <TransactionRowItem
                      key={item.id}
                      item={item}
                      formatMoney={formatMoney}
                      onClick={setSelectedItemForDrawer}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: EXPENSES & OUTFLOWS */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
                <div className="flex items-center gap-1.5 text-base font-bold text-text-primary">
                  <ArrowUpRight className="w-4 h-4 text-rose-400" />
                  <span>Expenses &amp; Outflows</span>
                </div>
                <span className="text-[11px] text-text-muted font-medium tabular-nums">
                  {outflowsList.length} entries
                </span>
              </div>

              <div className="divide-y divide-border-subtle/70">
                {outflowsList.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-xs">
                    No outflows recorded in {activePeriodDescription}.
                  </div>
                ) : (
                  outflowsList.map((item) => (
                    <TransactionRowItem
                      key={item.id}
                      item={item}
                      formatMoney={formatMoney}
                      onClick={setSelectedItemForDrawer}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* When a specific filter is chosen: Single focused stream */
          <div className="flex flex-col max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
              <div className="flex items-center gap-1.5 text-base font-bold text-text-primary">
                <span>{activeFilter.charAt(0) + activeFilter.slice(1).toLowerCase()}</span>
              </div>
              <span className="text-[11px] text-text-muted font-medium">
                {filteredItems.length} entries
              </span>
            </div>

            <div className="divide-y divide-border-subtle/70">
              {filteredItems.map((item) => (
                <TransactionRowItem
                  key={item.id}
                  item={item}
                  formatMoney={formatMoney}
                  onClick={setSelectedItemForDrawer}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer (Matches TickerPositionsDrawer) */}
      <TransactionDetailDrawer
        isOpen={Boolean(selectedItemForDrawer)}
        onClose={() => setSelectedItemForDrawer(null)}
        item={selectedItemForDrawer}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
        formatMoney={formatMoney}
      />

      {/* Log / Edit Transaction Drawer */}
      <LogTransactionDrawer
        isOpen={isLogDrawerOpen}
        onClose={() => {
          setIsLogDrawerOpen(false);
          setEditingTransaction(null);
        }}
        accounts={accounts}
        categories={categories}
        transactionToEdit={editingTransaction}
        onTransactionLogged={() => {
          if (onTransactionsChanged) onTransactionsChanged();
        }}
      />
    </section>
  );
}
