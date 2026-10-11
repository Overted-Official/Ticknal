'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  ChevronDown,
} from '@/components/ui/icon-library';
import { formatUiLabel } from '@/lib/format-ui-label';
import AddOrderModal, { type InitialOrderData, type BrokerageAccountOption } from '@/components/platform/AddOrderModal';
import InlineSpinner from '@/components/ui/InlineSpinner';
import SectionLoadingState from '@/components/ui/SectionLoadingState';
import { useTranslation } from '@/lib/i18n';

export type SignalNotificationItem = {
  id: number;
  tickerSymbol: string;
  signalDate: string;
  signal: string;
  strategy?: string | null;
  signalBarsAgo?: number | null;
  dataAsOf?: string | null;
  sentAt: string;
  companyName?: string | null;
  logoUrl?: string | null;
  referencePrice?: number | null;
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
function formatGroupLabel(dateStr: string, isAr = false, referenceDate?: Date): string {
  try {
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const d = year && month && day
      ? new Date(year, month - 1, day)
      : new Date(dateStr);
    const now = referenceDate ?? new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

    if (diffDays === 0) return isAr ? 'اليوم' : 'Today';
    if (diffDays === 1) return isAr ? 'أمس' : 'Yesterday';
    if (diffDays < 7) return isAr ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
    return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatSignalAge(item: SignalNotificationItem, isAr = false): string {
  if (typeof item.signalBarsAgo === 'number') {
    if (item.signalBarsAgo === 0) return isAr ? 'أحدث جلسة' : 'Latest session';
    if (item.signalBarsAgo === 1) return isAr ? 'منذ جلسة واحدة' : '1 session ago';
    return isAr ? `منذ ${item.signalBarsAgo} جلسات` : `${item.signalBarsAgo} sessions ago`;
  }

  return formatGroupLabel(item.signalDate, isAr);
}

function formatTimeAgo(dateStr: string, isAr = false, referenceDate?: Date): string {
  try {
    const d = new Date(dateStr);
    const now = referenceDate ?? new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return isAr ? 'الآن' : 'Just now';
    if (diffMin < 60) return isAr ? `منذ ${diffMin} د` : `${diffMin}m ago`;
    if (diffHours < 24) return isAr ? `منذ ${diffHours} س` : `${diffHours}h ago`;
    if (diffDays === 1) return isAr ? 'أمس' : 'Yesterday';
    if (diffDays < 7) return isAr ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;
    return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
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

function getRegimeBadge(regime?: string | null, isAr = false): { label: string; cls: string } {
  if (regime === 'Leading')   return { label: isAr ? 'متصدر' : 'Leading',   cls: 'text-emerald-300' };
  if (regime === 'Improving') return { label: isAr ? 'متحسن' : 'Improving', cls: 'text-sky-300' };
  if (regime === 'Weakening') return { label: isAr ? 'ضعيف' : 'Weakening', cls: 'text-amber-300' };
  return                               { label: isAr ? 'متأخر' : 'Lagging',   cls: 'text-rose-300' };
}

export default function NotificationsDrawer({
  isOpen,
  onClose,
  sceneNotifications,
}: {
  isOpen: boolean;
  onClose: () => void;
  sceneNotifications?: SignalNotificationItem[];
}) {
  const router = useRouter();
  const { t, locale, isRTL } = useTranslation();
  const isAr = locale === 'ar';
  const sceneClock = sceneNotifications ? new Date('2026-10-10T18:30:00Z') : undefined;
  const activeTab = 'signals';
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
  }>(isOpen && !sceneNotifications ? '/api/notifications' : null, fetcher, {
    refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 60000,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    isPaused: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  });

  const notifications = useMemo(() => {
    const list = sceneNotifications ?? signalsData?.notifications ?? [];
    return [...list].sort((a, b) => {
      const dateCompare = b.signalDate.localeCompare(a.signalDate);
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    });
  }, [sceneNotifications, signalsData?.notifications]);

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

  /** Group notifications by the session that produced the signal. */
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; dateKey: string; items: SignalNotificationItem[] }[] = [];
    const seen = new Map<string, number>();

    for (const item of filteredNotifications) {
      const key = item.signalDate.split('T')[0];
      if (seen.has(key)) {
        groups[seen.get(key)!].items.push(item);
      } else {
        seen.set(key, groups.length);
        groups.push({ label: formatGroupLabel(item.signalDate, isAr, sceneClock), dateKey: key, items: [item] });
      }
    }
    return groups;
  }, [filteredNotifications, isAr, sceneClock]);

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
      date: sceneNotifications ? item.signalDate.split('T')[0] : undefined,
      price: sceneNotifications ? item.referencePrice ?? undefined : undefined,
    });
    setOrderModalOpen(true);

    if (!sceneNotifications && brokerageAccounts.length === 0 && !isLoadingAccounts) {
      setIsLoadingAccounts(true);
      try {
        const res = await fetch('/api/banks/accounts');
        if (res.ok) {
          const data = await res.json();
          const brokerList = (data.accounts ?? []).filter(
            (a: any) => !a.isArchived && ['BROKERAGE', 'BROKER_CASH'].includes(a.accountType)
          );
          setBrokerageAccounts(brokerList);
        }
      } catch { /* silently fall back to empty list */ }
      finally { setIsLoadingAccounts(false); }
    }
  };

  const regimeOptions = [
    { id: 'all',       label: isAr ? 'كافة المسارات' : 'All Regimes', count: regimeCounts.all },
    { id: 'Leading',   label: isAr ? 'متصدر' : 'Leading',     count: regimeCounts.Leading },
    { id: 'Improving', label: isAr ? 'متحسن' : 'Improving',   count: regimeCounts.Improving },
    { id: 'Weakening', label: isAr ? 'ضعيف' : 'Weakening',   count: regimeCounts.Weakening },
    { id: 'Lagging',   label: isAr ? 'متأخر' : 'Lagging',     count: regimeCounts.Lagging },
  ];

  const activeRegimeLabel = selectedRegime === 'all'
    ? (isAr ? 'المسار: الكل' : 'Regime: All')
    : (isAr ? (selectedRegime === 'Leading' ? 'متصدر' : selectedRegime === 'Improving' ? 'متحسن' : selectedRegime === 'Weakening' ? 'ضعيف' : 'متأخر') : selectedRegime);
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
              initial={{ x: isRTL ? '-100%' : '100%' }}
              data-hero-drawer="alerts"
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative z-modal-content drawer-sheet-viewport-safe w-full sm:max-w-md md:max-w-lg bg-black text-plt-text border-l rtl:border-l-0 rtl:border-r border-border-default shadow-2xl flex flex-col min-h-0 overflow-hidden rounded-none"
            >
              {/* 1. Header — compact sleek row */}
              <div className="px-4 py-2.5 border-b border-border-default bg-black flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-sm font-bold text-white tracking-tight font-sans truncate">
                    {isAr ? 'الإشعارات والتنبيهات' : t('nav.notifications')}
                  </h2>
                  {sceneNotifications && (
                    <span className="text-[9px] font-medium text-white/45 shrink-0">
                      {isAr ? 'عرض توضيحي' : 'Illustrative'}
                    </span>
                  )}
                  {notifications.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/[0.06] border border-white/10 text-white tabular-nums shrink-0">
                      {notifications.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeTab === 'signals' && notifications.length > 0 && !sceneNotifications && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      disabled={isClearing}
                      className="px-2 py-1 rounded text-[11px] font-medium text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center gap-1"
                      title={isAr ? 'مسح كافة الإشعارات' : 'Clear all notifications'}
                    >
                      {isClearing ? <InlineSpinner className="h-3 w-3" label={isAr ? 'جارٍ مسح التنبيهات' : 'Clearing notifications'} /> : (isAr ? 'مسح الكل' : 'Clear all')}
                    </button>
                  )}
                  <button
                    type="button"
                    data-hero-action="close-alerts"
                    onClick={onClose}
                    className="p-1.5 text-text-muted hover:text-white hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
                    title={isAr ? 'إغلاق (Esc)' : 'Close (Esc)'}
                    aria-label={isAr ? 'إغلاق الإشعارات' : 'Close notifications'}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* 2. Compact Toolbar: Micro-Tab Switcher + Inline Regime Filter */}
              <div className="px-3.5 py-1.5 border-b border-border-default bg-black shrink-0 flex items-center justify-between gap-2">
                {/* Alert count indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-white">
                    {isAr ? 'إشارات وتنبيهات التداول' : 'Trading Alerts'}
                  </span>
                  {notifications.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[9.5px] tabular-nums bg-white/[0.08] text-zinc-300 font-medium">
                      {notifications.length}
                    </span>
                  )}
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
                        <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1.5 w-44 rounded-xl bg-black border border-border-default p-1 shadow-2xl z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                          {regimeOptions.map((reg) => {
                            const isSel = selectedRegime === reg.id;
                            return (
                              <button
                                key={reg.id}
                                type="button"
                                onClick={() => { setSelectedRegime(reg.id as typeof selectedRegime); setIsRegimeMenuOpen(false); }}
                                className={`px-2.5 py-1.5 rounded-lg text-left rtl:text-right text-[11px] font-sans transition flex items-center justify-between cursor-pointer ${
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
                        title={isAr ? 'إعادة ضبط التصفية' : 'Reset filter'}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Main Scrollable List — compact high-density design */}
              <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar">
                {isLoadingSignals && notifications.length === 0 ? (
                    <SectionLoadingState className="py-20" label={isAr ? 'جارٍ تحميل الإشارات…' : 'Loading signals…'} />
                  ) : notifications.length === 0 ? (
                    <div className="py-24 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2.5 px-6">
                      <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-muted mb-1">
                        <Bell size={18} />
                      </div>
                      <span className="font-semibold text-white text-sm block font-sans">{isAr ? 'لا توجد تنبيهات بعد' : 'No notifications yet'}</span>
                      <span className="text-xs text-text-muted block leading-relaxed max-w-xs font-sans">
                        {isAr
                          ? 'ستظهر هنا إشارات الشراء والبيع أو وقف الخسارة للأسهم وقوائم المتابعة فور حدوثها.'
                          : 'New buy, sell, or stop triggers on your watched stocks and holdings will appear here in real-time.'}
                      </span>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="py-20 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2.5 px-6">
                      <span className="font-semibold text-white text-xs block font-sans">{isAr ? 'لا توجد إشارات مطابقة' : 'No matching signals'}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRegime('all')}
                        className="mt-1 px-3 py-1 text-xs font-sans rounded-md bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white transition cursor-pointer"
                      >
                        {isAr ? `إعادة ضبط التصفية وعرض الكل (${notifications.length})` : `Reset filter & view all (${notifications.length})`}
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
                                {formatGroupLabel(group.dateKey, isAr, sceneClock)}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-text-muted tabular-nums px-1.5 py-0.2 rounded-full bg-white/[0.04] border border-white/[0.06]">
                              {group.items.length}
                            </span>
                          </div>

                          {group.items.map((item) => {
                            const isBuy = item.signal.toUpperCase().includes('BUY');
                            const cleanSymbol = item.tickerSymbol.replace('.CA', '');
                            const regime = getRegimeBadge(item.rotationRegime, isAr);

                            return (
                              <div
                                key={item.id}
                                className="py-2 px-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors group cursor-default border-b border-white/[0.06] last:border-b-0"
                              >
                                {/* Left: Logo + Text Stack */}
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
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
                                <div className="flex items-center gap-2 shrink-0 pl-1.5 rtl:pl-0 rtl:pr-1.5">
                                  {/* Compact Time + Date */}
                                  <div
                                    className="text-right rtl:text-left leading-tight shrink-0 max-w-[78px]"
                                    title={isAr ? `تم الإرسال ${formatTimeAgo(item.sentAt, isAr, sceneClock)}` : `Delivered ${formatTimeAgo(item.sentAt, false, sceneClock)}`}
                                  >
                                    <div className="text-[10px] font-medium text-white tabular-nums whitespace-nowrap">
                                      {formatSignalAge(item, isAr)}
                                    </div>
                                    <div className="text-[9.5px] text-text-muted tabular-nums mt-0.5">
                                      {item.signalDate.split('T')[0]}
                                    </div>
                                  </div>

                                  {/* Chart Icon Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      router.push(`/charts?ticker=${cleanSymbol}&strategy=${item.strategy || 'psi'}`);
                                    }}
                                    title={isAr ? 'فتح الرسم البياني' : 'Open Chart'}
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
                                    {isBuy ? (isAr ? 'شراء' : 'Buy') : (isAr ? 'بيع' : 'Sell')}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* Drawer footer link to system console */}
              <div className="px-4 py-2.5 border-t border-white/10 bg-black flex justify-between items-center text-[11px] text-zinc-400 shrink-0">
                <span>{isAr ? 'نظام إشارات تكنال' : 'Ticknal Signal Intelligence'}</span>
                <Link
                  href="/console/operations"
                  onClick={onClose}
                  className="hover:text-white transition-colors flex items-center gap-1 font-medium"
                >
                  <span>{isAr ? 'مركز العمليات والمهام' : 'Platform Operations'}</span>
                  <span className="text-[10px]">↗</span>
                </Link>
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
        previewOnly={Boolean(sceneNotifications)}
      />
    </>
  );
}
