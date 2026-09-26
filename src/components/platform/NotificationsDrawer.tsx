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
  BarChart2,
  ChevronDown,
} from '@/components/ui/icon-library';
import { formatUiLabel } from '@/lib/format-ui-label';
import AddOrderModal, { type InitialOrderData, type BrokerageAccountOption } from '@/components/platform/AddOrderModal';

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

/** Returns a concise label for a date grouping header */
function formatGroupLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTimeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
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
    <div className="w-7 h-7 rounded-full bg-black border border-white/10 flex items-center justify-center font-bold text-[10px] text-white/90 shrink-0 overflow-hidden shadow-xs">
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

function getRegimeBadge(regime?: string | null): { label: string; cls: string } {
  if (regime === 'Leading')   return { label: 'Leading',   cls: 'text-emerald-300' };
  if (regime === 'Improving') return { label: 'Improving', cls: 'text-sky-300' };
  if (regime === 'Weakening') return { label: 'Weakening', cls: 'text-amber-300' };
  return                               { label: 'Lagging',   cls: 'text-rose-300' };
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
  const [selectedRegime, setSelectedRegime] = useState<'all' | 'Leading' | 'Improving' | 'Weakening' | 'Lagging'>('all');
  const [isRegimeMenuOpen, setIsRegimeMenuOpen] = useState(false);
  const regimeMenuRef = useRef<HTMLDivElement>(null);

  // AddOrderModal state
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderInitialData, setOrderInitialData] = useState<InitialOrderData | null>(null);
  const [brokerageAccounts, setBrokerageAccounts] = useState<BrokerageAccountOption[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const { data: signalsData, mutate: mutateSignals, isLoading: isLoadingSignals } = useSWR<{
    notifications: SignalNotificationItem[];
  }>(isOpen ? '/api/notifications' : null, fetcher, {
    refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 60000,
    revalidateOnFocus: false,
  });

  const { data: logsData, isLoading: isLoadingLogs } = useSWR<{ logs: SystemLogItem[] }>(
    isOpen ? '/api/system-logs' : null,
    fetcher,
    {
      refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 60000,
      revalidateOnFocus: false,
    }
  );

  const notifications = useMemo(() => {
    const list = signalsData?.notifications ?? [];
    return [...list].sort((a, b) => {
      const dateCompare = b.signalDate.localeCompare(a.signalDate);
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    });
  }, [signalsData?.notifications]);

  const regimeCounts = useMemo(() => {
    const counts = { all: notifications.length, Leading: 0, Improving: 0, Weakening: 0, Lagging: 0 };
    for (const n of notifications) {
      const r = (n.rotationRegime || 'Leading') as keyof typeof counts;
      if (r in counts) counts[r]++;
    }
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (selectedRegime === 'all') return notifications;
    return notifications.filter((n) => (n.rotationRegime || 'Leading') === selectedRegime);
  }, [notifications, selectedRegime]);

  /** Group filtered notifications by calendar date of sentAt */
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; dateKey: string; items: SignalNotificationItem[] }[] = [];
    const seen = new Map<string, number>();

    for (const item of filteredNotifications) {
      const d = new Date(item.sentAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (seen.has(key)) {
        groups[seen.get(key)!].items.push(item);
      } else {
        seen.set(key, groups.length);
        groups.push({ label: formatGroupLabel(item.sentAt), dateKey: key, items: [item] });
      }
    }
    return groups;
  }, [filteredNotifications]);

  const systemLogs = logsData?.logs ?? [];
  const [isClearing, setIsClearing] = useState(false);

  // Outside click — regime menu
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (regimeMenuRef.current && !regimeMenuRef.current.contains(e.target as Node)) {
        setIsRegimeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Keyboard Escape
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRegimeMenuOpen) setIsRegimeMenuOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, isRegimeMenuOpen, onClose]);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (res.ok) mutateSignals({ notifications: [] }, false);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const openOrderModal = async (item: SignalNotificationItem) => {
    const cleanSymbol = item.tickerSymbol.replace('.CA', '');
    const isBuy = item.signal.toUpperCase().includes('BUY');

    setOrderInitialData({
      symbol: cleanSymbol,
      companyName: item.companyName ?? undefined,
      logoUrl: item.logoUrl ?? null,
      sector: item.sector ?? undefined,
      signal: isBuy ? 'BUY' : 'SELL',
      strategyId: item.strategy ?? undefined,
      signalDate: item.signalDate,
    });
    setOrderModalOpen(true);

    if (brokerageAccounts.length === 0 && !isLoadingAccounts) {
      setIsLoadingAccounts(true);
      try {
        const res = await fetch('/api/brokerage-accounts');
        if (res.ok) {
          const data = await res.json();
          setBrokerageAccounts(data.accounts ?? []);
        }
      } catch { /* silently fall back to empty list */ }
      finally { setIsLoadingAccounts(false); }
    }
  };

  const regimeOptions = [
    { id: 'all',       label: 'All Regimes', count: regimeCounts.all },
    { id: 'Leading',   label: 'Leading',     count: regimeCounts.Leading },
    { id: 'Improving', label: 'Improving',   count: regimeCounts.Improving },
    { id: 'Weakening', label: 'Weakening',   count: regimeCounts.Weakening },
    { id: 'Lagging',   label: 'Lagging',     count: regimeCounts.Lagging },
  ];

  const activeRegimeLabel = selectedRegime === 'all' ? 'Regime: All' : selectedRegime;
  const isFiltered = selectedRegime !== 'all';

  return (
    <>
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

            {/* Drawer Panel — sleek executive width */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative z-modal-content h-dvh max-h-dvh w-full sm:max-w-md md:max-w-lg bg-black text-plt-text border-l border-border-default shadow-2xl flex flex-col min-h-0 overflow-hidden rounded-none"
            >
              {/* Brand Accent Hairline Top Bar */}
              <div className="h-[2px] w-full bg-gradient-to-r from-[#00BCE6] via-[#2962FF] to-[#D500F9] shrink-0" />

              {/* 1. Header — compact sleek row */}
              <div className="px-4 py-2.5 border-b border-border-default bg-black flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-sm font-bold text-white tracking-tight font-sans truncate">
                    Trade Notifications
                  </h2>
                  {notifications.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/[0.06] border border-white/10 text-white tabular-nums shrink-0">
                      {notifications.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeTab === 'signals' && notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      disabled={isClearing}
                      className="px-2 py-1 rounded text-[11px] font-medium text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center gap-1"
                      title="Clear all notifications"
                    >
                      {isClearing ? <Loader2 size={11} className="animate-spin" /> : 'Clear all'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-text-muted hover:text-white hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
                    title="Close (Esc)"
                    aria-label="Close notifications"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* 2. Compact Toolbar: Micro-Tab Switcher + Inline Regime Filter */}
              <div className="px-3.5 py-1.5 border-b border-border-default bg-black shrink-0 flex items-center justify-between gap-2">
                {/* Micro segmented switcher */}
                <div className="inline-flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] shrink-0">
                  {(['signals', 'system'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    const count = tab === 'signals' ? notifications.length : systemLogs.length;
                    const label = tab === 'signals' ? 'Alerts' : 'Logs';
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`h-6 px-2.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'bg-white/[0.12] text-white shadow-xs'
                            : 'text-text-muted hover:text-white'
                        }`}
                      >
                        <span>{label}</span>
                        {count > 0 && (
                          <span className={`px-1 rounded text-[9.5px] tabular-nums ${
                            isActive ? 'bg-black/60 text-white' : 'text-text-muted'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Regime filter — compact inline dropdown */}
                {activeTab === 'signals' && notifications.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="relative" ref={regimeMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsRegimeMenuOpen((p) => !p)}
                        className={`h-6 px-2 rounded-md border text-[11px] font-sans flex items-center gap-1 transition-all cursor-pointer ${
                          selectedRegime === 'Leading'   ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                        : selectedRegime === 'Improving' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 font-semibold'
                        : selectedRegime === 'Weakening' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-semibold'
                        : selectedRegime === 'Lagging'   ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold'
                        : 'bg-white/[0.03] border-white/[0.08] text-text-muted hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span className="truncate max-w-[90px]">{activeRegimeLabel}</span>
                        <ChevronDown size={11} className={`text-text-muted transition-transform duration-150 ${isRegimeMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isRegimeMenuOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-black border border-border-default p-1 shadow-2xl z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                          {regimeOptions.map((reg) => {
                            const isSel = selectedRegime === reg.id;
                            return (
                              <button
                                key={reg.id}
                                type="button"
                                onClick={() => { setSelectedRegime(reg.id as typeof selectedRegime); setIsRegimeMenuOpen(false); }}
                                className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] font-sans transition flex items-center justify-between cursor-pointer ${
                                  isSel
                                    ? 'bg-white/[0.08] text-white font-semibold'
                                    : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
                                }`}
                              >
                                <span className="truncate">{reg.label}</span>
                                <span className={`px-1 rounded text-[9.5px] tabular-nums ${
                                  isSel ? 'text-white font-bold' : 'text-text-muted'
                                }`}>
                                  {reg.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {isFiltered && (
                      <button
                        type="button"
                        onClick={() => setSelectedRegime('all')}
                        className="h-6 w-6 rounded-md border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-text-muted hover:text-loss-chart hover:border-loss-chart/40 transition-colors cursor-pointer"
                        title="Reset filter"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Main Scrollable List — compact high-density design */}
              <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar">
                {activeTab === 'signals' ? (
                  isLoadingSignals && notifications.length === 0 ? (
                    <div className="py-20 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin text-text-muted" />
                      <span className="text-xs text-text-secondary">Loading signals...</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-24 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2.5 px-6">
                      <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-muted mb-1">
                        <Bell size={18} />
                      </div>
                      <span className="font-semibold text-white text-sm block font-sans">No notifications yet</span>
                      <span className="text-xs text-text-muted block leading-relaxed max-w-xs font-sans">
                        New buy, sell, or stop triggers on your watched stocks and holdings will appear here in real-time.
                      </span>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="py-20 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2.5 px-6">
                      <span className="font-semibold text-white text-xs block font-sans">No matching signals</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRegime('all')}
                        className="mt-1 px-3 py-1 text-xs font-sans rounded-md bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white transition cursor-pointer"
                      >
                        Reset filter &amp; view all ({notifications.length})
                      </button>
                    </div>
                  ) : (
                    <div>
                      {groupedNotifications.map((group) => (
                        <div key={group.dateKey}>
                          {/* Date group sticky header with subtle gradient indicator */}
                          <div className="px-3.5 py-1 flex items-center justify-between sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-white/[0.06]">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-3 rounded-full bg-gradient-to-b from-[#00BCE6] via-[#2962FF] to-[#D500F9] shrink-0" />
                              <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest font-sans">
                                {group.label}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-text-muted tabular-nums px-1.5 py-0.2 rounded-full bg-white/[0.04] border border-white/[0.06]">
                              {group.items.length}
                            </span>
                          </div>

                          {group.items.map((item) => {
                            const isBuy = item.signal.toUpperCase().includes('BUY');
                            const cleanSymbol = item.tickerSymbol.replace('.CA', '');
                            const regime = getRegimeBadge(item.rotationRegime);

                            return (
                              <div
                                key={item.id}
                                className="py-2 px-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors group cursor-default border-b border-white/[0.06] last:border-b-0"
                              >
                                {/* Left: Logo + Text Stack */}
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                  <TickerLogo
                                    symbol={item.tickerSymbol}
                                    companyName={item.companyName}
                                    logoUrl={item.logoUrl}
                                  />

                                  <div className="min-w-0 flex-1">
                                    {/* Company name */}
                                    <div className="text-[12px] font-medium text-white truncate max-w-[170px] sm:max-w-[220px] group-hover:text-brand-blue-light transition-colors leading-tight">
                                      {item.companyName ?? cleanSymbol}
                                    </div>

                                    {/* Sub-line: Ticker pill + sector · regime */}
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap leading-none">
                                      <span className="inline-flex items-center px-1 py-0.2 rounded text-[9.5px] font-semibold bg-white/[0.06] text-white/90 border border-white/[0.08] uppercase tracking-wider font-sans">
                                        {cleanSymbol}
                                      </span>
                                      {item.industryGroup && (
                                        <span className="text-[10px] text-text-muted truncate max-w-[110px]">
                                          {item.industryGroup}
                                        </span>
                                      )}
                                      {item.rotationRegime && (
                                        <span className={`text-[10px] font-semibold ${regime.cls}`}>
                                          · {regime.label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Time stack + compact action buttons */}
                                <div className="flex items-center gap-2 shrink-0 pl-1.5">
                                  {/* Compact Time + Date */}
                                  <div className="text-right leading-tight hidden xs:block sm:block">
                                    <div className="text-[11px] font-medium text-white tabular-nums">
                                      {formatTimeAgo(item.sentAt)}
                                    </div>
                                    <div className="text-[9.5px] text-text-muted tabular-nums mt-0.5">
                                      {item.signalDate}
                                    </div>
                                  </div>

                                  {/* Chart Icon Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      router.push(`/charts?ticker=${cleanSymbol}&strategy=${item.strategy || 'psi'}`);
                                    }}
                                    title="Open Chart"
                                    className="w-6.5 h-6.5 rounded flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
                                  >
                                    <BarChart2 size={14} />
                                  </button>

                                  {/* Buy / Sell Pill Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openOrderModal(item);
                                    }}
                                    className={`w-[54px] h-6 rounded text-[10.5px] font-bold text-white shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center active:scale-95 ${
                                      isBuy
                                        ? 'bg-profit-chart hover:brightness-110'
                                        : 'bg-loss-chart hover:brightness-110'
                                    }`}
                                  >
                                    {isBuy ? 'Buy' : 'Sell'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // System Logs tab — sleek compact rows
                  isLoadingLogs && systemLogs.length === 0 ? (
                    <div className="py-20 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin text-text-muted" />
                      <span className="text-xs text-text-secondary">Loading system logs...</span>
                    </div>
                  ) : systemLogs.length === 0 ? (
                    <div className="py-24 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2.5 px-6">
                      <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-muted mb-1">
                        <Clock size={18} />
                      </div>
                      <span className="font-semibold text-white text-sm block font-sans">No system logs</span>
                      <span className="text-xs text-text-muted block leading-relaxed max-w-xs font-sans">
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
                            className="py-2 px-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors group cursor-pointer border-b border-white/[0.06] last:border-b-0"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                              <div className="w-7 h-7 rounded-full bg-black border border-white/10 flex items-center justify-center shrink-0 shadow-xs">
                                {isError ? (
                                  <AlertCircle size={13} className="text-loss-chart" />
                                ) : isWarning ? (
                                  <AlertCircle size={13} className="text-accent-amber" />
                                ) : (
                                  <CheckCircle2 size={13} className="text-profit-chart" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-medium text-white truncate max-w-[200px] sm:max-w-[260px] leading-tight">
                                  {log.message}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                                  <span className="inline-flex items-center px-1 py-0.2 rounded text-[9.5px] font-semibold bg-white/[0.06] text-text-secondary border border-white/[0.08] uppercase tracking-wider font-sans">
                                    {formatUiLabel(log.source)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 pl-1.5">
                              <div className="text-right leading-tight">
                                <div className="text-[11px] font-medium text-white tabular-nums">
                                  {formatTimeAgo(log.createdAt)}
                                </div>
                                <div className="text-[9.5px] text-text-muted font-medium tabular-nums mt-0.5">
                                  {log.level}
                                </div>
                              </div>

                              <div className="w-[54px] shrink-0 flex justify-end">
                                <div
                                  className={`w-[54px] h-6 rounded text-[10px] font-bold text-white shadow-xs flex items-center justify-center ${
                                    isError
                                      ? 'bg-loss-chart'
                                      : isWarning
                                      ? 'bg-accent-amber'
                                      : 'bg-white/[0.06] text-text-secondary border border-white/[0.08]'
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

      {/* Add / Sell Position Modal — mounted outside drawer */}
      <AddOrderModal
        isOpen={orderModalOpen}
        onClose={() => { setOrderModalOpen(false); setOrderInitialData(null); }}
        onSuccess={() => { setOrderModalOpen(false); setOrderInitialData(null); }}
        initialData={orderInitialData}
        mode="live"
        brokerageAccounts={brokerageAccounts}
        entrySource="COMMAND_CENTER"
      />
    </>
  );
}
