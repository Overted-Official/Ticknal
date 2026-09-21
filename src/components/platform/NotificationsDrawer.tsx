'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
} from '@/components/ui/icon-library';
import { formatUiLabel } from '@/lib/format-ui-label';

export type SignalNotificationItem = {
  id: number;
  tickerSymbol: string;
  signalDate: string;
  signal: string;
  strategy?: string | null;
  sentAt: string;
  companyName?: string | null;
  logoUrl?: string | null;
  sector?: string | null;
  industryGroup?: string | null;
  rotationRegime?: 'Leading' | 'Improving' | 'Weakening' | 'Lagging' | null;
};

export type SystemLogItem = {
  id: number;
  level: string;
  source: string;
  message: string;
  metadata?: unknown;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatTimeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function TickerLogo({
  symbol,
  companyName,
  logoUrl,
}: {
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
}) {
  const [imgError, setImgError] = useState(false);
  const cleanSymbol = symbol.replace('.CA', '');
  const initial = companyName
    ? companyName.trim().charAt(0).toUpperCase()
    : cleanSymbol.charAt(0).toUpperCase();

  return (
    <div className="w-8 h-8 rounded-full bg-[#18181b] border border-white/5 flex items-center justify-center font-bold text-xs text-white/90 shrink-0 overflow-hidden shadow-xs">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={cleanSymbol}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

function normalizeStrategyId(strategy?: string | null): 'psi' | 'psi_v2' | 'hydra' | 'thoth' {
  if (!strategy) return 'psi';
  const lower = strategy.toLowerCase();
  if (lower.includes('hydra')) return 'hydra';
  if (lower.includes('thoth')) return 'thoth';
  if (lower.includes('psi_v2') || lower.includes('psiv2')) return 'psi_v2';
  return 'psi';
}

function getRegimeBadge(regime?: string | null) {
  if (regime === 'Leading') {
    return {
      label: 'Leading',
      textColor: 'text-[#089981]',
    };
  }
  if (regime === 'Improving') {
    return {
      label: 'Improving',
      textColor: 'text-[#2962ff]',
    };
  }
  if (regime === 'Weakening') {
    return {
      label: 'Weakening',
      textColor: 'text-[#f59e0b]',
    };
  }
  return {
    label: 'Lagging',
    textColor: 'text-[#f23645]',
  };
}

export default function NotificationsDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signals' | 'system'>('signals');
  const [selectedStrategy, setSelectedStrategy] = useState<'all' | 'psi' | 'psi_v2' | 'hydra' | 'thoth'>('all');
  const [selectedRegime, setSelectedRegime] = useState<'all' | 'alpha' | 'Leading' | 'Improving' | 'Weakening' | 'Lagging'>('all');

  const { data: signalsData, mutate: mutateSignals, isLoading: isLoadingSignals } = useSWR<{
    notifications: SignalNotificationItem[];
  }>(isOpen ? '/api/notifications' : null, fetcher, { refreshInterval: 15000 });

  const { data: logsData, isLoading: isLoadingLogs } = useSWR<{ logs: SystemLogItem[] }>(
    isOpen ? '/api/system-logs' : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const notifications = useMemo(() => {
    const list = signalsData?.notifications ?? [];
    return [...list].sort((a, b) => {
      const dateA = a.signalDate || '';
      const dateB = b.signalDate || '';
      const dateCompare = dateB.localeCompare(dateA);
      if (dateCompare !== 0) return dateCompare;

      const sentA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const sentB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return sentB - sentA;
    });
  }, [signalsData?.notifications]);

  const strategyCounts = useMemo(() => {
    const counts = { all: notifications.length, psi: 0, psi_v2: 0, hydra: 0, thoth: 0 };
    for (const n of notifications) {
      const s = normalizeStrategyId(n.strategy);
      counts[s]++;
    }
    return counts;
  }, [notifications]);

  const regimeCounts = useMemo(() => {
    const counts = {
      all: notifications.length,
      alpha: 0,
      Leading: 0,
      Improving: 0,
      Weakening: 0,
      Lagging: 0,
    };
    for (const n of notifications) {
      const r = (n.rotationRegime || 'Leading') as 'Leading' | 'Improving' | 'Weakening' | 'Lagging';
      counts[r] = (counts[r] || 0) + 1;
      if (r === 'Leading' || r === 'Improving') counts.alpha++;
    }
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Strategy filter
      if (selectedStrategy !== 'all') {
        if (normalizeStrategyId(n.strategy) !== selectedStrategy) return false;
      }
      // 2. Regime filter
      if (selectedRegime === 'alpha') {
        const r = n.rotationRegime || 'Leading';
        if (r !== 'Leading' && r !== 'Improving') return false;
      } else if (selectedRegime !== 'all') {
        if ((n.rotationRegime || 'Leading') !== selectedRegime) return false;
      }
      return true;
    });
  }, [notifications, selectedStrategy, selectedRegime]);

  const systemLogs = logsData?.logs ?? [];
  const [isClearing, setIsClearing] = useState(false);
  const [isStrategyMenuOpen, setIsStrategyMenuOpen] = useState(false);
  const [isRegimeMenuOpen, setIsRegimeMenuOpen] = useState(false);
  const strategyMenuRef = useRef<HTMLDivElement>(null);
  const regimeMenuRef = useRef<HTMLDivElement>(null);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (strategyMenuRef.current && !strategyMenuRef.current.contains(e.target as Node)) {
        setIsStrategyMenuOpen(false);
      }
      if (regimeMenuRef.current && !regimeMenuRef.current.contains(e.target as Node)) {
        setIsRegimeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStrategyMenuOpen || isRegimeMenuOpen) {
          setIsStrategyMenuOpen(false);
          setIsRegimeMenuOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isStrategyMenuOpen, isRegimeMenuOpen, onClose]);

  const strategyOptions = [
    { id: 'all', label: 'All Strategies', count: strategyCounts.all },
    { id: 'psi', label: 'Typhon Strategy', count: strategyCounts.psi },
    { id: 'psi_v2', label: 'Cerberus Strategy', count: strategyCounts.psi_v2 },
    { id: 'hydra', label: 'Hydra Strategy', count: strategyCounts.hydra },
  ];

  const regimeOptions = [
    { id: 'all', label: 'All Regimes', count: regimeCounts.all },
    { id: 'alpha', label: 'Alpha Wave', count: regimeCounts.alpha },
    { id: 'Leading', label: 'Leading', count: regimeCounts.Leading },
    { id: 'Improving', label: 'Improving', count: regimeCounts.Improving },
    { id: 'Weakening', label: 'Weakening', count: regimeCounts.Weakening },
    { id: 'Lagging', label: 'Lagging', count: regimeCounts.Lagging },
  ];

  const activeStrategyLabel =
    selectedStrategy === 'all'
      ? 'All Strategies'
      : selectedStrategy === 'psi'
      ? 'Typhon'
      : selectedStrategy === 'psi_v2'
      ? 'Cerberus'
      : selectedStrategy === 'hydra'
      ? 'Hydra'
      : 'All Strategies';

  const activeRegimeLabel =
    selectedRegime === 'all'
      ? 'All Regimes'
      : selectedRegime === 'alpha'
      ? 'Alpha Wave'
      : selectedRegime;

  const isFiltered = selectedStrategy !== 'all' || selectedRegime !== 'all';

  const resetFilters = () => {
    setSelectedStrategy('all');
    setSelectedRegime('all');
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (res.ok) {
        mutateSignals({ notifications: [] }, false);
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex justify-end overflow-hidden pointer-events-auto select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          />

          {/* Drawer Panel - Extended on desktop to 50% */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative z-modal-content h-dvh max-h-dvh w-full sm:max-w-xl md:w-[50vw] md:max-w-[50vw] bg-[#121214] text-white border-l border-[#27272a] shadow-2xl flex flex-col min-h-0 overflow-hidden"
          >
            {/* 1. Header */}
            <div className="px-5 py-3.5 border-b border-[#27272a] bg-[#121214] flex items-center justify-between shrink-0">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight font-sans">
                    Trade Notifications
                  </h2>
                  {notifications.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#089981]/15 text-[#089981] border border-[#089981]/30">
                      {notifications.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#787b86] font-sans">
                  Real-time alerts for watchlists & positions
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'signals' && notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#787b86] hover:text-white hover:bg-[#18181b] border border-transparent hover:border-[#27272a] transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Clear all notifications"
                  >
                    {isClearing ? <Loader2 size={12} className="animate-spin" /> : 'Clear all'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-[#787b86] hover:text-white hover:bg-[#18181b] border border-transparent hover:border-[#27272a] rounded-lg transition-colors cursor-pointer"
                  title="Close notifications (Esc)"
                  aria-label="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* 2. Segmented Switcher Tabs */}
            <div className="px-4 py-2 border-b border-[#222225] bg-[#121214] shrink-0">
              <div className="inline-flex w-full p-1 rounded-xl bg-[#18181b] border border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setActiveTab('signals')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'signals'
                      ? 'bg-[#27272a] text-white shadow-xs'
                      : 'text-[#787b86] hover:text-white hover:bg-[#222225]/60'
                  }`}
                >
                  <span>Position Alerts</span>
                  {notifications.length > 0 && (
                    <span className={`px-2 py-0.2 rounded-md text-[10px] font-mono border ${
                      activeTab === 'signals'
                        ? 'bg-[#121214] text-white border-[#3f3f46]'
                        : 'bg-[#121214] text-[#787b86] border-[#27272a]'
                    }`}>
                      {notifications.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'system'
                      ? 'bg-[#27272a] text-white shadow-xs'
                      : 'text-[#787b86] hover:text-white hover:bg-[#222225]/60'
                  }`}
                >
                  <span>System Logs</span>
                  {systemLogs.length > 0 && (
                    <span className={`px-2 py-0.2 rounded-md text-[10px] font-mono border ${
                      activeTab === 'system'
                        ? 'bg-[#121214] text-white border-[#3f3f46]'
                        : 'bg-[#121214] text-[#787b86] border-[#27272a]'
                    }`}>
                      {systemLogs.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Filter Bar */}
            {activeTab === 'signals' && notifications.length > 0 && (
              <div className="px-4 py-2 border-b border-[#222225] bg-[#121214] flex items-center gap-2 shrink-0 flex-wrap">
                {/* Strategy Filter */}
                <div className="relative flex-1 min-w-[130px]" ref={strategyMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStrategyMenuOpen(!isStrategyMenuOpen);
                      setIsRegimeMenuOpen(false);
                    }}
                    className={`h-8 w-full px-2.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                      selectedStrategy !== 'all'
                        ? 'bg-[#089981]/15 border-[#089981]/40 text-[#089981] font-semibold shadow-xs'
                        : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#3f3f46]'
                    }`}
                  >
                    <span className="truncate">
                      {selectedStrategy !== 'all' ? activeStrategyLabel : 'Strategy: All'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {selectedStrategy !== 'all' && (
                        <span className="px-1 py-0.2 rounded text-[10px] bg-[#089981]/20 font-bold">
                          {strategyCounts[selectedStrategy]}
                        </span>
                      )}
                      <ChevronDown
                        size={12}
                        className={`text-[#787b86] transition-transform duration-150 ${
                          isStrategyMenuOpen ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isStrategyMenuOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl bg-[#121214] border border-[#27272a] p-1.5 shadow-2xl z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                      {strategyOptions.map((strat) => {
                        const isSelected = selectedStrategy === strat.id;
                        return (
                          <button
                            key={strat.id}
                            type="button"
                            onClick={() => {
                              setSelectedStrategy(strat.id as any);
                              setIsStrategyMenuOpen(false);
                            }}
                            className={`px-3 py-2 rounded-lg text-left text-xs font-mono transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#18181b] text-white font-semibold border border-[#27272a]'
                                : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/70 border border-transparent'
                            }`}
                          >
                            <span className="truncate">{strat.label}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isSelected ? 'bg-[#27272a] text-white font-bold' : 'bg-[#18181b] text-[#787b86]'
                            }`}>
                              {strat.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Regime Filter */}
                <div className="relative flex-1 min-w-[130px]" ref={regimeMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegimeMenuOpen(!isRegimeMenuOpen);
                      setIsStrategyMenuOpen(false);
                    }}
                    className={`h-8 w-full px-2.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                      selectedRegime !== 'all'
                        ? selectedRegime === 'alpha'
                          ? 'bg-[#089981]/15 border-[#089981]/40 text-[#089981] font-semibold shadow-xs'
                          : 'bg-[#2962ff]/15 border-[#2962ff]/40 text-[#2962ff] font-semibold shadow-xs'
                        : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#3f3f46]'
                    }`}
                  >
                    <span className="truncate">
                      {selectedRegime !== 'all' ? activeRegimeLabel : 'Regime: All'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {selectedRegime !== 'all' && (
                        <span className="px-1 py-0.2 rounded text-[10px] bg-white/10 font-bold">
                          {regimeCounts[selectedRegime]}
                        </span>
                      )}
                      <ChevronDown
                        size={12}
                        className={`text-[#787b86] transition-transform duration-150 ${
                          isRegimeMenuOpen ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isRegimeMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[#121214] border border-[#27272a] p-1.5 shadow-2xl z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                      {regimeOptions.map((reg) => {
                        const isSelected = selectedRegime === reg.id;
                        return (
                          <button
                            key={reg.id}
                            type="button"
                            onClick={() => {
                              setSelectedRegime(reg.id as any);
                              setIsRegimeMenuOpen(false);
                            }}
                            className={`px-3 py-2 rounded-lg text-left text-xs font-mono transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#18181b] text-white font-semibold border border-[#27272a]'
                                : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/70 border border-transparent'
                            }`}
                          >
                            <span className="truncate">{reg.label}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isSelected ? 'bg-[#27272a] text-white font-bold' : 'bg-[#18181b] text-[#787b86]'
                            }`}>
                              {reg.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reset Filters */}
                {isFiltered && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="h-8 px-2.5 rounded-lg border border-[#27272a] bg-[#18181b] hover:border-[#f23645]/40 hover:bg-[#f23645]/10 text-[#787b86] hover:text-[#f23645] text-xs font-mono flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    title="Reset all filters"
                  >
                    <X size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            )}

            {/* List Header Bar */}
            {activeTab === 'signals' && filteredNotifications.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#222225] bg-[#121214]/80 shrink-0">
                <span className="text-xs font-bold text-white tracking-tight">
                  Signal Alerts
                </span>
                <span className="text-[11px] text-[#787b86] font-medium">
                  {filteredNotifications.length} alerts
                </span>
              </div>
            )}

            {/* 4. Main Scrollable List */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar">
              {activeTab === 'signals' ? (
                isLoadingSignals && notifications.length === 0 ? (
                  <div className="py-24 text-center text-[#787b86] text-xs flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-[#787b86]" />
                    <span className="font-mono text-xs text-[#a1a1aa]">Loading signals...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-28 text-center text-[#787b86] text-xs flex flex-col items-center justify-center gap-3 px-6">
                    <div className="w-12 h-12 rounded-full bg-[#18181b] border border-white/5 flex items-center justify-center text-[#787b86] mb-1">
                      <Bell size={20} />
                    </div>
                    <span className="font-semibold text-white text-sm block font-sans">No notifications yet</span>
                    <span className="text-xs text-[#787b86] block leading-relaxed max-w-sm font-sans">
                      New buy, sell, or stop triggers on your watched stocks and holdings will appear here in real-time.
                    </span>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="py-24 text-center text-[#787b86] text-xs flex flex-col items-center justify-center gap-3 px-6">
                    <div className="w-11 h-11 rounded-full bg-[#18181b] border border-white/5 flex items-center justify-center text-[#787b86] mb-1">
                      <Bell size={18} />
                    </div>
                    <span className="font-semibold text-white text-sm block font-sans">
                      No matching signals found
                    </span>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-2 px-3.5 py-1.5 text-xs font-mono rounded-lg bg-[#18181b] hover:bg-[#222225] border border-[#27272a] hover:border-[#3f3f46] text-white transition cursor-pointer"
                    >
                      Reset filters & view all ({notifications.length})
                    </button>
                  </div>
                ) : (
                  <div>
                    {filteredNotifications.map((item) => {
                      const isBuy = item.signal.toUpperCase().includes('BUY');
                      const cleanSymbol = item.tickerSymbol.replace('.CA', '');
                      const regime = getRegimeBadge(item.rotationRegime);
                      const strategyId = normalizeStrategyId(item.strategy);
                      const strategyLabel =
                        strategyId === 'hydra'
                          ? 'Hydra'
                          : strategyId === 'psi_v2'
                          ? 'Cerberus'
                          : strategyId === 'thoth'
                          ? 'Archived'
                          : 'Typhon';

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            onClose();
                            router.push(`/invest?ticker=${cleanSymbol}&view=chart&strategy=${item.strategy || 'psi'}`);
                          }}
                          className="py-2.5 px-4 flex items-center justify-between hover:bg-[#18181b]/50 transition-colors group cursor-pointer border-b border-[#222225]"
                        >
                          {/* Left: Circular Avatar + Stacked Name & Ticker (HoldingRowItem style) */}
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {/* Circular Avatar */}
                            <TickerLogo
                              symbol={item.tickerSymbol}
                              companyName={item.companyName}
                              logoUrl={item.logoUrl}
                            />

                            {/* Text Stack */}
                            <div className="min-w-0">
                              {/* Top: Full Company Name */}
                              <div className="text-[13px] font-medium text-white truncate max-w-[140px] sm:max-w-[220px] md:max-w-[320px] group-hover:text-[#2962ff] transition-colors">
                                {item.companyName ?? cleanSymbol}
                              </div>

                              {/* Bottom: Ticker in dark pill + meta */}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#18181b] text-[#868993] border border-[#27272a] uppercase tracking-wider font-mono">
                                  {cleanSymbol}
                                </span>
                                <span className="text-[11px] text-[#787b86] font-normal truncate">
                                  · {item.signalDate} · {strategyLabel}
                                  {item.industryGroup ? ` · ${item.industryGroup}` : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Time/Regime Stack + Solid TradingView Pill Badge */}
                          <div className="flex items-center gap-3 shrink-0 pl-2">
                            {/* Time & Regime */}
                            <div className="text-right">
                              <div className="text-[13px] font-semibold text-white tabular-nums">
                                {formatTimeAgo(item.sentAt)}
                              </div>
                              <div className={`text-[10px] font-medium tabular-nums text-right mt-0.5 ${regime.textColor}`}>
                                {regime.label}
                              </div>
                            </div>

                            {/* Solid TradingView Pill Badge (HoldingRowItem style) */}
                            <div className="w-[74px] shrink-0 flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  router.push(`/invest?ticker=${cleanSymbol}&view=chart&strategy=${item.strategy || 'psi'}&positions=1`);
                                }}
                                className={`w-[72px] py-1 text-center rounded-[6px] text-xs font-bold tabular-nums text-white shadow-xs transition-all cursor-pointer ${
                                  isBuy
                                    ? 'bg-[#089981] hover:bg-[#067a67]'
                                    : 'bg-[#f23645] hover:bg-[#d42a38]'
                                }`}
                              >
                                {isBuy ? 'Buy' : 'Sell'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                isLoadingLogs && systemLogs.length === 0 ? (
                  <div className="py-24 text-center text-[#787b86] text-xs flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-[#787b86]" />
                    <span className="font-mono text-xs text-[#a1a1aa]">Loading system logs...</span>
                  </div>
                ) : systemLogs.length === 0 ? (
                  <div className="py-28 text-center text-[#787b86] text-xs flex flex-col items-center justify-center gap-3 px-6">
                    <div className="w-12 h-12 rounded-full bg-[#18181b] border border-white/5 flex items-center justify-center text-[#787b86] mb-1">
                      <Clock size={20} />
                    </div>
                    <span className="font-semibold text-white text-sm block font-sans">No system logs</span>
                    <span className="text-xs text-[#787b86] block leading-relaxed max-w-sm font-sans">
                      Cron job executions, cache updates, and system status logs will appear here.
                    </span>
                  </div>
                ) : (
                  <div>
                    {systemLogs.map((log) => {
                      const isError = log.level === 'ERROR';
                      const isWarning = log.level === 'WARNING';

                      return (
                        <div
                          key={log.id}
                          className="py-2.5 px-4 flex items-center justify-between hover:bg-[#18181b]/50 transition-colors group cursor-pointer border-b border-[#222225]"
                        >
                          {/* Left: Icon Avatar + Stacked Source & Message */}
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="w-8 h-8 rounded-full bg-[#18181b] border border-white/5 flex items-center justify-center shrink-0 shadow-xs">
                              {isError ? (
                                <AlertCircle size={15} className="text-[#f23645]" />
                              ) : isWarning ? (
                                <AlertCircle size={15} className="text-[#f59e0b]" />
                              ) : (
                                <CheckCircle2 size={15} className="text-[#089981]" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-white truncate max-w-[160px] sm:max-w-[260px] md:max-w-[360px]">
                                {log.message}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#18181b] text-[#868993] border border-[#27272a] uppercase tracking-wider font-mono">
                                  {formatUiLabel(log.source)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Timestamp + Level Pill */}
                          <div className="flex items-center gap-3 shrink-0 pl-2">
                            <div className="text-right">
                              <div className="text-[13px] font-semibold text-white tabular-nums">
                                {formatTimeAgo(log.createdAt)}
                              </div>
                              <div className="text-[10px] text-[#787b86] font-medium tabular-nums text-right mt-0.5">
                                {log.level}
                              </div>
                            </div>

                            <div className="w-[74px] shrink-0 flex justify-end">
                              <div
                                className={`w-[72px] py-1 text-center rounded-[6px] text-xs font-bold tabular-nums text-white shadow-xs ${
                                  isError
                                    ? 'bg-[#f23645]'
                                    : isWarning
                                    ? 'bg-[#f59e0b]'
                                    : 'bg-[#18181b] text-[#868993] border border-[#27272a]'
                                }`}
                              >
                                {isError ? 'Error' : isWarning ? 'Warning' : 'OK'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
