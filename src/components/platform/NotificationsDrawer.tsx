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
  ExternalLink,
  Radio,
} from '@/components/ui/icon-library';
import TicknalBrand from '@/components/ui/TicknalBrand';
import { cn } from '@/lib/utils';
import { formatUiLabel } from '@/lib/format-ui-label';
import AddOrderModal, { type InitialOrderData, type BrokerageAccountOption } from '@/components/platform/AddOrderModal';
import InlineSpinner from '@/components/ui/InlineSpinner';
import Skeleton from '@/components/ui/Skeleton';
import { useTranslation } from '@/lib/i18n';
import type { MarketNewsItemDTO } from '@/lib/news/news-service';
import { resolveSourceMeta, TRADINGVIEW_LOGOS } from '@/lib/news/source-meta';

function getLocalizedNewsText(item: MarketNewsItemDTO, isAr: boolean): { title: string; summary: string } {
  const title = (isAr && item.content ? item.content : item.title) || item.title;
  let summary = item.summary || '';
  const parts = summary.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const isFirstArabic = /[\u0600-\u06FF]/.test(parts[0]);
    if (isAr) {
      summary = isFirstArabic ? parts[0] : parts[1];
    } else {
      summary = isFirstArabic ? parts[1] : parts[0];
    }
  }
  return { title, summary };
}

