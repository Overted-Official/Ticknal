'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRightLeft,
  TrendingUp,
  Search,
  Check,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  Clock,
  Sparkles,
  Scale,
  AlertCircle,
} from '@/components/ui/icon-library';
import { toast } from '@/components/ui/sonner';
import InlineSpinner from '@/components/ui/InlineSpinner';
import { type BankAccount } from '@/types/bank';
import AccountSelectDropdown from './wallet/AccountSelectDropdown';
import { isVirtualAccount } from '@/lib/banks/virtual-account-constants';
import { useTranslation } from '@/lib/i18n';
import { getThndrTradeUrl } from '@/lib/thndr';

interface AddedPositionSummary {
  symbol: string;
  price: number;
  quantity: number;
  totalValue: number;
  date: string;
  accountName: string;
  isVirtual: boolean;
  thndrUrl: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORIES = [
  'Living & Bills',
  'Housing & Rent',
  'Food & Dining',
  'Salary & Income',
  'Interest & Yield',
  'Trading Injection',
  'Trading Withdrawal',
  'Savings & CD',
  'Investments',
  'Subscriptions',
  'Healthcare',
  'Transport',
  'Entertainment',
  'Other',
];

const CATEGORIES_MAP_AR: Record<string, string> = {
  'Living & Bills': 'المعيشة والفواتير',
  'Housing & Rent': 'السكن والإيجار',
  'Food & Dining': 'الطعام والمطاعم',
  'Salary & Income': 'الراتب والدخل',
  'Interest & Yield': 'الفوائد والعوائد',
  'Trading Injection': 'إيداع للتداول',
  'Trading Withdrawal': 'سحب من التداول',
  'Savings & CD': 'المدخرات والشهادات',
  'Investments': 'الاستثمارات',
  'Subscriptions': 'الاشتراكات والخدمات',
  'Healthcare': 'الرعاية الصحية',
  'Transport': 'المواصلات والانتقالات',
  'Entertainment': 'الترفيه',
  'Other': 'أخرى',
};

const modeDescriptions: Record<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION', string> = {
  EXPENSE: 'Outflow from selected bank account for living, bills, or operational costs.',
  INCOME: 'Inflow adding liquid cash to your selected bank or treasury balance.',
  TRANSFER: 'Move capital between two accounts without altering overall net worth.',
  BROKER_INJECTION: 'Inject funds directly into your brokerage account to back stock purchases.',
};

const modeDescriptionsAr: Record<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION', string> = {
  EXPENSE: 'خصم من الحساب البنكي المختار لمصاريف المعيشة والفواتير والتكاليف التشغيلية.',
  INCOME: 'إيداع سيولة نقدية في رصيد الحساب البنكي أو الخزينة المحددة.',
  TRANSFER: 'تحويل رأس المال بين حسابين دون التأثير على إجمالي صافي الثروة.',
  BROKER_INJECTION: 'تحويل أموال مباشرة إلى حساب الوساطة لتمويل شراء الأسهم.',
};

type Ticker = {
  symbol: string;
  companyName: string;
  sector?: string;
  logoUrl?: string | null;
  currency?: string;
  price?: number;
  change?: number;
  changePct?: number;
};

interface QuickAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'transaction' | 'position';
  initialTicker?: {
    symbol: string;
    companyName?: string;
    logoUrl?: string | null;
    sector?: string;
    price?: number;
    quantity?: number;
    date?: string;
    strategyId?: string;
  } | null;
}

function accountLabel(account: BankAccount, locale: string): string {
  if (isVirtualAccount(account)) {
    return locale === 'ar' ? '✨ حساب افتراضي (تداول تجريبي)' : '✨ Virtual Account (Paper Trading)';
  }
  return account.accountName || account.customBankName || account.bankName || (locale === 'ar' ? `حساب ${account.id}` : `Account ${account.id}`);
}

function getBrokerInitials(account: BankAccount): string {
  if (isVirtualAccount(account)) return 'VA';
  const name = account.accountName || account.customBankName || account.bankName || '';
  const clean = name.trim().toUpperCase();
  if (clean.includes('THNDR')) return 'TH';
  if (clean.includes('CIB')) return 'CIB';
  if (clean.includes('HERMES')) return 'EFG';
  if (clean.includes('MUBASHER')) return 'MUB';
  return clean.slice(0, 2) || 'BR';
}

