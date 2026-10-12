'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Plus,
  X,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { formatCleanAccountTitle } from '@/lib/format-bank-name';
import { type UnifiedLedgerItem, type ClosedTradeItem, type LedgerFilterType } from './types';
import TransactionRowItem from './TransactionRowItem';
import TransactionsDateRangeSelector, { type DateRangeFilter } from './TransactionsDateRangeSelector';
import LogTransactionDrawer from '@/components/platform/wallet/LogTransactionDrawer';
import { useTranslation } from '@/lib/i18n';

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
  const { locale, isRTL } = useTranslation();
  const { isPrivacy } = usePrivacyMode();

  // Timeframe presets & date calculations
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const threeMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const threeMonthsCutoff = `${threeMonthsAgoDate.getFullYear()}-${String(threeMonthsAgoDate.getMonth() + 1).padStart(2, '0')}-01`;
  const sixMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsCutoff = `${sixMonthsAgoDate.getFullYear()}-${String(sixMonthsAgoDate.getMonth() + 1).padStart(2, '0')}-01`;
  const ytdCutoff = `${now.getFullYear()}-01-01`;

  // Defaults to current month per requirements
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>({
    preset: 'THIS_MONTH',
    selectedMonth: currentYearMonth,
  });

  const [activeFilter, setActiveFilter] = useState<LedgerFilterType>('ALL');
  const [mobileTab, setMobileTab] = useState<'BOTH' | 'INFLOWS' | 'OUTFLOWS'>('BOTH');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('ALL');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatMoney = (value: number, currency: string = 'EGP', showSign: boolean = false): string => {
    const unit = currency === 'USD' ? '$' : locale === 'ar' ? 'ج.م' : '£';
    if (isPrivacy) return `•••••• ${unit}`;
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
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
      if (!acc) return fallback || (locale === 'ar' ? 'الحساب' : 'Account');
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
      const fromAccountName = resolveAccountCleanTitle(fromAcc, t.accountName || (locale === 'ar' ? 'حساب بنكي' : 'Bank Account'));

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
        title: t.notes || (t.type === 'TRANSFER' ? (locale === 'ar' ? 'تحويل بين الحسابات' : 'Account Transfer') : t.category || (locale === 'ar' ? 'معاملة' : 'Transaction')),
        category: t.category || (locale === 'ar' ? 'عام' : 'General'),
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
        title: `${tr.side === 'BUY' ? (locale === 'ar' ? 'بيع' : 'Sold') : (locale === 'ar' ? 'تغطية' : 'Covered')} ${tr.tickerSymbol.replace('.CA', '')}`,
        category: locale === 'ar' ? 'تداول الأسهم' : 'Trading',
        accountName: tr.accountName || (locale === 'ar' ? 'وساطة مالية' : 'Brokerage'),
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
    { id: 'ALL', label: locale === 'ar' ? 'كافة الحسابات' : 'All Accounts' },
    ...accounts.map((a) => {
      const meta = formatCleanAccountTitle(a);
      return {
        id: String(a.id),
        label: `${meta.bankShort} (${meta.subName})`,
      };
    }),
  ], [accounts, locale]);

  const activeAccountLabel = useMemo(() => {
    if (selectedAccountId === 'ALL') return locale === 'ar' ? 'كافة الحسابات' : 'All Accounts';
    const match = accountOptions.find((a) => a.id === selectedAccountId);
    return match ? match.label : (locale === 'ar' ? 'كافة الحسابات' : 'All Accounts');
  }, [selectedAccountId, accountOptions, locale]);

  const formatMonthName = (ym: string) => {
    if (!ym || ym.length < 7) return ym;
    const [year, month] = ym.split('-');
    const monthNamesEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthNamesAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    const idx = Number(month) - 1;
    const names = locale === 'ar' ? monthNamesAr : monthNamesEn;
    return `${names[idx] || month} ${year}`;
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

  // Filter items by time, type, search query, and account
  const filteredItems = useMemo(() => {
    let result = unifiedItems;

    // 1. Filter by Timeframe Preset / Selected Month / Custom Range
    if (dateFilter.preset === 'THIS_MONTH') {
      result = result.filter((i) => i.date.startsWith(currentYearMonth));
    } else if (dateFilter.preset === 'LAST_MONTH') {
      result = result.filter((i) => i.date.startsWith(lastYearMonth));
    } else if (dateFilter.preset === '3M') {
      result = result.filter((i) => i.date >= threeMonthsCutoff);
    } else if (dateFilter.preset === '6M') {
      result = result.filter((i) => i.date >= sixMonthsCutoff);
    } else if (dateFilter.preset === 'YTD') {
      result = result.filter((i) => i.date >= ytdCutoff);
    } else if (dateFilter.preset === 'CUSTOM') {
      result = result.filter((i) => i.date.startsWith(dateFilter.selectedMonth));
    } else if (dateFilter.preset === 'RANGE' && dateFilter.startDate && dateFilter.endDate) {
      result = result.filter((i) => i.date >= dateFilter.startDate! && i.date <= dateFilter.endDate!);
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
    dateFilter,
    currentYearMonth,
    lastYearMonth,
    threeMonthsCutoff,
    sixMonthsCutoff,
    ytdCutoff,
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

  // Monetary sums for ledger columns and active filters
  const totalInflowsSum = useMemo(() => {
    return inflowsList.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  }, [inflowsList]);

  const totalOutflowsSum = useMemo(() => {
    return outflowsList.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  }, [outflowsList]);

  const netCashflow = useMemo(() => {
    return totalInflowsSum - totalOutflowsSum;
  }, [totalInflowsSum, totalOutflowsSum]);

  const filteredTotalSum = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  }, [filteredItems]);

  const activePeriodDescription = useMemo(() => {
    if (dateFilter.preset === 'ALL') return locale === 'ar' ? 'كافة الفترات' : 'all time';
    if (dateFilter.preset === '3M') return locale === 'ar' ? 'آخر 3 أشهر' : 'the trailing 3 months';
    if (dateFilter.preset === '6M') return locale === 'ar' ? 'آخر 6 أشهر' : 'the trailing 6 months';
    if (dateFilter.preset === 'YTD') return locale === 'ar' ? 'منذ بداية السنة' : 'year to date';
    if (dateFilter.preset === 'RANGE' && dateFilter.startDate && dateFilter.endDate) {
      return `${dateFilter.startDate} → ${dateFilter.endDate}`;
    }
    return formatMonthName(dateFilter.selectedMonth || currentYearMonth);
  }, [dateFilter, currentYearMonth, locale]);

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

  const handleRowClick = (item: UnifiedLedgerItem) => {
    if (item.rawTransaction) {
      setEditingTransaction(item.rawTransaction);
      setIsLogDrawerOpen(true);
    }
  };

  return (
    <section id="section-activity-ledger" className="section-container section-viewport-fit space-y-3 sm:space-y-4 scroll-mt-20">
      {/* 1. Header with Title & Live Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="section-title">
              {locale === 'ar' ? 'سجل الحركات' : 'Activity Ledger'}
            </h2>
            <span className="badge-count">
              {locale === 'ar' ? `${filteredItems.length.toLocaleString('ar-EG')} حركة` : `${filteredItems.length.toLocaleString('en-US')} entries`}
            </span>
          </div>
          <p className="section-subtitle">
            {locale === 'ar'
              ? 'سجل زمني للتدفقات النقدية البنكية، النفقات، وتنفيذ صفقات التداول الاستثمارية'
              : 'Chronological record of banking cashflows, expenses, and investment trade executions'}
          </p>
        </div>

        {/* Right side: Desktop/Tablet Net value + Add Button */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <div className="text-xs text-text-muted flex items-center gap-2">
            <span>{locale === 'ar' ? 'صافي الفترة:' : 'Net Cashflow:'}</span>
            <span
              className={`font-semibold tabular-nums ${
                netCashflow > 0
                  ? 'text-profit-num'
                  : netCashflow < 0
                  ? 'text-loss-num'
                  : 'text-text-primary'
              }`}
            >
              {formatMoney(netCashflow, 'EGP', true)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingTransaction(null);
              setIsLogDrawerOpen(true);
            }}
            className="btn-primary-cta cursor-pointer"
            title={locale === 'ar' ? 'تسجيل معاملة بنكية جديدة، نفقة، أو تحويل' : 'Log a new bank transaction, expense, or transfer'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{locale === 'ar' ? 'إضافة معاملة' : 'Add Transaction'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Header: Net Cashflow row & Add Transaction button full width */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="text-xs text-text-muted flex items-center justify-between">
          <span>{locale === 'ar' ? 'صافي الفترة:' : 'Net Cashflow:'}</span>
          <span
            className={`font-semibold tabular-nums ${
              netCashflow > 0
                ? 'text-profit-num'
                : netCashflow < 0
                ? 'text-loss-num'
                : 'text-text-primary'
            }`}
          >
            {formatMoney(netCashflow, 'EGP', true)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTransaction(null);
            setIsLogDrawerOpen(true);
          }}
          className="btn-primary-cta w-full justify-center py-2 text-xs font-semibold cursor-pointer"
          title={locale === 'ar' ? 'تسجيل معاملة بنكية جديدة، نفقة، أو تحويل' : 'Log a new bank transaction, expense, or transfer'}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{locale === 'ar' ? 'إضافة معاملة' : 'Add Transaction'}</span>
        </button>
      </div>

      {/* 2. Toolbar: Search, Account Selector, Month Stepper & Quick Timeframe Presets */}
      <div className="flex flex-col gap-2.5 pb-2 border-b border-border-subtle/60">
        {/* Row 1: Search, Account Selector & Time Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Left: Search input + Account selector */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Search Bar - Canonical .input-control-compact (Zero icon-text collision) */}
            <div className="input-control-compact flex-1 min-w-[160px] sm:min-w-[240px] focus-within:border-brand-blue/60 transition-colors">
              <Search className="w-3.5 h-3.5 text-text-muted shrink-0 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'ar' ? 'البحث في الملاحظات، الأسهم، الحسابات...' : 'Search notes, tickers, accounts...'}
                className="w-full bg-transparent border-0 outline-none text-xs text-text-primary placeholder:text-text-muted p-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors shrink-0 cursor-pointer"
                  title={locale === 'ar' ? 'مسح البحث' : 'Clear search'}
                  aria-label={locale === 'ar' ? 'مسح البحث' : 'Clear search'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Account Dropdown - Unified h-9 */}
            <div className="relative shrink-0" ref={accountDropdownRef}>
              <button
                type="button"
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                className={`h-9 px-3 rounded-xl border border-border-subtle bg-surface-raised hover:bg-surface-raised/80 hover:border-border-default text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors select-none ${
                  selectedAccountId !== 'ALL' ? 'text-brand-blue border-brand-blue/40' : ''
                }`}
              >
                <span className="truncate max-w-[120px] sm:max-w-[150px]">{activeAccountLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
              </button>

              {isAccountDropdownOpen && (
                <div className="absolute left-0 rtl:left-auto rtl:right-0 mt-1.5 w-48 sm:w-56 py-1 rounded-xl bg-black/95 backdrop-blur-md border border-border-subtle shadow-2xl z-50 overflow-hidden text-left rtl:text-right">
                  {accountOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccountId(opt.id);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left rtl:text-right text-xs flex items-center justify-between hover:bg-white/[0.04] transition-colors ${
                        selectedAccountId === opt.id ? 'text-brand-blue font-semibold bg-white/[0.02]' : 'text-text-primary'
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

          {/* Right: Enhanced TradingView Date Selector & Quick Presets */}
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
            <TransactionsDateRangeSelector
              currentFilter={dateFilter}
              onChange={setDateFilter}
              monthEntriesCount={monthEntriesCount}
              totalEntriesCount={unifiedItems.length}
            />

            {/* Quick Access Presets (Synchronized with Date Selector) */}
            <div className="seg-control shrink-0">
              <button
                type="button"
                onClick={() => setDateFilter({ preset: 'THIS_MONTH', selectedMonth: currentYearMonth })}
                className={`seg-control-btn ${dateFilter.preset === 'THIS_MONTH' ? 'seg-control-btn-active' : ''}`}
              >
                {locale === 'ar' ? 'هذا الشهر' : 'This Month'}
              </button>
              <button
                type="button"
                onClick={() => setDateFilter({ preset: 'LAST_MONTH', selectedMonth: lastYearMonth })}
                className={`seg-control-btn ${dateFilter.preset === 'LAST_MONTH' ? 'seg-control-btn-active' : ''}`}
              >
                {locale === 'ar' ? 'الشهر الماضي' : 'Last Month'}
              </button>
              <button
                type="button"
                onClick={() => setDateFilter({ preset: '3M', selectedMonth: currentYearMonth })}
                className={`seg-control-btn ${dateFilter.preset === '3M' ? 'seg-control-btn-active' : ''}`}
              >
                3M
              </button>
              <button
                type="button"
                onClick={() => setDateFilter({ preset: 'ALL', selectedMonth: currentYearMonth })}
                className={`seg-control-btn ${dateFilter.preset === 'ALL' ? 'seg-control-btn-active' : ''}`}
              >
                {locale === 'ar' ? 'الكل' : 'All'}
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
                { id: 'ALL', label: locale === 'ar' ? 'الكل' : 'All' },
                { id: 'INFLOWS', label: locale === 'ar' ? 'الوارد' : 'Inflows' },
                { id: 'EXPENSES', label: locale === 'ar' ? 'المصروفات' : 'Expenses' },
                { id: 'TRANSFERS', label: locale === 'ar' ? 'التحويلات' : 'Transfers' },
                { id: 'TRADES', label: locale === 'ar' ? 'التداول' : 'Trades' },
                { id: 'YIELD', label: locale === 'ar' ? 'العوائد' : 'Yield' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`seg-control-btn whitespace-nowrap ${
                  activeFilter === tab.id ? 'seg-control-btn-active' : ''
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Period / Entry Counter */}
          <div className="text-xs text-text-muted self-start sm:self-auto shrink-0 select-none">
            {locale === 'ar' ? 'عرض ' : 'Showing '}
            <span className="text-text-primary font-semibold tabular-nums">{filteredItems.length}</span>{' '}
            {locale === 'ar' ? 'من أصل ' : 'of '}
            <span className="tabular-nums">{unifiedItems.length}</span>{' '}
            {locale === 'ar' ? 'حركة' : 'entries'}
            {dateFilter.preset !== 'ALL' && (
              <span className="text-brand-blue font-medium ml-1 tabular-nums">
                ({activePeriodDescription})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Content (Matching MyPositionsSection layout) */}
      <div className="flex-1 min-h-0 w-full">
        {filteredItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-text-muted text-xs">
            <span>
              {locale === 'ar'
                ? `لم يتم العثور على أي نشاط يطابق معايير البحث في ${activePeriodDescription}.`
                : `No activity found matching your criteria in ${activePeriodDescription}.`}
            </span>
          </div>
        ) : activeFilter === 'ALL' ? (
          /* When ALL is selected: 2-Column split (Inflows vs Outflows) */
          <div className="space-y-4">
            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden items-center justify-between gap-2 pb-1">
              <div className="seg-control w-full justify-stretch">
                <button
                  type="button"
                  onClick={() => setMobileTab('BOTH')}
                  className={`seg-control-btn flex-1 ${mobileTab === 'BOTH' ? 'seg-control-btn-active' : ''}`}
                >
                  {locale === 'ar' ? 'الكل' : 'Both'} ({filteredItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('INFLOWS')}
                  className={`seg-control-btn flex-1 ${mobileTab === 'INFLOWS' ? 'seg-control-btn-active' : ''}`}
                >
                  {locale === 'ar' ? 'الوارد' : 'Inflows'} ({inflowsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('OUTFLOWS')}
                  className={`seg-control-btn flex-1 ${mobileTab === 'OUTFLOWS' ? 'seg-control-btn-active' : ''}`}
                >
                  {locale === 'ar' ? 'المصروفات' : 'Outflows'} ({outflowsList.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* COLUMN 1: INFLOWS & REALIZED RETURNS */}
              <div className={`flex flex-col ${mobileTab === 'OUTFLOWS' ? 'hidden md:flex' : ''}`}>
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
                  <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-text-primary">
                    <ArrowDownLeft className="w-4 h-4 text-profit-num" />
                    <span>{locale === 'ar' ? 'التدفقات الداخلة والأرباح المحققة' : 'Inflows & Realized Returns'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums text-profit-num">
                      {formatMoney(totalInflowsSum, 'EGP', true)}
                    </span>
                    <span className="text-text-faint text-xs select-none">·</span>
                    <span className="text-[11px] text-text-muted font-medium tabular-nums">
                      {inflowsList.length} {locale === 'ar' ? 'حركة' : 'entries'}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-border-subtle/70">
                  {inflowsList.length === 0 ? (
                    <div className="py-8 text-center text-text-muted text-xs">
                      {locale === 'ar'
                        ? `لم يتم تسجيل أي تدفقات داخلة في ${activePeriodDescription}.`
                        : `No inflows recorded in ${activePeriodDescription}.`}
                    </div>
                  ) : (
                    inflowsList.map((item) => (
                      <TransactionRowItem
                        key={item.id}
                        item={item}
                        formatMoney={formatMoney}
                        onClick={handleRowClick}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* COLUMN 2: EXPENSES & OUTFLOWS */}
              <div className={`flex flex-col ${mobileTab === 'INFLOWS' ? 'hidden md:flex' : ''}`}>
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
                  <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-text-primary">
                    <ArrowUpRight className="w-4 h-4 text-loss-num" />
                    <span>{locale === 'ar' ? 'المصروفات والتدفقات الخارجة' : 'Expenses & Outflows'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums text-loss-num">
                      -{formatMoney(totalOutflowsSum, 'EGP', false)}
                    </span>
                    <span className="text-text-faint text-xs select-none">·</span>
                    <span className="text-[11px] text-text-muted font-medium tabular-nums">
                      {outflowsList.length} {locale === 'ar' ? 'حركة' : 'entries'}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-border-subtle/70">
                  {outflowsList.length === 0 ? (
                    <div className="py-8 text-center text-text-muted text-xs">
                      {locale === 'ar'
                        ? `لم يتم تسجيل أي تدفقات خارجة في ${activePeriodDescription}.`
                        : `No outflows recorded in ${activePeriodDescription}.`}
                    </div>
                  ) : (
                    outflowsList.map((item) => (
                      <TransactionRowItem
                        key={item.id}
                        item={item}
                        formatMoney={formatMoney}
                        onClick={handleRowClick}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* When a specific filter is chosen: Single focused stream */
          <div className="flex flex-col max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-text-primary">
                <span>
                  {activeFilter === 'INFLOWS' && (locale === 'ar' ? 'الوارد' : 'Inflows')}
                  {activeFilter === 'EXPENSES' && (locale === 'ar' ? 'المصروفات' : 'Expenses')}
                  {activeFilter === 'TRANSFERS' && (locale === 'ar' ? 'التحويلات' : 'Transfers')}
                  {activeFilter === 'TRADES' && (locale === 'ar' ? 'التداول' : 'Trades')}
                  {activeFilter === 'YIELD' && (locale === 'ar' ? 'العوائد' : 'Yield')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-text-primary">
                  {formatMoney(filteredTotalSum, 'EGP', false)}
                </span>
                <span className="text-text-faint text-xs select-none">·</span>
                <span className="text-[11px] text-text-muted font-medium tabular-nums">
                  {filteredItems.length} {locale === 'ar' ? 'حركة' : 'entries'}
                </span>
              </div>
            </div>

            <div className="divide-y divide-border-subtle/70">
              {filteredItems.map((item) => (
                <TransactionRowItem
                  key={item.id}
                  item={item}
                  formatMoney={formatMoney}
                  onClick={handleRowClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>

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
        onDeleteTransaction={handleDeleteTransaction}
        onTransactionLogged={() => {
          if (onTransactionsChanged) onTransactionsChanged();
        }}
      />
    </section>
  );
}