export type SignalNotificationItem = {
  id: number;
  tickerSymbol: string;
  signalDate: string;
  signal: string;
  strategy?: string | null;
  strategyName?: string | null;
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
  isTake,
}: {
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
  isTake?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const cleanSymbol = symbol.replace('.CA', '');
  const initial = companyName
    ? companyName.trim().charAt(0).toUpperCase()
    : cleanSymbol.charAt(0).toUpperCase();

  if (isTake || cleanSymbol === 'TICKNAL') {
    return (
      <div className="w-7 h-7 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
        <TicknalBrand href={null} showIcon={true} showText={false} iconSize={15} />
      </div>
    );
  }

  return (
    <div className="w-7 h-7 rounded-full bg-plt-base border border-plt-border flex items-center justify-center font-bold text-[10px] text-plt-text shrink-0 overflow-hidden shadow-xs">
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
  const [activeTab, setActiveTab] = useState<'signals' | 'news'>('signals');
  const [selectedRegime, setSelectedRegime] = useState<'all' | 'Leading' | 'Improving' | 'Weakening' | 'Lagging'>('all');
  const [isRegimeMenuOpen, setIsRegimeMenuOpen] = useState(false);
  const regimeMenuRef = useRef<HTMLDivElement>(null);

  const { data: newsData, isLoading: isLoadingNews } = useSWR<{
    items: MarketNewsItemDTO[];
    total: number;
  }>(isOpen ? '/api/news?min_urgency=8&limit=100' : null, fetcher, {
    refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 60000,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const urgentNews = useMemo(() => {
    const list = newsData?.items ?? [];
    return [...list].sort((a, b) => {
      const timeDiff = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      if (Math.abs(timeDiff) < 60000) {
        return (b.urgencyScore ?? 5) - (a.urgencyScore ?? 5);
      }
      return timeDiff;
    });
  }, [newsData?.items]);

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

  const groupedNews = useMemo(() => {
    const groups: { label: string; dateKey: string; items: MarketNewsItemDTO[] }[] = [];
    const seen = new Map<string, number>();

    for (const item of urgentNews) {
      const key = item.publishedAt.split('T')[0];
      if (seen.has(key)) {
        groups[seen.get(key)!].items.push(item);
      } else {
        seen.set(key, groups.length);
        groups.push({
          label: formatGroupLabel(item.publishedAt, isAr, sceneClock),
          dateKey: key,
          items: [item],
        });
      }
    }
    return groups;
  }, [urgentNews, isAr, sceneClock]);

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
              className="fixed inset-0 bg-plt-overlay backdrop-blur-xs"
            />

            {/* Drawer Panel — sleek executive width */}
            <motion.div
              initial={{ x: isRTL ? '-100%' : '100%' }}
              data-hero-drawer="alerts"
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative z-modal-content drawer-sheet-viewport-safe w-full sm:max-w-md md:max-w-lg bg-plt-base text-plt-text border-l rtl:border-l-0 rtl:border-r border-plt-border shadow-2xl flex flex-col min-h-0 overflow-hidden rounded-none"
            >
              {/* 1. Header — compact sleek row */}
              <div className="px-4 py-2.5 border-b border-plt-border bg-plt-base flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-sm font-bold text-plt-text tracking-tight font-sans truncate">
                    {isAr ? 'الإشعارات والتنبيهات' : t('nav.notifications')}
                  </h2>
                  {sceneNotifications && (
                    <span className="text-[9px] font-medium text-plt-muted shrink-0">
                      {isAr ? 'عرض توضيحي' : 'Illustrative'}
                    </span>
                  )}
                  {(activeTab === 'signals' ? notifications.length : urgentNews.length) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-plt-hover border border-plt-border text-plt-text tabular-nums shrink-0">
                      {activeTab === 'signals' ? notifications.length : urgentNews.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeTab === 'signals' && notifications.length > 0 && !sceneNotifications && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      disabled={isClearing}
                      className="px-2 py-1 rounded text-[11px] font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors cursor-pointer flex items-center gap-1"
                      title={isAr ? 'مسح كافة الإشعارات' : 'Clear all notifications'}
                    >
                      {isClearing ? <InlineSpinner className="h-3 w-3" label={isAr ? 'جارٍ مسح التنبيهات' : 'Clearing notifications'} /> : (isAr ? 'مسح الكل' : 'Clear all')}
                    </button>
                  )}
                  <button
                    type="button"
                    data-hero-action="close-alerts"
                    onClick={onClose}
                    className="p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-md transition-colors cursor-pointer"
                    title={isAr ? 'إغلاق (Esc)' : 'Close (Esc)'}
                    aria-label={isAr ? 'إغلاق الإشعارات' : 'Close notifications'}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* 2. Compact Toolbar: Switcher (Signals vs News) + Context Filter */}
              <div className="px-3.5 py-1.5 border-b border-plt-border bg-plt-base shrink-0 flex items-center justify-between gap-2">
                {/* Switcher: Signals vs Urgent News */}
                <div className="seg-control h-7 p-0.5 bg-plt-hover/60 border border-plt-border rounded-lg inline-flex">
                  <button
                    type="button"
                    onClick={() => setActiveTab('signals')}
                    className={cn(
                      'seg-control-btn h-full px-2.5 py-0 text-[11px] font-sans rounded-md transition-all flex items-center gap-1.5 cursor-pointer',
                      activeTab === 'signals'
                        ? 'active bg-plt-base text-plt-text font-semibold shadow-xs'
                        : 'text-plt-muted hover:text-plt-text'
                    )}
                  >
                    <span>{isAr ? 'الإشارات' : 'Signals'}</span>
                    {notifications.length > 0 && (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[9.5px] tabular-nums font-medium',
                          activeTab === 'signals' ? 'bg-plt-hover text-plt-text' : 'bg-white/[0.04] text-plt-muted'
                        )}
                      >
                        {notifications.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('news')}
                    className={cn(
                      'seg-control-btn h-full px-2.5 py-0 text-[11px] font-sans rounded-md transition-all flex items-center gap-1.5 cursor-pointer',
                      activeTab === 'news'
                        ? 'active bg-plt-base text-plt-text font-semibold shadow-xs'
                        : 'text-plt-muted hover:text-plt-text'
                    )}
                  >
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span>{isAr ? 'الأخبار العاجلة' : 'News'}</span>
                    </span>
                    {urgentNews.length > 0 && (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[9.5px] tabular-nums font-bold',
                          activeTab === 'news'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-white/[0.04] text-plt-muted'
                        )}
                      >
                        {urgentNews.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Contextual filter on right */}
                {activeTab === 'signals' ? (
                  notifications.length > 0 && (
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
                          : 'bg-plt-hover/50 border-plt-border text-plt-muted hover:text-plt-text hover:border-plt-border-strong'
                          }`}
                        >
                          <span className="truncate max-w-[90px]">{activeRegimeLabel}</span>
                          <ChevronDown size={11} className={`text-plt-muted transition-transform duration-150 ${isRegimeMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isRegimeMenuOpen && (
                          <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1.5 w-44 rounded-xl bg-plt-base border border-plt-border p-1 shadow-2xl z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                            {regimeOptions.map((reg) => {
                              const isSel = selectedRegime === reg.id;
                              return (
                                <button
                                  key={reg.id}
                                  type="button"
                                  onClick={() => { setSelectedRegime(reg.id as typeof selectedRegime); setIsRegimeMenuOpen(false); }}
                                  className={`px-2.5 py-1.5 rounded-lg text-left rtl:text-right text-[11px] font-sans transition flex items-center justify-between cursor-pointer ${
                                    isSel
                                      ? 'bg-plt-active text-plt-text font-semibold'
                                      : 'text-plt-subtle hover:text-plt-text hover:bg-plt-hover'
                                  }`}
                                >
                                  <span className="truncate">{reg.label}</span>
                                  <span className={`px-1 rounded text-[9.5px] tabular-nums ${
                                    isSel ? 'text-plt-text font-bold' : 'text-plt-muted'
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
                          className="h-6 w-6 rounded-md border border-plt-border bg-plt-hover/50 flex items-center justify-center text-plt-muted hover:text-loss-chart hover:border-loss-chart/40 transition-colors cursor-pointer"
                          title={isAr ? 'إعادة ضبط التصفية' : 'Reset filter'}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] border border-white/[0.08] text-plt-muted tabular-nums">
                      {isAr ? 'عاجل (٨+ من ١٠)' : 'Urgent (8+ / 10)'}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Main Scrollable List — compact high-density design */}
              <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar">
                {activeTab === 'signals' ? (
                  isLoadingSignals && notifications.length === 0 ? (
                    <div className="divide-y divide-white/[0.06]">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="py-2.5 px-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Skeleton className="w-8 h-8 rounded-none shrink-0" />
                            <div className="space-y-1.5 flex-1">
                              <Skeleton className="h-3.5 w-28 sm:w-36 rounded-none" />
                              <div className="flex items-center gap-1.5">
                                <Skeleton className="h-2.5 w-10 rounded-none" />
                                <Skeleton className="h-2.5 w-16 rounded-none" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-3 w-12 rounded-none" />
                            <Skeleton className="h-6 w-14 rounded-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-24 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2.5 px-6">
                      <div className="w-10 h-10 rounded-full bg-plt-hover border border-plt-border flex items-center justify-center text-plt-muted mb-1">
                        <Bell size={18} />
                      </div>
                      <span className="font-semibold text-plt-text text-sm block font-sans">{isAr ? 'لا توجد تنبيهات بعد' : 'No notifications yet'}</span>
                      <span className="text-xs text-plt-muted block leading-relaxed max-w-xs font-sans">
                        {isAr
                          ? 'ستظهر هنا إشارات الشراء والبيع أو وقف الخسارة للأسهم وقوائم المتابعة فور حدوثها.'
                          : 'New buy, sell, or stop triggers on your watched stocks and holdings will appear here in real-time.'}
                      </span>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="py-20 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2.5 px-6">
                      <span className="font-semibold text-plt-text text-xs block font-sans">{isAr ? 'لا توجد إشارات مطابقة' : 'No matching signals'}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRegime('all')}
                        className="mt-1 px-3 py-1 text-xs font-sans rounded-md bg-plt-hover hover:bg-plt-active border border-plt-border text-plt-text transition cursor-pointer"
                      >
                        {isAr ? `إعادة ضبط التصفية وعرض الكل (${notifications.length})` : `Reset filter & view all (${notifications.length})`}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {groupedNotifications.map((group) => (
                        <div key={group.dateKey}>
                          {/* Date group sticky header with subtle gradient indicator */}
                          <div className="px-3.5 py-1 flex items-center justify-between sticky top-0 z-10 bg-plt-base/95 backdrop-blur-md border-b border-plt-border-soft">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-3 rounded-full bg-gradient-to-b from-[#00BCE6] via-[#2962FF] to-[#D500F9] shrink-0" />
                              <span className="text-[10px] font-bold text-plt-text uppercase tracking-widest font-sans">
                                {formatGroupLabel(group.dateKey, isAr, sceneClock)}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-plt-muted tabular-nums px-1.5 py-0.2 rounded-full bg-plt-hover border border-plt-border-soft">
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
                                className="py-2 px-3.5 flex items-center justify-between hover:bg-plt-hover transition-colors group cursor-default border-b border-plt-border-soft last:border-b-0"
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
                                    <div className="text-[12px] font-medium text-plt-text truncate max-w-[170px] sm:max-w-[220px] group-hover:text-brand-blue-light transition-colors leading-tight">
                                      {item.companyName ?? cleanSymbol}
                                    </div>

                                    {/* Sub-line: Ticker pill + sector · regime */}
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap leading-none">
                                      <span className="inline-flex items-center px-1 py-0.2 rounded text-[9.5px] font-semibold bg-plt-hover text-plt-text border border-plt-border uppercase tracking-wider font-sans">
                                        {cleanSymbol}
                                      </span>
                                      {item.industryGroup && (
                                        <span className="text-[10px] text-plt-muted truncate max-w-[110px]">
                                          {item.industryGroup}
                                        </span>
                                      )}
                                      {item.strategy?.startsWith('custom-') && item.strategyName && <span className="text-[10px] text-plt-muted truncate max-w-[130px]">· {item.strategyName}</span>}
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
                                    <div className="text-[10px] font-medium text-plt-text tabular-nums whitespace-nowrap">
                                      {formatSignalAge(item, isAr)}
                                    </div>
                                    <div className="text-[9.5px] text-plt-muted tabular-nums mt-0.5">
                                      {item.signalDate.split('T')[0]}
                                    </div>
                                  </div>

                                  {/* Chart Icon Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      const canonicalStrat =
                                        item.strategy === 'psi'
                                          ? 'typhon'
                                          : item.strategy === 'psi_v2' || item.strategy === 'psiv2'
                                            ? 'cerberus'
                                            : item.strategy || 'typhon';
                                      router.push(item.strategy?.startsWith('custom-')
                                        ? `/strategies?strategy=${encodeURIComponent(item.strategy)}&ticker=${encodeURIComponent(item.tickerSymbol)}`
                                        : `/charts?ticker=${cleanSymbol}&strategy=${canonicalStrat}`);
                                    }}
                                    title={item.strategy?.startsWith('custom-') ? (isAr ? 'فتح الاستراتيجية' : 'Open strategy') : (isAr ? 'فتح الرسم البياني' : 'Open Chart')}
                                    className="w-6.5 h-6.5 rounded flex items-center justify-center text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors cursor-pointer shrink-0"
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
                  )
                ) : (
                  /* Urgent News View */
                  isLoadingNews && urgentNews.length === 0 ? (
                    <div className="divide-y divide-white/[0.06]">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="py-3 px-3.5 flex items-start gap-3">
                          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-3 w-24 rounded-none" />
                            <Skeleton className="h-4 w-4/5 rounded-none" />
                            <Skeleton className="h-3 w-full rounded-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : urgentNews.length === 0 ? (
                    <div className="py-24 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2.5 px-6">
                      <div className="w-10 h-10 rounded-full bg-plt-hover border border-plt-border flex items-center justify-center text-plt-muted mb-1">
                        <Radio size={18} />
                      </div>
                      <span className="font-semibold text-plt-text text-sm block font-sans">
                        {isAr ? 'لا توجد أخبار عاجلة حالياً' : 'No urgent news right now'}
                      </span>
                      <span className="text-xs text-plt-muted block leading-relaxed max-w-xs font-sans">
                        {isAr
                          ? 'ستظهر هنا الإفصاحات والتحليلات العاجلة ذات الأثر العالي في السوق (المسجلة 8+ من 10) فور صدورها.'
                          : 'High-impact market disclosures and breaking analyses scored 8+ out of 10 by Ticknal AI will appear here in real time.'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      {groupedNews.map((group) => (
                        <div key={group.dateKey}>
                          {/* Date group sticky header with subtle rose gradient indicator */}
                          <div className="px-3.5 py-1 flex items-center justify-between sticky top-0 z-10 bg-plt-base/95 backdrop-blur-md border-b border-plt-border-soft">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-3 rounded-full bg-gradient-to-b from-[#ff007a] via-[#e11d48] to-[#f43f5e] shrink-0" />
                              <span className="text-[10px] font-bold text-plt-text uppercase tracking-widest font-sans">
                                {formatGroupLabel(group.dateKey, isAr, sceneClock)}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-plt-muted tabular-nums px-1.5 py-0.2 rounded-full bg-plt-hover border border-plt-border-soft font-medium">
                              {group.items.length} {isAr ? 'عاجل' : 'urgent'}
                            </span>
                          </div>

                          {group.items.map((item) => {
                            const meta = resolveSourceMeta(item);
                            const isTake = meta.isTicknalTake || item.category === 'ticknal_take' || item.id.startsWith('take-');
                            const { title, summary } = getLocalizedNewsText(item, isAr);
                            const displayName = isTake ? (isAr ? 'نبض تكنال' : 'Ticknal take') : meta.name;

                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  onClose();
                                  router.push(`/news?item=${encodeURIComponent(item.id)}`);
                                }}
                                className="py-2.5 px-3.5 flex items-start justify-between hover:bg-plt-hover transition-colors group cursor-pointer border-b border-plt-border-soft last:border-b-0 gap-3"
                              >
                                {/* Left: Ticker Avatar & Content Stack */}
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <TickerLogo
                                    symbol={meta.handle.replace(/^@/, '')}
                                    companyName={displayName}
                                    logoUrl={meta.avatarUrl}
                                    isTake={isTake}
                                  />

                                  <div className="min-w-0 flex-1">
                                    {/* Top line: Full Company / Poster Name (no background pill) + Verified + Handle · Time */}
                                    <div className="flex items-center gap-1.5 min-w-0 leading-none mb-1 flex-wrap">
                                      <span className="font-semibold text-plt-text text-[12px] truncate max-w-[190px] sm:max-w-[240px]">
                                        {displayName}
                                      </span>

                                      {meta.verified && (
                                        <svg
                                          viewBox="0 0 22 22"
                                          aria-label="Verified"
                                          className="w-3 h-3 text-[#1d9bf0] fill-current shrink-0"
                                        >
                                          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274.1084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.136 2.136 5.477-5.477 1.294 1.294-6.771 6.777z" />
                                        </svg>
                                      )}

                                      <span className="text-[11px] text-plt-muted truncate">
                                        {meta.handle}
                                      </span>

                                      <span className="text-plt-muted text-[10px]">·</span>

                                      <span className="text-[10.5px] text-plt-muted tabular-nums shrink-0">
                                        {formatTimeAgo(item.publishedAt, isAr, sceneClock)}
                                      </span>
                                    </div>

                                    {/* Title / Headline */}
                                    <h4 className="text-[12px] font-medium text-plt-text group-hover:text-brand-blue-light transition-colors leading-snug line-clamp-2 font-sans">
                                      {title}
                                    </h4>

                                    {/* Summary Snippet */}
                                    {summary && (
                                      <p className="text-[11px] text-plt-muted line-clamp-2 leading-relaxed mt-1 font-sans">
                                        {summary}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Clean Urgency Score (Simplified Desk) */}
                                <div className="flex items-center shrink-0 self-center">
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums font-sans text-plt-text/80 bg-white/[0.04] border border-white/[0.08]"
                                    title={isAr ? `درجة الأهمية: ${item.urgencyScore} من 10` : `Importance: ${item.urgencyScore}/10`}
                                  >
                                    {item.urgencyScore}/10
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Drawer footer link to system console or news feed */}
              <div className="px-4 py-2.5 border-t border-plt-border bg-plt-base flex justify-between items-center text-[11px] text-plt-muted shrink-0">
                <span>
                  {activeTab === 'news'
                    ? (isAr ? 'نظام التحليل الإخباري' : 'Ticknal News Intelligence')
                    : (isAr ? 'نظام إشارات تكنال' : 'Ticknal Signal Intelligence')}
                </span>
                {activeTab === 'news' ? (
                  <Link
                    href="/news"
                    onClick={onClose}
                    className="hover:text-plt-text transition-colors flex items-center gap-1 font-medium"
                  >
                    <span>{isAr ? 'شريط الأخبار والإفصاحات' : 'Full Market News Feed'}</span>
                    <span className="text-[10px]">↗</span>
                  </Link>
                ) : (
                  <Link
                    href="/console/operations"
                    onClick={onClose}
                    className="hover:text-plt-text transition-colors flex items-center gap-1 font-medium"
                  >
                    <span>{isAr ? 'مركز العمليات والمهام' : 'Platform Operations'}</span>
                    <span className="text-[10px]">↗</span>
                  </Link>
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
        previewOnly={Boolean(sceneNotifications)}
      />
    </>
  );
}