export default function QuickAddDrawer({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'transaction',
  initialTicker,
}: QuickAddDrawerProps) {
  const router = useRouter();
  const { t, locale, isRTL } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Active Tab Switch: 'transaction' | 'position'
  const [activeSwitch, setActiveSwitch] = useState<'transaction' | 'position'>(initialMode);

  // --- 1. Transaction Form State ---
  const [txMode, setTxMode] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION'>('EXPENSE');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [category, setCategory] = useState('Living & Bills');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // --- 2. Position Form State ---
  const [positionSymbol, setPositionSymbol] = useState('');
  const [positionCompanyName, setPositionCompanyName] = useState('');
  const [positionLogoUrl, setPositionLogoUrl] = useState<string | null>(null);
  const [positionSector, setPositionSector] = useState('');
  const [positionCurrency, setPositionCurrency] = useState('EGP');
  const [positionDate, setPositionDate] = useState(new Date().toISOString().split('T')[0]);
  const [positionPrice, setPositionPrice] = useState('');
  const [positionQty, setPositionQty] = useState('100');
  const [positionAccountId, setPositionAccountId] = useState<string>('');
  const [isSubmittingPos, setIsSubmittingPos] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTickersList, setFilteredTickersList] = useState<Ticker[]>([]);
  const [imgError, setImgError] = useState(false);
  const tickerSearchRef = useRef<HTMLDivElement>(null);
  const [isBrokerDropdownOpen, setIsBrokerDropdownOpen] = useState(false);
  const brokerDropdownRef = useRef<HTMLDivElement>(null);

  // Winning Algorithm Historical Metrics State
  const [winningMetrics, setWinningMetrics] = useState<{
    winningAlgo: string;
    avgReturnPerTrade: number;
    maxAdverseExcursion: number;
    avgBarsPerTrade: number;
    isLoading: boolean;
  }>({
    winningAlgo: '',
    avgReturnPerTrade: 0,
    maxAdverseExcursion: 0,
    avgBarsPerTrade: 0,
    isLoading: false,
  });
  const [canViewProprietary, setCanViewProprietary] = useState(false);

  // Success Modal State (with Thndr Order Redirect)
  const [addedPosition, setAddedPosition] = useState<AddedPositionSummary | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // SWR: Bank Accounts
  const { data: accountsData, mutate: mutateAccounts } = useSWR<{ accounts: BankAccount[] }>(
    isOpen ? '/api/banks/accounts' : null,
    fetcher
  );
  const accounts: BankAccount[] = accountsData?.accounts ?? [];

  // Filter for brokerage accounts
  const brokerageAccounts = useMemo(() => {
    return accounts.filter(
      (a: BankAccount) => !a.isArchived && ['BROKERAGE', 'BROKER_CASH'].includes(a.accountType)
    );
  }, [accounts]);

  // SWR: Tickers
  const { data: tickersData } = useSWR<Ticker[]>(isOpen ? '/api/tickers' : null, fetcher);
  const tickers = Array.isArray(tickersData) ? tickersData : [];

  // Setup mounted and responsive listener
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync initial state when drawer opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setActiveSwitch(initialMode);
      setImgError(false);

      if (initialTicker?.symbol) {
        const sym = initialTicker.symbol.replace('.CA', '').toUpperCase();
        setPositionSymbol(sym);
        setPositionCompanyName(initialTicker.companyName || sym);
        setPositionLogoUrl(initialTicker.logoUrl || null);
        setPositionSector(initialTicker.sector || '');
        if (initialTicker.price) setPositionPrice(String(initialTicker.price));
        if (initialTicker.quantity) setPositionQty(String(initialTicker.quantity));
        if (initialTicker.date) setPositionDate(initialTicker.date);
        setIsSearchOpen(false);
      } else {
        setIsSearchOpen(!positionSymbol);
      }
      setSearchQuery('');
    } else {
      setShowSuccessModal(false);
      setAddedPosition(null);
      setPositionSymbol('');
      setPositionCompanyName('');
      setPositionLogoUrl(null);
      setPositionSector('');
      setPositionPrice('');
      setPositionQty('100');
      setIsSearchOpen(true);
      setIsBrokerDropdownOpen(false);
      setSearchQuery('');
    }
  }, [isOpen, initialMode, initialTicker]);

  // Sync filtered tickers when tickers arrive
  useEffect(() => {
    if (tickers && tickers.length > 0 && !searchQuery) {
      setFilteredTickersList(tickers.slice(0, 50));
    }
  }, [tickers, searchQuery]);

  // Set default account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const def = accounts.find((a: BankAccount) => a.isDefaultExpense) || accounts[0];
      if (def) {
        setAccountId(String(def.id));
        setCurrency(def.currency || 'EGP');
      }
    }
  }, [accounts, accountId]);

  // Set default brokerage account for stock positions
  useEffect(() => {
    if (brokerageAccounts.length > 0 && !positionAccountId) {
      const def = brokerageAccounts.find((a: BankAccount) => a.isDefaultExpense) || brokerageAccounts[0];
      if (def) {
        setPositionAccountId(String(def.id));
      }
    }
  }, [brokerageAccounts, positionAccountId]);

  // Sync currency when account changes
  const handleAccountChange = (accIdStr: string) => {
    setAccountId(accIdStr);
    const selected = accounts.find((a) => String(a.id) === accIdStr);
    if (selected) {
      setCurrency(selected.currency || 'EGP');
    }
  };

  const cleanSymbol = (positionSymbol || '').replace('.CA', '').toUpperCase();

  // Selected Ticker Details from loaded tickers
  const selectedTickerDetails = useMemo(() => {
    if (!cleanSymbol) return null;
    return (
      (tickers || []).find((t) => {
        const symClean = t.symbol.replace('.CA', '').toUpperCase();
        return symClean === cleanSymbol;
      }) || null
    );
  }, [tickers, cleanSymbol]);

  // Sync ticker details if found asynchronously
  useEffect(() => {
    if (selectedTickerDetails) {
      if (!positionCompanyName && selectedTickerDetails.companyName) {
        setPositionCompanyName(selectedTickerDetails.companyName);
      }
      if (!positionLogoUrl && selectedTickerDetails.logoUrl) {
        setPositionLogoUrl(selectedTickerDetails.logoUrl);
      }
      if (!positionSector && selectedTickerDetails.sector) {
        setPositionSector(selectedTickerDetails.sector);
      }
      if (!positionPrice && selectedTickerDetails.price) {
        setPositionPrice(String(selectedTickerDetails.price));
      }
    }
  }, [selectedTickerDetails, positionCompanyName, positionLogoUrl, positionSector, positionPrice]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tickerSearchRef.current && !tickerSearchRef.current.contains(event.target as Node)) {
        if (cleanSymbol) {
          setIsSearchOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [cleanSymbol]);

  // Close broker dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (brokerDropdownRef.current && !brokerDropdownRef.current.contains(event.target as Node)) {
        setIsBrokerDropdownOpen(false);
      }
    }
    if (isBrokerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isBrokerDropdownOpen]);

  // Close broker dropdown on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isBrokerDropdownOpen) {
        setIsBrokerDropdownOpen(false);
      }
    }
    if (isBrokerDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isBrokerDropdownOpen]);

  // Evaluate candidate models to extract winning algorithm historical risk/reward metrics
  useEffect(() => {
    if (!cleanSymbol || !isOpen || activeSwitch !== 'position') return;

    let isCancelled = false;
    setCanViewProprietary(false);
    setWinningMetrics((prev) => ({ ...prev, winningAlgo: '', isLoading: true }));

    const loadChampion = async () => {
      try {
        const accessResponse = await fetch('/api/strategies/proprietary/access', { cache: 'no-store' });
        const access = accessResponse.ok ? (await accessResponse.json() as { canView?: boolean }) : null;
        if (isCancelled) return;
        if (!access?.canView) {
          setWinningMetrics({ winningAlgo: '', avgReturnPerTrade: 0, maxAdverseExcursion: 0, avgBarsPerTrade: 0, isLoading: false });
          return;
        }
        setCanViewProprietary(true);
      } catch {
        if (!isCancelled) setWinningMetrics((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const candidateStrategies: { id: 'typhon' | 'cerberus' | 'hydra'; name: string }[] = [
        { id: 'typhon', name: 'Typhon' },
        { id: 'cerberus', name: 'Cerberus' },
        { id: 'hydra', name: 'Hydra' },
      ];

      await Promise.all(
        candidateStrategies.map((strat) =>
          fetch(`/api/signals?symbol=${encodeURIComponent(cleanSymbol)}&strategy=${strat.id}`)
            .then((r) => {
              if (!r.ok) throw new Error('Strategy data unavailable');
              return r.json();
            })
            .then((data) => {
              const sysRoi = Number(data?.metrics?.sysRoi) || 0;
              const bhRoi = Number(data?.metrics?.buyHoldRoi) || 0;
              const roiMargin = Number(data?.metrics?.roiMargin) || (sysRoi - bhRoi);
              const avgReturn = Number(data?.metrics?.avgReturnPerTrade) || 0;
              const mae = Number(data?.metrics?.maxAdverseExcursion) || 0;
              const avgBars = Number(data?.metrics?.avgBarsPerTrade) || 0;

              return {
                id: strat.id,
                name: strat.name,
                alpha: roiMargin,
                roi: sysRoi,
                avgReturn,
                mae,
                avgBars,
              };
            })
            .catch(() => null)
        )
      ).then((results) => {
        if (isCancelled) return;
        const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
        if (valid.length > 0) {
          valid.sort((a, b) => b.alpha - a.alpha);
          const champion = valid[0];

          setWinningMetrics({
            winningAlgo: champion.name,
            avgReturnPerTrade: champion.avgReturn,
            maxAdverseExcursion: champion.mae,
            avgBarsPerTrade: champion.avgBars,
            isLoading: false,
          });
        } else {
          setWinningMetrics((prev) => ({ ...prev, isLoading: false }));
        }
      });
    };
    void loadChampion();

    return () => {
      isCancelled = true;
    };
  }, [cleanSymbol, isOpen, activeSwitch]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const query = val.toLowerCase().trim();
    if (!query) {
      setFilteredTickersList(tickers.slice(0, 50));
    } else {
      const filtered = tickers
        .filter(
          (t) =>
            t.symbol.toLowerCase().includes(query) ||
            t.companyName?.toLowerCase().includes(query)
        )
        .slice(0, 50);
      setFilteredTickersList(filtered);
    }
  };

  const handleSelectTicker = (ticker: Ticker) => {
    const clean = ticker.symbol.replace('.CA', '').toUpperCase();
    const priceNum = ticker.price || 0;

    setImgError(false);
    setPositionSymbol(clean);
    setPositionCompanyName(ticker.companyName || clean);
    setPositionLogoUrl(ticker.logoUrl || null);
    setPositionSector(ticker.sector || '');
    setPositionCurrency(ticker.currency || 'EGP');
    if (priceNum > 0) {
      setPositionPrice(String(priceNum));
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  // --- Submit Handlers ---

  // 1. Submit Bank Transaction
  async function handleTransactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) {
      toast.warning('Select Account', 'Please select a bank account.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.warning('Invalid Amount', 'Please enter a positive transaction amount.');
      return;
    }
    if (txMode === 'TRANSFER' && (!toAccountId || toAccountId === accountId)) {
      toast.warning('Invalid Destination', 'Please select a different destination account for transfers.');
      return;
    }

    setIsSubmittingTx(true);
    try {
      const res = await fetch('/api/banks/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: Number(accountId),
          toAccountId: txMode === 'TRANSFER' && toAccountId ? Number(toAccountId) : null,
          type: txMode,
          amount: Number(amount),
          currency,
          category:
            txMode === 'TRANSFER'
              ? 'Internal Transfer'
              : txMode === 'BROKER_INJECTION'
              ? 'Trading Injection'
              : category,
          transactionDate,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success(
          'Transaction Logged',
          `${txMode === 'INCOME' ? '+' : txMode === 'EXPENSE' ? '-' : ''}${Number(amount).toLocaleString()} ${currency} recorded.`
        );
        mutateAccounts();
        if (onSuccess) onSuccess();
        router.refresh();
        onClose();
        // Reset form
        setAmount('');
        setNotes('');
      } else {
        const data = await res.json();
        toast.error('Logging Failed', data.error || 'Failed to log transaction.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Connection Error', 'Failed to reach server.');
    } finally {
      setIsSubmittingTx(false);
    }
  }

  // 2. Submit Investment Position
  async function handlePositionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cleanSymbol || !positionPrice) {
      toast.warning('Missing Fields', 'Please enter a ticker symbol and entry price.');
      return;
    }
    if (!positionQty || Number(positionQty) <= 0) {
      toast.warning('Invalid Quantity', 'Please enter a valid share quantity.');
      return;
    }
    if (!positionAccountId) {
      toast.error('Brokerage account required', 'Select an EGP brokerage account before executing the buy.');
      return;
    }

    const selectedAccount = brokerageAccounts.find((a: BankAccount) => String(a.id) === positionAccountId);
    const isVirtual = selectedAccount ? isVirtualAccount(selectedAccount) : false;
    const requiredAmount = Number(positionPrice) * Number(positionQty);
    if (selectedAccount && !isVirtual && Number(selectedAccount.balance) < requiredAmount) {
      toast.error(
        'Insufficient Cash',
        `Account has ${Number(selectedAccount.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${selectedAccount.currency || 'EGP'} available, but ${requiredAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} is required.`
      );
      return;
    }

    setIsSubmittingPos(true);
    try {
      const res = await fetch('/api/portfolio/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BUY',
          accountId: Number(positionAccountId),
          symbol: cleanSymbol,
          date: positionDate,
          price: Number(positionPrice),
          quantity: Number(positionQty),
          entrySource: 'COMMAND_CENTER',
        }),
      });

      if (res.ok) {
        toast.success(
          isVirtual ? 'Virtual Position Opened' : 'Live Position Opened',
          isVirtual
            ? `${cleanSymbol} tracked in Virtual Account with live P&L and automated sell exit notifications.`
            : `${cleanSymbol} position was opened and brokerage cash debited.`
        );
        mutateAccounts();
        if (onSuccess) onSuccess();
        router.refresh();

        const priceNum = Number(positionPrice);
        const qtyNum = Number(positionQty);
        const { url: thndrUrl } = getThndrTradeUrl(cleanSymbol, locale as 'ar' | 'en');

        setAddedPosition({
          symbol: cleanSymbol,
          price: priceNum,
          quantity: qtyNum,
          totalValue: priceNum * qtyNum,
          date: positionDate,
          accountName: selectedAccount
            ? accountLabel(selectedAccount, locale)
            : (locale === 'ar' ? 'حساب الوساطة' : 'Brokerage Account'),
          isVirtual,
          thndrUrl,
        });
        setShowSuccessModal(true);

        // Reset form
        setPositionSymbol('');
        setPositionCompanyName('');
        setPositionLogoUrl(null);
        setPositionSector('');
        setPositionPrice('');
        setPositionQty('100');
        setIsSearchOpen(true);
      } else {
        const payload = await res.json().catch(() => ({}));
        toast.error('Position Failed', payload.error || 'Failed to execute order.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error', 'An unexpected error occurred while placing the order.');
    } finally {
      setIsSubmittingPos(false);
    }
  }

  const entryPriceNum = parseFloat(positionPrice) || 0;
  const quantityNum = parseFloat(positionQty) || 0;
  const positionTotalVal = entryPriceNum * quantityNum;

  // Actual projected metrics from winning algo historical statistics
  const estProfitCash = positionTotalVal * (winningMetrics.avgReturnPerTrade / 100);
  const maxRiskCash = positionTotalVal * (Math.abs(winningMetrics.maxAdverseExcursion) / 100);

  const absRiskPct = Math.abs(winningMetrics.maxAdverseExcursion);
  const rewardPct = winningMetrics.avgReturnPerTrade;
  const rrRatio = absRiskPct > 0 ? rewardPct / absRiskPct : 0;

  const selectedBrokerageAccount = useMemo(() => {
    return brokerageAccounts.find((a: BankAccount) => String(a.id) === String(positionAccountId));
  }, [brokerageAccounts, positionAccountId]);

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="quick-add-drawer-overlay" className="drawer-overlay">
            {/* Backdrop */}
            <motion.div
              key="quick-add-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="drawer-backdrop"
              aria-label="Close quick action drawer overlay"
            />

            {/* Drawer Sheet (Desktop: Right-to-Left | Mobile: Bottom-to-Top) */}
            <motion.div
              key="quick-add-drawer-sheet"
              initial={isMobile ? { y: '100%' } : { x: isRTL ? '-100%' : '100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className={`drawer-sheet ${!isMobile ? 'drawer-sheet-viewport-safe' : ''} rtl:border-l-0 rtl:border-r`}
            >
              {/* Header */}
              <div className="drawer-header">
                {/* Mobile Drag Pill */}
                <div
                  className="drawer-drag-pill-container"
                  onClick={onClose}
                  aria-label="Drag handle to close"
                >
                  <div className="drawer-drag-pill" />
                </div>

                {/* Main Header Row */}
                <div className="drawer-header-row">
                  <div className="drawer-header-brand">
                    <div className="drawer-header-icon-box">
                      {activeSwitch === 'transaction' ? (
                        <ArrowRightLeft className="drawer-header-icon" />
                      ) : (
                        <TrendingUp className="drawer-header-icon" />
                      )}
                    </div>
                    <div className="drawer-header-titles">
                      <h2 className="drawer-title">
                        {activeSwitch === 'transaction'
                          ? (locale === 'ar' ? 'معاملة دفتر الأستاذ السريعة' : 'Quick Ledger Transaction')
                          : (locale === 'ar' ? 'إضافة صفقة' : 'Add Position')}
                      </h2>
                      <p className="drawer-subtitle">
                        {activeSwitch === 'transaction'
                          ? (locale === 'ar' ? 'تسجيل المصروفات، الإيداعات، التحويلات والتدفقات النقدية' : 'Record banking expenses, inflows, transfers & cashflows')
                          : (locale === 'ar'
                            ? selectedBrokerageAccount && isVirtualAccount(selectedBrokerageAccount)
                              ? 'صفقة تداول افتراضي مع تنبيهات خروج آلية'
                              : 'تنفيذ صفقة حية عبر رصيد حساب الوساطة'
                            : selectedBrokerageAccount && isVirtualAccount(selectedBrokerageAccount)
                            ? 'Tracked paper trading position with automated exit alerts'
                            : 'Execute a live position via funded brokerage cash')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="drawer-close-btn"
                    aria-label="Close drawer"
                    title="Close drawer"
                  >
                    <X className="drawer-close-icon" />
                  </button>
                </div>
              </div>

              {/* 2-Way Tab Switcher (Canonical segmented control matching Markets page design tokens) */}
              <div className="px-4 sm:px-6 py-2 border-b border-plt-border shrink-0 bg-plt-base">
                <div className="seg-control w-full grid grid-cols-2 p-0.5">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSwitch === 'transaction'}
                    onClick={() => setActiveSwitch('transaction')}
                    className={`seg-control-btn h-full w-full flex items-center justify-center gap-1.5 ${
                      activeSwitch === 'transaction' ? 'seg-control-btn-active active' : ''
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{locale === 'ar' ? 'إضافة معاملة' : 'Add Transaction'}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSwitch === 'position'}
                    onClick={() => setActiveSwitch('position')}
                    className={`seg-control-btn h-full w-full flex items-center justify-center gap-1.5 ${
                      activeSwitch === 'position' ? 'seg-control-btn-active active' : ''
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{locale === 'ar' ? 'إضافة صفقة' : 'Add Position'}</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: BANK TRANSACTION */}
              {activeSwitch === 'transaction' && (
                <form onSubmit={handleTransactionSubmit} className="drawer-form">
                  <div className="drawer-body custom-scrollbar drawer-form-fields">
                    {/* Mode Hint Info Card */}
                    <div className="drawer-info-card">
                      <div className="drawer-info-dot" />
                      <p className="drawer-info-text">{locale === 'ar' ? modeDescriptionsAr[txMode] : modeDescriptions[txMode]}</p>
                    </div>

                    {/* Transaction Type Segmented Control */}
                    <div className="drawer-form-field">
                      <label className="field-label">{locale === 'ar' ? 'نوع المعاملة' : 'Transaction Type'}</label>
                      <div className="seg-control w-full grid grid-cols-4 p-0.5">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={txMode === 'EXPENSE'}
                          onClick={() => setTxMode('EXPENSE')}
                          className={`seg-control-btn h-full w-full text-[11px] px-1 ${
                            txMode === 'EXPENSE' ? 'seg-control-btn-active active' : ''
                          }`}
                        >
                          {locale === 'ar' ? 'مصروف' : 'Expense'}
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={txMode === 'INCOME'}
                          onClick={() => setTxMode('INCOME')}
                          className={`seg-control-btn h-full w-full text-[11px] px-1 ${
                            txMode === 'INCOME' ? 'seg-control-btn-active active' : ''
                          }`}
                        >
                          {locale === 'ar' ? 'دخل' : 'Income'}
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={txMode === 'TRANSFER'}
                          onClick={() => setTxMode('TRANSFER')}
                          className={`seg-control-btn h-full w-full text-[11px] px-1 ${
                            txMode === 'TRANSFER' ? 'seg-control-btn-active active' : ''
                          }`}
                        >
                          {locale === 'ar' ? 'تحويل' : 'Transfer'}
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={txMode === 'BROKER_INJECTION'}
                          onClick={() => setTxMode('BROKER_INJECTION')}
                          className={`seg-control-btn h-full w-full text-[11px] px-1 ${
                            txMode === 'BROKER_INJECTION' ? 'seg-control-btn-active active' : ''
                          }`}
                        >
                          {locale === 'ar' ? 'إلى الأسهم' : 'To Stocks'}
                        </button>
                      </div>
                    </div>

                    {/* Account Selection */}
                    <div className="drawer-form-field">
                      <label className="field-label">
                        {txMode === 'TRANSFER'
                          ? (locale === 'ar' ? 'من حساب (المصدر) *' : 'From Account (Source) *')
                          : (locale === 'ar' ? 'الحساب *' : 'Account *')}
                      </label>
                      {accounts.length === 0 ? (
                        <div className="drawer-info-card">
                          <div className="drawer-info-dot" />
                          <p className="drawer-info-text">
                            {locale === 'ar' ? 'لم يتم العثور على حسابات. يرجى إضافة حساب بنكي أولاً.' : 'No accounts found. Please add a bank account first.'}
                          </p>
                        </div>
                      ) : (
                        <AccountSelectDropdown
                          accounts={accounts}
                          selectedAccountId={accountId}
                          onSelectAccount={handleAccountChange}
                          placeholder={locale === 'ar' ? 'اختر حساب بنكي...' : 'Select bank account...'}
                        />
                      )}
                    </div>

                    {/* Destination Account (If Transfer) */}
                    {txMode === 'TRANSFER' && (
                      <div className="drawer-form-field">
                        <label className="field-label">{locale === 'ar' ? 'إلى حساب (الوجهة) *' : 'To Account (Destination) *'}</label>
                        <AccountSelectDropdown
                          accounts={accounts}
                          selectedAccountId={toAccountId}
                          onSelectAccount={setToAccountId}
                          excludeAccountId={accountId}
                          placeholder={locale === 'ar' ? 'اختر حساب بنكي مستلم...' : 'Select destination bank account...'}
                        />
                      </div>
                    )}

                    {/* Amount & Date Grid */}
                    <div className="drawer-form-grid-2">
                      <div className="drawer-form-field">
                        <label className="field-label">
                          {locale === 'ar' ? `المبلغ (${currency === 'EGP' ? 'ج.م' : currency}) *` : `Amount (${currency}) *`}
                        </label>
                        <div className="field-group">
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="field-input"
                          />
                          <span className="field-suffix">{currency === 'EGP' && locale === 'ar' ? 'ج.م' : currency}</span>
                        </div>
                      </div>

                      <div className="drawer-form-field">
                        <label className="field-label">{locale === 'ar' ? 'التاريخ *' : 'Date *'}</label>
                        <input
                          type="date"
                          required
                          value={transactionDate}
                          onChange={(e) => setTransactionDate(e.target.value)}
                          className="field-date-input"
                        />
                      </div>
                    </div>

                    {/* Category (if not transfer) */}
                    {txMode !== 'TRANSFER' && (
                      <div className="drawer-form-field">
                        <label className="field-label">{locale === 'ar' ? 'التصنيف' : 'Category'}</label>
                        <div className="field-select-wrapper">
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="field-select-input"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c} className="field-select-option">
                                {locale === 'ar' ? (CATEGORIES_MAP_AR[c] || c) : c}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="field-select-chevron w-4 h-4" />
                        </div>
                      </div>
                    )}

                    {/* Notes / Description */}
                    <div className="drawer-form-field">
                      <label className="field-label">{locale === 'ar' ? 'ملاحظات ووصف' : 'Notes & Description'}</label>
                      <input
                        type="text"
                        placeholder={locale === 'ar' ? 'مثال: راتب شهري، إيجار، مشتريات' : 'e.g. Salary wire, Monthly rent, Grocery trip'}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="field-text-input"
                      />
                    </div>
                  </div>

                  {/* Sticky Footer */}
                  <div className="drawer-footer">
                    <button
                      type="button"
                      onClick={onClose}
                      className="drawer-cancel-btn"
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingTx}
                      className="drawer-confirm-btn"
                    >
                      <Check className="drawer-btn-icon" />
                      <span>{isSubmittingTx ? (locale === 'ar' ? 'جاري التسجيل...' : 'Recording...') : (locale === 'ar' ? 'تسجيل المعاملة' : 'Record Transaction')}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: POSITION FORM (Matching AddOrderModal Design & Options 1:1) */}
              {activeSwitch === 'position' && (
                <form onSubmit={handlePositionSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 bg-plt-base">
                    {/* ========================================================= */}
                    {/* SECTION 1: RISK / REWARD OVERVIEW                         */}
                    {/* Derived from Champion Algo Historical Backtest Data       */}
                    {/* ========================================================= */}
                    {canViewProprietary && cleanSymbol && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-semibold text-plt-text uppercase tracking-wider font-sans flex items-center gap-1.5">
                              <Sparkles size={13} className="text-plt-muted" />
                              {locale === 'ar' ? 'القسم 1: نظرة عامة على المخاطر والعوائد' : 'Section 1: Risk/Reward Overview'}
                            </h3>
                            <p className="text-[11px] text-plt-muted font-sans mt-0.5">
                              {locale === 'ar'
                                ? `إحصائيات تاريخية من النموذج الأفضل (${winningMetrics.winningAlgo || 'Cerberus'})`
                                : `Historical statistics from champion model (${winningMetrics.winningAlgo || 'Cerberus'})`}
                            </p>
                          </div>
                          {winningMetrics.isLoading && (
                            <span className="text-[10px] text-plt-faint flex items-center gap-1">
                              <InlineSpinner className="h-3 w-3" label="Calculating metrics" /> {locale === 'ar' ? 'جاري الحساب...' : 'Calculating...'}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {/* KPI Card 1: Est. Profit */}
                          <div className="bg-transparent border border-plt-border rounded-lg p-2.5 sm:p-3 flex flex-col justify-between hover:border-plt-border-strong transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-semibold text-plt-muted font-sans">
                                {locale === 'ar' ? 'العائد المتوقع' : 'Est. Profit'}
                              </span>
                              <TrendingUp size={12} className="text-plt-profit" />
                            </div>
                            <div className="mt-2">
                              <div className="text-sm sm:text-base font-bold text-plt-profit tabular-nums font-sans leading-tight">
                                {winningMetrics.avgReturnPerTrade > 0 ? '+' : ''}{winningMetrics.avgReturnPerTrade.toFixed(1)}%
                              </div>
                              <div className="text-[11px] font-semibold text-plt-subtle tabular-nums font-sans mt-0.5">
                                {positionTotalVal > 0
                                  ? `${estProfitCash >= 0 ? '+' : ''}${estProfitCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
                                  : '—'}
                              </div>
                            </div>
                            <span className="text-[10px] text-plt-faint font-sans mt-1">
                              {locale === 'ar' ? 'متوسط العائد / صفقة' : 'Avg return / trade'}
                            </span>
                          </div>

                          {/* KPI Card 2: Max Risk */}
                          <div className="bg-transparent border border-plt-border rounded-lg p-2.5 sm:p-3 flex flex-col justify-between hover:border-plt-border-strong transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-semibold text-plt-muted font-sans">
                                {locale === 'ar' ? 'أقصى مخاطرة' : 'Max Risk'}
                              </span>
                              <ShieldAlert size={12} className="text-plt-risk" />
                            </div>
                            <div className="mt-2">
                              <div className="text-sm sm:text-base font-bold text-plt-risk tabular-nums font-sans leading-tight">
                                {winningMetrics.maxAdverseExcursion !== 0
                                  ? `-${Math.abs(winningMetrics.maxAdverseExcursion).toFixed(1)}%`
                                  : '0.0%'}
                              </div>
                              <div className="text-[11px] font-semibold text-plt-subtle tabular-nums font-sans mt-0.5">
                                {positionTotalVal > 0 && winningMetrics.maxAdverseExcursion !== 0
                                  ? `-${maxRiskCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
                                  : '—'}
                              </div>
                            </div>
                            <span className="text-[10px] text-plt-faint font-sans mt-1">
                              {locale === 'ar' ? 'أقصى تراجع محتمل' : 'Max adverse excursion'}
                            </span>
                          </div>

                          {/* KPI Card 3: Risk / Reward Profile */}
                          <div className="bg-transparent border border-plt-border rounded-lg p-2.5 sm:p-3 flex flex-col justify-between hover:border-plt-border-strong transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-semibold text-plt-muted font-sans">
                                {locale === 'ar' ? 'نسبة العائد/المخاطرة' : 'Risk / Reward'}
                              </span>
                              <Scale
                                size={12}
                                className={
                                  rrRatio >= 2
                                    ? 'text-plt-profit'
                                    : rrRatio >= 1.2
                                    ? 'text-plt-warning'
                                    : 'text-plt-risk'
                                }
                              />
                            </div>
                            <div className="mt-2">
                              <div className="text-sm sm:text-base font-bold text-plt-text tabular-nums font-sans leading-tight">
                                1 : {rrRatio > 0 ? rrRatio.toFixed(1) : '—'}
                              </div>
                              <div className="text-[11px] font-semibold tabular-nums font-sans mt-0.5">
                                {rrRatio >= 2 ? (
                                  <span className="text-plt-profit">{locale === 'ar' ? 'مخاطرة منخفضة' : 'Low Risk'}</span>
                                ) : rrRatio >= 1.2 ? (
                                  <span className="text-plt-warning">{locale === 'ar' ? 'مخاطرة معتدلة' : 'Moderate Risk'}</span>
                                ) : (
                                  <span className="text-plt-risk">{locale === 'ar' ? 'مخاطرة مرتفعة' : 'High Risk'}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-plt-faint font-sans mt-1">
                              {locale === 'ar' ? 'معامل التباين' : 'Asymmetry ratio'}
                            </span>
                          </div>

                          {/* KPI Card 4: Est. Holding Period */}
                          <div className="bg-transparent border border-plt-border rounded-lg p-2.5 sm:p-3 flex flex-col justify-between hover:border-plt-border-strong transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-semibold text-plt-muted font-sans">
                                {locale === 'ar' ? 'مدة الاحتفاظ المتوقعة' : 'Est. Holding Period'}
                              </span>
                              <Clock size={12} className="text-plt-muted" />
                            </div>
                            <div className="mt-2">
                              <div className="text-sm sm:text-base font-bold text-plt-text tabular-nums font-sans leading-tight">
                                {winningMetrics.avgBarsPerTrade > 0 ? (locale === 'ar' ? `~${winningMetrics.avgBarsPerTrade.toFixed(0)} شمعة` : `~${winningMetrics.avgBarsPerTrade.toFixed(0)} Bars`) : '—'}
                              </div>
                              <div className="text-[11px] font-semibold text-plt-muted tabular-nums font-sans mt-0.5">
                                {winningMetrics.avgBarsPerTrade > 0
                                  ? locale === 'ar' ? `~${Math.round(winningMetrics.avgBarsPerTrade)} يوم تداول` : `~${Math.round(winningMetrics.avgBarsPerTrade)} trading days`
                                  : locale === 'ar' ? 'مدة متغيرة' : 'Variable duration'}
                              </div>
                            </div>
                            <span className="text-[10px] text-plt-faint font-sans mt-1">
                              {locale === 'ar' ? 'متوسط الشموع تاريخياً' : 'Historical avg bars'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* SECTION 2: ORDER EXECUTION                                */}
                    {/* Compact, borderless single-line rows                      */}
                    {/* ========================================================= */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xs font-semibold text-plt-text uppercase tracking-wider font-sans">
                          {locale === 'ar' ? 'القسم 2: تفاصيل الأمر والتنفيذ' : 'Section 2: Order Execution'}
                        </h3>
                        <p className="text-[11px] text-plt-muted font-sans mt-0.5">
                          {locale === 'ar'
                            ? 'اختر السهم، وحدد السعر والكمية، واختر حساب الوساطة'
                            : 'Select target equity, set coordinates, and choose brokerage account'}
                        </p>
                      </div>

                      <div className="space-y-3.5" ref={tickerSearchRef}>
                        {/* Line 1: Buying row or Search */}
                        {!isSearchOpen && cleanSymbol ? (
                          <div className="flex items-center justify-between gap-3 py-1">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-medium text-plt-muted font-sans shrink-0">{locale === 'ar' ? 'شراء' : 'Buying'}</span>
                              <div className="w-6 h-6 rounded-full bg-plt-active border border-plt-border p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                                {positionLogoUrl && !imgError ? (
                                  <img
                                    src={positionLogoUrl}
                                    alt={cleanSymbol}
                                    className="w-full h-full object-contain rounded-full"
                                    onError={() => setImgError(true)}
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-plt-text font-sans">{cleanSymbol.slice(0, 2)}</span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-plt-text tabular-nums font-sans shrink-0">
                                {cleanSymbol}
                              </span>
                              <span className="text-xs text-plt-muted truncate font-sans max-w-[160px] sm:max-w-xs" title={positionCompanyName || cleanSymbol}>
                                {positionCompanyName || cleanSymbol}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setIsSearchOpen(true);
                                setSearchQuery('');
                              }}
                              className="btn-token btn-secondary btn-micro shrink-0"
                            >
                              {locale === 'ar' ? 'تغيير' : 'Change'}
                            </button>
                          </div>
                        ) : (
                          /* Search input if search is open or ticker not selected */
                          <div className="relative space-y-2">
                            <div className="relative flex items-center gap-2">
                              <div className="relative flex-1 flex items-center">
                                <Search size={14} className="absolute start-3 text-plt-faint pointer-events-none z-10" />
                                <input
                                  type="text"
                                  placeholder={locale === 'ar' ? 'ابحث عن سهم بالرمز أو الاسم (مثل COMI، ABUK)...' : 'Search equity ticker (e.g. COMI, MPCI, ABUK)...'}
                                  value={searchQuery}
                                  onChange={(e) => handleSearchChange(e.target.value)}
                                  autoFocus
                                  className="input-token h-9 !pl-9 !pr-8 rtl:!pr-9 rtl:!pl-8 bg-plt-base text-plt-text border-plt-border focus:border-plt-border-active font-sans text-xs"
                                />
                                {searchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => handleSearchChange('')}
                                    className="absolute end-2.5 text-plt-faint hover:text-plt-text p-0.5 transition-colors cursor-pointer"
                                    title={locale === 'ar' ? 'مسح البحث' : 'Clear search'}
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>

                              {cleanSymbol && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="btn-token btn-secondary btn-micro shrink-0"
                                >
                                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                              )}
                            </div>

                            {/* Autocomplete Dropdown - only shows when user enters at least 1 letter */}
                            {searchQuery.trim().length >= 1 && (
                              <div className="max-h-56 overflow-y-auto bg-plt-base border border-plt-border rounded-lg shadow-2xl p-1 divide-y divide-plt-border-soft custom-scrollbar">
                                {filteredTickersList.length === 0 ? (
                                  <div className="p-3 text-xs text-plt-faint text-center font-sans">{locale === 'ar' ? 'لم يتم العثور على أسهم مطابقة' : 'No matching tickers found'}</div>
                                ) : (
                                  filteredTickersList.map((t) => {
                                    const clean = t.symbol.replace('.CA', '').toUpperCase();
                                    return (
                                      <div
                                        key={t.symbol}
                                        onClick={() => handleSelectTicker(t)}
                                        className="px-2.5 py-2 hover:bg-plt-hover active:bg-plt-active cursor-pointer flex items-center justify-between transition-colors gap-2.5 rounded-lg"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                          {/* 1. Circular Logo */}
                                          <div className="w-7 h-7 rounded-full bg-plt-active border border-plt-border p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                                            {t.logoUrl ? (
                                              <img
                                                src={t.logoUrl}
                                                alt={clean}
                                                className="w-full h-full object-contain rounded-full"
                                                onError={(e) => {
                                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                                }}
                                              />
                                            ) : (
                                              <span className="text-[10px] font-bold text-plt-text font-sans">{clean.slice(0, 2)}</span>
                                            )}
                                          </div>

                                          {/* 2. Text Column */}
                                          <div className="min-w-0 flex flex-col flex-1">
                                            <span className="text-xs text-plt-text truncate font-sans font-medium leading-tight" title={t.companyName}>
                                              {t.companyName || clean}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold text-plt-text bg-plt-active border border-plt-border tabular-nums font-sans shrink-0 leading-tight">
                                                {clean}
                                              </span>
                                              {t.sector && (
                                                <>
                                                  <span className="text-[10px] text-plt-faint shrink-0">•</span>
                                                  <span className="text-[10px] text-plt-muted truncate font-sans">
                                                    {t.sector}
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* 3. Latest Price */}
                                        <div className="flex flex-col items-end shrink-0 pl-2 rtl:pl-0 rtl:pr-2 font-sans tabular-nums text-right rtl:text-left">
                                          {t.price && t.price > 0 ? (
                                            <>
                                              <span className="text-xs font-semibold text-plt-text">
                                                {Number(t.price).toFixed(2)}{' '}
                                                <span className="text-[10px] text-plt-faint font-normal">{t.currency || 'EGP'}</span>
                                              </span>
                                              {t.changePct !== undefined && t.changePct !== 0 && (
                                                <span className={`text-[10px] font-medium ${t.changePct > 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                                                  {t.changePct > 0 ? '+' : ''}{Number(t.changePct).toFixed(2)}%
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-xs text-plt-faint font-medium">—</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Line 2: Broker Selection (Custom Popover Dropdown matching Strategies page) */}
                        <div className="space-y-2">
                          {brokerageAccounts.length > 0 ? (
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-medium text-plt-muted font-sans shrink-0">
                                {locale === 'ar' ? 'الوسيط:' : 'Broker:'}
                              </span>

                              <div className="relative flex-1 min-w-0" ref={brokerDropdownRef}>
                                {/* Custom Trigger Button */}
                                <button
                                  type="button"
                                  onClick={() => setIsBrokerDropdownOpen((prev) => !prev)}
                                  aria-haspopup="listbox"
                                  aria-expanded={isBrokerDropdownOpen}
                                  className="flex h-9 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-plt-border bg-plt-base px-2.5 font-sans text-xs font-semibold text-plt-text outline-none transition-all hover:border-plt-border-strong focus:border-plt-border-active"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {selectedBrokerageAccount && (
                                      <div
                                        className={`w-5 h-5 rounded-full ${
                                          isVirtualAccount(selectedBrokerageAccount)
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            : 'bg-plt-active text-plt-text border-plt-border'
                                        } border flex items-center justify-center text-[9px] font-bold shrink-0 font-sans`}
                                      >
                                        {getBrokerInitials(selectedBrokerageAccount)}
                                      </div>
                                    )}
                                    <span className="truncate">
                                      {selectedBrokerageAccount
                                        ? `${accountLabel(selectedBrokerageAccount, locale)} · ${Number(selectedBrokerageAccount.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedBrokerageAccount.currency === 'EGP' && locale === 'ar' ? 'ج.م' : selectedBrokerageAccount.currency || 'EGP'} ${isVirtualAccount(selectedBrokerageAccount) ? (locale === 'ar' ? 'رصيد تجريبي' : 'paper cash') : (locale === 'ar' ? 'متاح' : 'available')}`
                                        : (locale === 'ar' ? 'اختر وسيط...' : 'Select broker...')}
                                    </span>
                                  </div>

                                  <ChevronDown
                                    size={13}
                                    className={`shrink-0 text-plt-muted transition-transform duration-150 ${
                                      isBrokerDropdownOpen ? 'rotate-180 text-plt-text' : ''
                                    }`}
                                  />
                                </button>

                                {/* Sleek Custom Menu Popover (Surface #3D3D3D matching Strategies page) */}
                                {isBrokerDropdownOpen && (
                                  <div
                                    role="listbox"
                                    className="absolute start-0 top-full mt-1.5 z-50 w-full max-w-full rounded-xl border border-white/15 bg-[#3D3D3D] p-1 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 max-h-60 overflow-y-auto custom-scrollbar"
                                  >
                                    {brokerageAccounts.map((account) => {
                                      const isSelected = String(account.id) === String(positionAccountId);
                                      const isVirtual = isVirtualAccount(account);
                                      return (
                                        <button
                                          key={account.id}
                                          type="button"
                                          role="option"
                                          aria-selected={isSelected}
                                          onClick={() => {
                                            setPositionAccountId(String(account.id));
                                            setIsBrokerDropdownOpen(false);
                                          }}
                                          className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 font-sans text-xs transition-colors ${
                                            isSelected
                                              ? 'bg-white/15 font-semibold text-white'
                                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div
                                              className={`w-5 h-5 rounded-full ${
                                                isVirtual
                                                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                                                  : 'bg-white/10 text-white border-white/20'
                                              } border flex items-center justify-center text-[9px] font-bold shrink-0 font-sans`}
                                            >
                                              {getBrokerInitials(account)}
                                            </div>
                                            <div className="flex flex-col text-start min-w-0 flex-1">
                                              <span className="truncate leading-tight font-medium">
                                                {accountLabel(account, locale)}
                                              </span>
                                              <span className="text-[10px] text-white/60 tabular-nums mt-0.5 truncate">
                                                {Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                                                {account.currency === 'EGP' && locale === 'ar' ? 'ج.م' : account.currency || 'EGP'}{' '}
                                                {isVirtual ? (locale === 'ar' ? 'رصيد تجريبي' : 'paper cash') : (locale === 'ar' ? 'متاح' : 'available')}
                                              </span>
                                            </div>
                                          </div>

                                          {isSelected && (
                                            <Check size={13} className="shrink-0 text-white" aria-hidden="true" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400 flex items-center gap-2 font-sans">
                              <AlertCircle size={14} className="shrink-0 text-rose-400" />
                              <span>
                                {locale === 'ar' ? 'مطلوب حساب تداول بالجنيه. ' : 'An EGP brokerage account is required. '}
                                <a href="/wallet?tab=transactions" className="font-semibold underline">{locale === 'ar' ? 'اربط حساباً في المحفظة' : 'Link one in Wallet'}</a>.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Line 3: Entry date | Units | Entry Price (all in same line / 3 columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Entry Date */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-plt-muted font-sans">{locale === 'ar' ? 'تاريخ الدخول' : 'Entry Date'}</label>
                            <input
                              type="date"
                              value={positionDate}
                              onChange={(e) => setPositionDate(e.target.value)}
                              className="date-token h-9 bg-plt-base text-plt-text border-plt-border focus:border-plt-border-active font-sans text-xs"
                            />
                          </div>

                          {/* Units (Shares) */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-plt-muted font-sans">{locale === 'ar' ? 'الكمية (أسهم)' : 'Units (Shares)'}</label>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="100"
                                value={positionQty}
                                onChange={(e) => setPositionQty(e.target.value)}
                                className="input-token h-9 pe-12 bg-plt-base text-plt-text border-plt-border focus:border-plt-border-active font-bold tabular-nums text-xs"
                              />
                              <span className="absolute end-2.5 text-[10px] text-plt-faint font-medium pointer-events-none">{locale === 'ar' ? 'سهم' : 'Units'}</span>
                            </div>
                          </div>

                          {/* Entry Price */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-plt-muted font-sans">{locale === 'ar' ? 'سعر الدخول' : 'Entry Price'}</label>
                              {selectedTickerDetails?.price ? (
                                <span className="text-[10px] text-plt-faint font-sans tabular-nums">
                                  {Number(selectedTickerDetails.price).toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={positionPrice}
                                onChange={(e) => setPositionPrice(e.target.value)}
                                className="input-token h-9 pe-10 bg-plt-base text-plt-text border-plt-border focus:border-plt-border-active font-bold tabular-nums text-xs"
                              />
                              <span className="absolute end-2.5 text-[10px] text-plt-faint font-medium pointer-events-none">{locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sticky Action Footer */}
                  <div className="px-5 py-4 border-t border-plt-border bg-plt-base flex items-center justify-between gap-3 shrink-0 pb-[max(1rem,calc(0.75rem+var(--ticknal-safe-area-bottom)))]">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-plt-muted font-medium font-sans">
                        {locale === 'ar' ? 'إجمالي رأس المال المطلوب' : 'Total Capital Required'}
                      </span>
                      <span className="text-base sm:text-lg font-bold text-plt-text tabular-nums font-sans leading-tight">
                        {positionTotalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        <span className="text-xs font-normal text-plt-muted">{locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn-token btn-secondary btn-compact"
                      >
                        {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingPos || !cleanSymbol || !positionPrice}
                        className="btn-token btn-primary btn-compact"
                      >
                        {isSubmittingPos && <InlineSpinner className="h-3.5 w-3.5" label="Processing order" />}
                        <span>
                          {isSubmittingPos
                            ? locale === 'ar' ? 'جاري التنفيذ...' : 'Processing...'
                            : selectedBrokerageAccount && isVirtualAccount(selectedBrokerageAccount)
                            ? locale === 'ar' ? 'تنفيذ شراء افتراضي' : 'Execute Virtual Buy'
                            : locale === 'ar' ? 'تنفيذ شراء حي' : 'Execute Live Buy'}
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Position Added Success Modal (with Thndr Redirect CTA) */}
      <AnimatePresence>
        {showSuccessModal && addedPosition && (
          <div
            key="thndr-position-success-overlay"
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-plt-overlay backdrop-blur-md"
            onClick={() => {
              setShowSuccessModal(false);
              onClose();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-plt-base border border-plt-border rounded-2xl p-6 text-center shadow-2xl overflow-hidden"
            >
              {/* Subtle Thndr yellow top accent */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#FFE500]/60 blur-sm rounded-full" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
                className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Success Icon */}
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-base font-bold text-plt-text mb-1 font-sans">
                {locale === 'ar' ? 'تمت إضافة الصفقة بنجاح' : 'Position Added'}
              </h3>
              <p className="text-xs text-plt-muted leading-relaxed mb-5 font-sans">
                {locale === 'ar'
                  ? `تم تسجيل صفقة ${addedPosition.symbol} في محفظتك. يمكنك الآن الانتقال لتنفيذ الأمر عبر ثاندر.`
                  : `Your position for ${addedPosition.symbol} has been recorded in your portfolio. You can now place the order on Thndr.`}
              </p>

              {/* Position Details Card */}
              <div className="bg-plt-hover border border-plt-border rounded-xl p-3.5 mb-5 text-start font-sans">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-plt-border-soft">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold text-plt-text bg-plt-active border border-plt-border tabular-nums">
                      {addedPosition.symbol}
                    </span>
                    <span className="text-xs text-plt-muted truncate max-w-[140px]">
                      {addedPosition.accountName}
                    </span>
                  </div>
                  <span className="text-[10px] text-plt-muted tabular-nums">
                    {addedPosition.date}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="block text-[10px] text-plt-muted mb-0.5">
                      {locale === 'ar' ? 'السعر' : 'Price'}
                    </span>
                    <span className="text-xs font-semibold text-plt-text tabular-nums">
                      {addedPosition.price.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-plt-muted mb-0.5">
                      {locale === 'ar' ? 'الكمية' : 'Shares'}
                    </span>
                    <span className="text-xs font-semibold text-plt-text tabular-nums">
                      {addedPosition.quantity.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-plt-muted mb-0.5">
                      {locale === 'ar' ? 'الإجمالي' : 'Total'}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums">
                      {addedPosition.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                {/* Primary CTA: Yellow Thndr Button with Thndr Bolt Icon */}
                <a
                  href={addedPosition.thndrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setShowSuccessModal(false);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#FFE500] hover:bg-[#F2D900] active:scale-[0.98] text-black font-bold rounded-xl transition-all text-xs tracking-tight shadow-lg shadow-[#FFE500]/20 cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 fill-black shrink-0"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span>
                    {locale === 'ar' ? 'الانتقال إلى ثاندر لتنفيذ الأمر' : 'Go to Thndr to place order'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5] text-black/70 shrink-0" />
                </a>

                {/* Secondary CTA: Stay in Ticknal */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 text-xs font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-xl transition-colors cursor-pointer border border-transparent hover:border-plt-border"
                >
                  {locale === 'ar' ? 'البقاء في تكنال' : 'Stay in Ticknal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
