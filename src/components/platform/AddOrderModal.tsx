'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  ChevronDown,
  Building2,
  Wallet,
  AlertCircle,
  Loader2,
  TrendingUp,
  ShieldAlert,
  Clock,
  Sparkles,
  Scale,
} from '@/components/ui/icon-library';
import { useToast } from '@/context/ToastContext';

export type InitialOrderData = {
  symbol: string;
  companyName?: string;
  logoUrl?: string | null;
  sector?: string;
  signal?: string;
  price?: number;
  date?: string;
  quantity?: number;
  strategyId?: string;
  signalDate?: string;
  signalPrice?: number;
  targetPrice?: number;
  stopPrice?: number;
};

type Ticker = {
  symbol: string;
  companyName: string;
  logoUrl?: string | null;
  sector?: string;
  price?: number;
};

export type BrokerageAccountOption = {
  id: number;
  accountName: string;
  customBankName?: string | null;
  bankName?: string | null;
  accountType: string;
  currency: string;
  balance: string | number;
  isArchived?: boolean;
  isDefaultExpense?: boolean;
};

const EMPTY_BROKERAGE_ACCOUNTS: BrokerageAccountOption[] = [];

function accountLabel(account: BrokerageAccountOption): string {
  return account.accountName || account.customBankName || account.bankName || `Account ${account.id}`;
}

function getBrokerInitials(account: BrokerageAccountOption): string {
  const name = account.accountName || account.customBankName || account.bankName || '';
  const clean = name.trim().toUpperCase();
  if (clean.includes('THNDR')) return 'TH';
  if (clean.includes('CIB')) return 'CIB';
  if (clean.includes('HERMES')) return 'EFG';
  if (clean.includes('MUBASHER')) return 'MUB';
  return clean.slice(0, 2) || 'BR';
}

export default function AddOrderModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  mode = 'import',
  brokerageAccounts = EMPTY_BROKERAGE_ACCOUNTS,
  entrySource = 'CHART',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: InitialOrderData | null;
  mode?: 'import' | 'live';
  brokerageAccounts?: BrokerageAccountOption[];
  entrySource?: 'CHART' | 'COMMAND_CENTER';
}) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Accounts state
  const [fetchedAccounts, setFetchedAccounts] = useState<BrokerageAccountOption[]>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(false);

  // Form State (Target Price and Stop Loss fields removed)
  const [newOrderForm, setNewOrderForm] = useState({
    symbol: '',
    companyName: '',
    logoUrl: null as string | null,
    sector: '',
    entryDate: new Date().toISOString().split('T')[0],
    entryPrice: '',
    quantity: '100',
    accountId: '',
  });

  // Winning Algorithm Historical Metrics State
  const [winningMetrics, setWinningMetrics] = useState<{
    winningAlgo: string;
    avgReturnPerTrade: number;
    maxAdverseExcursion: number;
    avgBarsPerTrade: number;
    isLoading: boolean;
  }>({
    winningAlgo: 'Typhon',
    avgReturnPerTrade: 0,
    maxAdverseExcursion: 0,
    avgBarsPerTrade: 0,
    isLoading: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [filteredTickers, setFilteredTickers] = useState<Ticker[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Fetch accounts if not passed via props and in live mode
  useEffect(() => {
    if (isOpen && mode === 'live') {
      if (!brokerageAccounts || brokerageAccounts.length === 0) {
        setIsAccountsLoading(true);
        fetch('/api/banks/accounts')
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data?.accounts)) {
              setFetchedAccounts(data.accounts);
            }
          })
          .catch((err) => console.error('Failed to fetch accounts in AddOrderModal', err))
          .finally(() => setIsAccountsLoading(false));
      }
    }
  }, [isOpen, mode, brokerageAccounts]);

  const allAccounts = brokerageAccounts.length > 0 ? brokerageAccounts : fetchedAccounts;

  // Filter for eligible accounts
  const eligibleAccounts = useMemo(() => {
    if (!allAccounts || allAccounts.length === 0) return [];
    const brokerAccounts = allAccounts.filter(
      (a) => !a.isArchived && ['BROKERAGE', 'BROKER_CASH'].includes(a.accountType)
    );
    if (brokerAccounts.length > 0) return brokerAccounts;

    const egpAccounts = allAccounts.filter(
      (a) => !a.isArchived && (a.currency === 'EGP' || !a.currency)
    );
    if (egpAccounts.length > 0) return egpAccounts;

    return allAccounts.filter((a) => !a.isArchived);
  }, [allAccounts]);

  // Sync initialData when drawer opens, and fetch all tickers
  useEffect(() => {
    if (isOpen) {
      setImgError(false);
      const sym = initialData?.symbol || '';
      const priceVal = initialData?.price ? String(initialData.price) : '';

      const defaultAcc = eligibleAccounts.find((a) => a.isDefaultExpense) || eligibleAccounts[0];

      setNewOrderForm({
        symbol: sym,
        companyName: initialData?.companyName || '',
        logoUrl: initialData?.logoUrl || null,
        sector: initialData?.sector || '',
        entryDate: initialData?.date || new Date().toISOString().split('T')[0],
        entryPrice: priceVal,
        quantity: initialData?.quantity ? String(initialData.quantity) : '100',
        accountId: defaultAcc ? String(defaultAcc.id) : '',
      });

      setIsSearchOpen(!sym);
      setSearchQuery('');

      fetch('/api/tickers')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setTickers(data);
            setFilteredTickers(data.slice(0, 50));

            if (sym) {
              const cleanSym = sym.replace('.CA', '').toUpperCase();
              const found = data.find((t) => t.symbol?.replace('.CA', '').toUpperCase() === cleanSym);
              if (found) {
                setNewOrderForm((prev) => ({
                  ...prev,
                  companyName: prev.companyName || found.companyName || '',
                  logoUrl: prev.logoUrl || found.logoUrl || null,
                  sector: prev.sector || found.sector || '',
                }));
              }
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen, initialData]);

  // Auto-select account when eligibleAccounts arrive asynchronously
  useEffect(() => {
    if (eligibleAccounts.length > 0 && !newOrderForm.accountId) {
      const defaultAcc = eligibleAccounts.find((a) => a.isDefaultExpense) || eligibleAccounts[0];
      if (defaultAcc) {
        setNewOrderForm((prev) => ({ ...prev, accountId: String(defaultAcc.id) }));
      }
    }
  }, [eligibleAccounts, newOrderForm.accountId]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        if (newOrderForm.symbol) {
          setIsSearchOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [newOrderForm.symbol]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const cleanSymbol = (newOrderForm.symbol || initialData?.symbol || '').replace('.CA', '').toUpperCase();

  // Evaluate candidate models to extract winning algorithm historical risk/reward metrics
  useEffect(() => {
    if (!cleanSymbol || !isOpen) return;

    let isCancelled = false;
    setWinningMetrics((prev) => ({ ...prev, isLoading: true }));

    const candidateStrategies: { id: 'psi' | 'psi_v2' | 'hydra'; name: string }[] = [
      { id: 'psi', name: 'Typhon' },
      { id: 'psi_v2', name: 'Cerberus' },
      { id: 'hydra', name: 'Hydra' },
    ];

    Promise.all(
      candidateStrategies.map((strat) =>
        fetch(`/api/signals?symbol=${encodeURIComponent(cleanSymbol)}&strategy=${strat.id}`)
          .then((r) => r.json())
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
        const prioritized = initialData?.strategyId
          ? valid.find((r) => r.id === initialData.strategyId)
          : null;

        valid.sort((a, b) => b.alpha - a.alpha);
        const champion = prioritized || valid[0];

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

    return () => {
      isCancelled = true;
    };
  }, [cleanSymbol, isOpen, initialData?.strategyId]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const query = val.toLowerCase().trim();
    if (!query) {
      setFilteredTickers(tickers.slice(0, 50));
    } else {
      const filtered = tickers
        .filter(
          (t) =>
            t.symbol.toLowerCase().includes(query) ||
            t.companyName?.toLowerCase().includes(query)
        )
        .slice(0, 50);
      setFilteredTickers(filtered);
    }
  };

  const handleSelectTicker = (ticker: Ticker) => {
    const clean = ticker.symbol.replace('.CA', '').toUpperCase();
    const priceNum = ticker.price || 0;

    setImgError(false);
    setNewOrderForm((prev) => ({
      ...prev,
      symbol: clean,
      companyName: ticker.companyName || clean,
      logoUrl: ticker.logoUrl || null,
      sector: ticker.sector || '',
      entryPrice: prev.entryPrice || (priceNum > 0 ? String(priceNum) : ''),
    }));
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleAddOrder = async () => {
    if (!newOrderForm.symbol || !newOrderForm.entryPrice) {
      toast.warning('Missing Fields', 'Please enter a ticker symbol and entry price.');
      return;
    }
    if (mode === 'live' && !newOrderForm.accountId) {
      toast.error('Brokerage account required', 'Select an EGP brokerage account before executing the buy.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(mode === 'live' ? '/api/portfolio/trades' : '/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'live'
            ? {
                action: 'BUY',
                accountId: Number(newOrderForm.accountId),
                symbol: newOrderForm.symbol,
                date: newOrderForm.entryDate,
                price: Number(newOrderForm.entryPrice),
                quantity: Number(newOrderForm.quantity),
                targetPrice: null,
                stopPrice: null,
                strategyId: initialData?.strategyId,
                signalDate: initialData?.signalDate,
                signalPrice: initialData?.signalPrice,
                entrySource,
              }
            : {
                symbol: newOrderForm.symbol,
                entryDate: newOrderForm.entryDate,
                entryPrice: Number(newOrderForm.entryPrice),
                quantity: Number(newOrderForm.quantity),
                targetPrice: null,
                stopPrice: null,
              }
        ),
      });

      if (res.ok) {
        toast.success(
          mode === 'live' ? 'Live position opened' : 'Position Added',
          mode === 'live'
            ? `${newOrderForm.symbol} position was opened and brokerage cash debited.`
            : `${newOrderForm.symbol} position recorded successfully.`
        );
        onSuccess?.();
        onClose();
      } else {
        const payload = await res.json().catch(() => ({}));
        toast.error('Position Failed', payload.error || 'Failed to execute order.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error', 'An unexpected error occurred while placing the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const entryPriceNum = parseFloat(newOrderForm.entryPrice) || 0;
  const quantityNum = parseFloat(newOrderForm.quantity) || 0;
  const totalValue = entryPriceNum * quantityNum;

  // Actual projected metrics from winning algo historical statistics
  const estProfitCash = totalValue * (winningMetrics.avgReturnPerTrade / 100);
  const maxRiskCash = totalValue * (Math.abs(winningMetrics.maxAdverseExcursion) / 100);

  const upperBound = totalValue + estProfitCash;
  const lowerBound = Math.max(0, totalValue - maxRiskCash);

  const absRiskPct = Math.abs(winningMetrics.maxAdverseExcursion);
  const rewardPct = winningMetrics.avgReturnPerTrade;
  const rrRatio = absRiskPct > 0 ? rewardPct / absRiskPct : 0;

  const selectedAccount = useMemo(() => {
    return eligibleAccounts.find((a) => String(a.id) === String(newOrderForm.accountId));
  }, [eligibleAccounts, newOrderForm.accountId]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          key="add-order-drawer-container"
          className="fixed inset-0 z-[150] flex items-end md:items-center justify-end overflow-hidden select-none pointer-events-auto"
        >
          {/* Backdrop with smooth fade in/out */}
          <motion.div
            key="add-order-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer z-0"
            onClick={onClose}
            aria-label="Close drawer overlay"
          />

          {/* Drawer Sheet: slides from right on desktop, slides from bottom on phone */}
          <motion.div
            key="add-order-drawer-sheet"
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`fixed z-10 flex flex-col bg-black text-text-primary rounded-none shadow-2xl overflow-hidden font-sans ${
              isMobile
                ? 'inset-0 h-full w-full max-h-full'
                : 'inset-y-0 right-0 h-full w-full md:w-1/2 lg:w-1/2 border-l border-white/10'
            }`}
          >
            {/* Mobile Drag Indicator */}
            <div
              className="md:hidden w-full flex items-center justify-center pt-2.5 pb-1 cursor-pointer shrink-0"
              onClick={onClose}
              aria-label="Drag handle to close"
            >
              <div className="drawer-drag-pill" />
            </div>

            {/* Header: Pure Black Surface, Clean Title, Subtitle & Close Button (No ticker metadata, no execution tag) */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black">
              <div className="flex flex-col min-w-0">
                <h2 className="font-semibold text-base text-white tracking-tight truncate font-sans leading-tight">
                  Add Position
                </h2>
                <p className="text-xs text-white/50 font-normal mt-0.5 font-sans">
                  {mode === 'live' ? 'Execute a live position via funded brokerage cash' : 'Configure and record a tracked equity position'}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Close (Esc)"
                aria-label="Close Add Position Drawer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 bg-black">
              {/* ========================================================= */}
              {/* SECTION 1: RISK / REWARD OVERVIEW                         */}
              {/* Derived from Winning Algo Historical Backtest Data        */}
              {/* ========================================================= */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
                      <Sparkles size={13} className="text-white/70" />
                      Section 1: Risk/Reward Overview
                    </h3>
                    <p className="text-[11px] text-white/50 font-sans mt-0.5">
                      Historical statistics from champion model ({winningMetrics.winningAlgo})
                    </p>
                  </div>
                  {winningMetrics.isLoading && (
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* KPI Card 1: Est. Profit */}
                  <div className="bg-transparent border border-white/10 rounded-lg p-2.5 sm:p-3 flex flex-col justify-between hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-white/50 font-sans">
                        Est. Profit
                      </span>
                      <TrendingUp size={12} className="text-emerald-400" />
                    </div>
                    <div className="mt-2">
                      <div className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums font-sans leading-tight">
                        {winningMetrics.avgReturnPerTrade > 0 ? '+' : ''}{winningMetrics.avgReturnPerTrade.toFixed(1)}%
                      </div>
                      <div className="text-[11px] font-semibold text-white/80 tabular-nums font-sans mt-0.5">
                        {totalValue > 0
                          ? `${estProfitCash >= 0 ? '+' : ''}${estProfitCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`
                          : '—'}
                      </div>
                    </div>
                    <span className="text-[10px] text-white/40 font-sans mt-1">
                      Avg return / trade
                    </span>
                  </div>

                  {/* KPI Card 2: Max Risk */}
                  <div className="bg-transparent border border-white/10 rounded-lg p-2.5 sm:p-3 flex flex-col justify-between hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-white/50 font-sans">
                        Max Risk
                      </span>
                      <ShieldAlert size={12} className="text-rose-400" />
                    </div>
                    <div className="mt-2">
                      <div className="text-sm sm:text-base font-bold text-rose-400 tabular-nums font-sans leading-tight">
                        {winningMetrics.maxAdverseExcursion !== 0
                          ? `-${Math.abs(winningMetrics.maxAdverseExcursion).toFixed(1)}%`
                          : '0.0%'}
                      </div>
                      <div className="text-[11px] font-semibold text-white/80 tabular-nums font-sans mt-0.5">
                        {totalValue > 0 && winningMetrics.maxAdverseExcursion !== 0
                          ? `-${maxRiskCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`
                          : '—'}
                      </div>
                    </div>
                    <span className="text-[10px] text-white/40 font-sans mt-1">
                      Max adverse excursion
                    </span>
                  </div>

                  {/* KPI Card 3: Risk / Reward Profile */}
                  <div className="bg-transparent border border-white/10 rounded-lg p-2.5 sm:p-3 flex flex-col justify-between hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-white/50 font-sans">
                        Risk / Reward
                      </span>
                      <Scale
                        size={12}
                        className={
                          rrRatio >= 2
                            ? 'text-emerald-400'
                            : rrRatio >= 1.2
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      />
                    </div>
                    <div className="mt-2">
                      <div className="text-sm sm:text-base font-bold text-white tabular-nums font-sans leading-tight">
                        1 : {rrRatio > 0 ? rrRatio.toFixed(1) : '—'}
                      </div>
                      <div className="text-[11px] font-semibold tabular-nums font-sans mt-0.5">
                        {rrRatio >= 2 ? (
                          <span className="text-emerald-400">Low Risk</span>
                        ) : rrRatio >= 1.2 ? (
                          <span className="text-amber-400">Moderate Risk</span>
                        ) : (
                          <span className="text-rose-400">High Risk</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-white/40 font-sans mt-1">
                      Asymmetry ratio
                    </span>
                  </div>

                  {/* KPI Card 4: Est. Holding Period */}
                  <div className="bg-transparent border border-white/10 rounded-lg p-2.5 sm:p-3 flex flex-col justify-between hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-white/50 font-sans">
                        Est. Holding Period
                      </span>
                      <Clock size={12} className="text-white/60" />
                    </div>
                    <div className="mt-2">
                      <div className="text-sm sm:text-base font-bold text-white tabular-nums font-sans leading-tight">
                        {winningMetrics.avgBarsPerTrade > 0 ? `~${winningMetrics.avgBarsPerTrade.toFixed(0)} Bars` : '—'}
                      </div>
                      <div className="text-[11px] font-semibold text-white/60 tabular-nums font-sans mt-0.5">
                        {winningMetrics.avgBarsPerTrade > 0 ? `~${Math.round(winningMetrics.avgBarsPerTrade)} trading days` : 'Variable duration'}
                      </div>
                    </div>
                    <span className="text-[10px] text-white/40 font-sans mt-1">
                      Historical avg bars
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* SECTION 2: ORDER EXECUTION                                */}
              {/* Compact, borderless single-line rows                      */}
              {/* ========================================================= */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-sans">
                    Section 2: Order Execution
                  </h3>
                  <p className="text-[11px] text-white/50 font-sans mt-0.5">
                    Select target equity, set coordinates, and choose brokerage account
                  </p>
                </div>

                <div className="space-y-3.5" ref={searchRef}>
                  {/* Line 1: Buying 'ticker selection' change button (all in same line, borderless) */}
                  {!isSearchOpen && cleanSymbol ? (
                    <div className="flex items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-medium text-white/50 font-sans shrink-0">Buying</span>
                        <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                          {newOrderForm.logoUrl && !imgError ? (
                            <img
                              src={newOrderForm.logoUrl}
                              alt={cleanSymbol}
                              className="w-full h-full object-contain rounded-full"
                              onError={() => setImgError(true)}
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-white font-sans">{cleanSymbol.slice(0, 2)}</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white tabular-nums font-sans shrink-0">
                          {cleanSymbol}
                        </span>
                        <span className="text-xs text-white/60 truncate font-sans max-w-[160px] sm:max-w-xs" title={newOrderForm.companyName}>
                          {newOrderForm.companyName}
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
                        Change
                      </button>
                    </div>
                  ) : (
                    /* Search input if search is open or ticker not selected */
                    <div className="relative space-y-2">
                      <div className="relative flex items-center gap-2">
                        <div className="relative flex-1 flex items-center">
                          <Search size={14} className="absolute left-3 text-white/40 pointer-events-none z-10" />
                          <input
                            type="text"
                            placeholder="Search equity ticker (e.g. COMI, MPCI, ABUK)..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            autoFocus
                            style={{ paddingLeft: '2.25rem', paddingRight: searchQuery ? '2rem' : '0.75rem' }}
                            className="input-token h-9 !pl-9 bg-black text-white border-white/10 focus:border-white/40 font-sans text-xs"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => handleSearchChange('')}
                              className="absolute right-2.5 text-white/40 hover:text-white p-0.5 transition-colors cursor-pointer"
                              title="Clear search"
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
                            Cancel
                          </button>
                        )}
                      </div>

                      {/* Autocomplete Dropdown: Compacted with Logo, Full Name, and Symbol */}
                      <div className="max-h-56 overflow-y-auto bg-black border border-white/10 rounded-lg shadow-2xl p-1 divide-y divide-white/[0.04] custom-scrollbar">
                        {filteredTickers.length === 0 ? (
                          <div className="p-3 text-xs text-white/40 text-center font-sans">No matching tickers found</div>
                        ) : (
                          filteredTickers.map((t) => {
                            const clean = t.symbol.replace('.CA', '').toUpperCase();
                            return (
                              <div
                                key={t.symbol}
                                onClick={() => handleSelectTicker(t)}
                                className="px-2.5 py-1.5 hover:bg-white/[0.08] active:bg-white/[0.12] cursor-pointer flex items-center justify-between transition-colors gap-2.5 rounded-md"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {/* 1. Circular Logo */}
                                  <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
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
                                      <span className="text-[9px] font-bold text-white font-sans">{clean.slice(0, 2)}</span>
                                    )}
                                  </div>

                                  {/* 2. Full Company Name */}
                                  <span className="text-xs text-white/90 truncate font-sans font-medium" title={t.companyName}>
                                    {t.companyName || clean}
                                  </span>
                                </div>

                                {/* 3. Ticker Symbol */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-white/10 border border-white/15 tabular-nums font-sans">
                                    {clean}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Line 2: Broker: 'brokerage account selector' with circular logo and amount available (all in same line) */}
                  {mode === 'live' && (
                    <div className="space-y-1">
                      {isAccountsLoading && eligibleAccounts.length === 0 ? (
                        <div className="h-9 rounded-lg bg-black border border-white/10 px-3 flex items-center text-xs text-white/50 font-sans">
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Loading accounts...
                        </div>
                      ) : eligibleAccounts.length > 0 ? (
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-medium text-white/60 font-sans shrink-0">Broker:</span>
                          {selectedAccount && (
                            <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[10px] font-bold text-white shrink-0 font-sans">
                              {getBrokerInitials(selectedAccount)}
                            </div>
                          )}
                          <div className="relative flex-1">
                            <select
                              required
                              value={newOrderForm.accountId}
                              onChange={(e) => setNewOrderForm((prev) => ({ ...prev, accountId: e.target.value }))}
                              className="select-token h-9 bg-black text-white text-xs border-white/10 focus:border-white/40 pr-8"
                            >
                              {eligibleAccounts.map((account) => (
                                <option key={account.id} value={account.id} className="bg-black text-white font-sans">
                                  {accountLabel(account)} · {Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {account.currency || 'EGP'} available
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400 flex items-center gap-2 font-sans">
                          <AlertCircle size={14} className="shrink-0 text-rose-400" />
                          <span>
                            An EGP brokerage account is required. <a href="/wallet?tab=transactions" className="font-semibold underline">Link one in Wallet</a>.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Line 3: Entry date | Units | Entry Price (all in same line / 3 columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Entry Date */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-white/60 font-sans">Entry Date</label>
                      <input
                        type="date"
                        value={newOrderForm.entryDate}
                        onChange={(e) => setNewOrderForm((prev) => ({ ...prev, entryDate: e.target.value }))}
                        className="date-token h-9 bg-black text-white border-white/10 focus:border-white/40 font-sans text-xs"
                      />
                    </div>

                    {/* Units (Shares) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-white/60 font-sans">Units (Shares)</label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="100"
                          value={newOrderForm.quantity}
                          onChange={(e) => setNewOrderForm((prev) => ({ ...prev, quantity: e.target.value }))}
                          className="input-token h-9 pr-12 bg-black text-white border-white/10 focus:border-white/40 font-bold tabular-nums text-xs"
                        />
                        <span className="absolute right-2.5 text-[10px] text-white/40 font-medium pointer-events-none">Units</span>
                      </div>
                    </div>

                    {/* Entry Price */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-white/60 font-sans">Entry Price</label>
                        {initialData?.price ? (
                          <span className="text-[10px] text-white/40 font-sans tabular-nums">
                            {Number(initialData.price).toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newOrderForm.entryPrice}
                          onChange={(e) => setNewOrderForm((prev) => ({ ...prev, entryPrice: e.target.value }))}
                          className="input-token h-9 pr-10 bg-black text-white border-white/10 focus:border-white/40 font-bold tabular-nums text-xs"
                        />
                        <span className="absolute right-2.5 text-[10px] text-white/40 font-medium pointer-events-none">EGP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-5 py-4 border-t border-white/10 bg-black flex items-center justify-between gap-3 shrink-0">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium font-sans">
                  Total Capital Required
                </span>
                <span className="text-base sm:text-lg font-bold text-white tabular-nums font-sans leading-tight">
                  {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  <span className="text-xs font-normal text-white/60">EGP</span>
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-token btn-secondary btn-compact"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddOrder}
                  disabled={isSubmitting || !newOrderForm.symbol || !newOrderForm.entryPrice}
                  className="btn-token btn-primary btn-compact"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isSubmitting
                      ? 'Processing...'
                      : mode === 'live'
                      ? 'Execute Live Buy'
                      : 'Record Position'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
