'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
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

function TickerLogo({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="w-9 h-9 rounded-full bg-plt-card border border-plt-border-soft shrink-0 flex items-center justify-center overflow-hidden">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="ticker-logo-image ticker-logo-fill"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-xs font-bold font-mono text-plt-text">
          {symbol.replace('.CA', '').slice(0, 2)}
        </span>
      )}
    </div>
  );
}

function normalizeStrategyId(strategy?: string | null): 'psi' | 'psi_v2' | 'thoth' {
  if (!strategy) return 'psi';
  const lower = strategy.toLowerCase();
  if (lower.includes('thoth')) return 'thoth';
  if (lower.includes('psi_v2') || lower.includes('psiv2')) return 'psi_v2';
  return 'psi';
}

function getRegimeBadge(regime?: string | null) {
  if (regime === 'Leading') {
    return {
      label: 'Leading',
      icon: '🟢',
      className: 'bg-plt-profit/15 text-plt-profit border-plt-profit/30',
    };
  }
  if (regime === 'Improving') {
    return {
      label: 'Improving',
      icon: '🔵',
      className: 'bg-plt-info/15 text-plt-info border-plt-info/30',
    };
  }
  if (regime === 'Weakening') {
    return {
      label: 'Weakening',
      icon: '🟡',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
  }
  return {
    label: 'Lagging',
    icon: '🔴',
    className: 'bg-plt-risk/15 text-plt-risk border-plt-risk/30',
  };
}

export default function NotificationsDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'signals' | 'system'>('signals');
  const [selectedStrategy, setSelectedStrategy] = useState<'all' | 'psi' | 'psi_v2' | 'thoth'>('all');
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
    const counts = { all: notifications.length, psi: 0, psi_v2: 0, thoth: 0 };
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative z-10 h-dvh max-h-dvh w-full max-w-md bg-plt-base text-plt-text border-l border-plt-border-soft shadow-2xl flex flex-col min-h-0 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-plt-border-soft bg-plt-card flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-plt-text tracking-tight font-sans">
                    Trade Notifications
                  </h2>
                  {notifications.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-plt-profit/15 text-plt-profit border border-plt-profit/30 font-bold">
                      {notifications.length}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-plt-muted font-sans">
                  Real-time alerts for watchlists & positions
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'signals' && notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="text-[11px] font-medium text-plt-muted hover:text-plt-text px-2 py-1 rounded-lg hover:bg-plt-hover transition-colors cursor-pointer"
                    title="Clear all notifications"
                  >
                    {isClearing ? <Loader2 size={12} className="animate-spin" /> : 'Clear all'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-xl transition cursor-pointer"
                  title="Close notifications"
                  aria-label="Close notifications"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Segmented Tabs */}
            <div className="px-4 py-2.5 border-b border-plt-border-soft bg-plt-card/50 shrink-0">
              <div className="pill-switch w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('signals')}
                  className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${
                    activeTab === 'signals' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  <span>Position Alerts</span>
                  {notifications.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-plt-base border border-plt-border-soft">
                      {notifications.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${
                    activeTab === 'system' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  <span>System Logs</span>
                  {systemLogs.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-plt-base border border-plt-border-soft">
                      {systemLogs.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Strategy & Rotation Filter Rails */}
            {activeTab === 'signals' && notifications.length > 0 && (
              <div className="border-b border-plt-border-soft bg-plt-card/30 flex flex-col divide-y divide-plt-border-soft/60 shrink-0">
                {/* 1. Strategy Rail */}
                <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'All Strategies', count: strategyCounts.all },
                    { id: 'psi', label: 'PSI', count: strategyCounts.psi },
                    { id: 'psi_v2', label: 'PSI V2', count: strategyCounts.psi_v2 },
                    { id: 'thoth', label: 'THOTH', count: strategyCounts.thoth },
                  ].map((tab) => {
                    const isActive = selectedStrategy === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedStrategy(tab.id as any)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-plt-card border border-plt-border-soft text-plt-text font-bold shadow-xs'
                            : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`px-1 py-0.1 rounded text-[10px] font-mono ${
                            isActive
                              ? 'bg-plt-base text-plt-text font-bold border border-plt-border-soft'
                              : 'text-plt-muted bg-plt-base/40'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Industry Rotation Regime Filter */}
                <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] text-plt-muted/70 font-mono uppercase tracking-wider shrink-0 mr-1">
                    Regime:
                  </span>
                  {[
                    { id: 'all', label: 'All Regimes', count: regimeCounts.all },
                    { id: 'alpha', label: '🟢 Alpha Wave', count: regimeCounts.alpha, special: true },
                    { id: 'Leading', label: 'Leading', count: regimeCounts.Leading },
                    { id: 'Improving', label: 'Improving', count: regimeCounts.Improving },
                    { id: 'Weakening', label: 'Weakening', count: regimeCounts.Weakening },
                    { id: 'Lagging', label: 'Lagging', count: regimeCounts.Lagging },
                  ].map((rTab) => {
                    const isActive = selectedRegime === rTab.id;
                    return (
                      <button
                        key={rTab.id}
                        type="button"
                        onClick={() => setSelectedRegime(rTab.id as any)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          isActive
                            ? rTab.id === 'alpha'
                              ? 'bg-plt-profit/20 text-plt-profit border border-plt-profit/40 font-bold shadow-xs'
                              : 'bg-plt-card border border-plt-border-soft text-plt-text font-bold shadow-xs'
                            : rTab.id === 'alpha'
                            ? 'text-plt-profit hover:bg-plt-profit/10 border border-plt-profit/20'
                            : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                        }`}
                      >
                        <span>{rTab.label}</span>
                        <span
                          className={`px-1 py-0.1 rounded text-[9px] font-mono ${
                            isActive
                              ? 'bg-plt-base text-plt-text font-bold border border-plt-border-soft'
                              : 'text-plt-muted bg-plt-base/40'
                          }`}
                        >
                          {rTab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y py-2 custom-scrollbar">
              {activeTab === 'signals' ? (
                isLoadingSignals && notifications.length === 0 ? (
                  <div className="py-20 text-center text-plt-muted text-xs flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-plt-muted" />
                    <span className="font-mono text-[11px]">Loading signals...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-24 text-center text-plt-muted text-xs flex flex-col items-center justify-center gap-2 px-6">
                    <div className="w-10 h-10 rounded-full bg-plt-card border border-plt-border-soft flex items-center justify-center text-plt-muted mb-1">
                      <Bell size={18} />
                    </div>
                    <span className="font-semibold text-plt-text block font-sans">No notifications yet</span>
                    <span className="text-[11px] text-plt-muted block leading-relaxed max-w-xs font-sans">
                      New buy, sell, or stop triggers on your stocks will appear here in real-time.
                    </span>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="py-20 text-center text-plt-muted text-xs flex flex-col items-center justify-center gap-2 px-6">
                    <div className="w-9 h-9 rounded-full bg-plt-card border border-plt-border-soft flex items-center justify-center text-plt-muted mb-1">
                      <Bell size={16} />
                    </div>
                    <span className="font-semibold text-plt-text block font-sans">
                      No {selectedStrategy === 'psi' ? 'PSI' : selectedStrategy === 'psi_v2' ? 'PSI V2' : 'THOTH'} signals
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStrategy('all')}
                      className="mt-1 px-3 py-1 text-[11px] font-mono rounded-lg bg-plt-card hover:bg-plt-hover border border-plt-border-soft text-plt-text transition cursor-pointer"
                    >
                      View all ({notifications.length})
                    </button>
                  </div>
                ) : (
                  <div>
                    {filteredNotifications.map((item, index) => {
                      const isBuy = item.signal.toUpperCase().includes('BUY');
                      const cleanSymbol = item.tickerSymbol.replace('.CA', '');
                      const regime = getRegimeBadge(item.rotationRegime);

                      return (
                        <div key={item.id}>
                          {/* Notification Row */}
                          <div className="px-4 py-3 hover:bg-plt-hover/60 transition-colors flex items-center justify-between gap-3">
                            {/* Left: Avatar + Ticker & Company Name Inline */}
                            <div className="flex items-center gap-3 min-w-0">
                              <TickerLogo symbol={item.tickerSymbol} logoUrl={item.logoUrl} />

                              <div className="flex flex-col min-w-0">
                                <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
                                  <span className="text-xs font-bold font-mono text-plt-text tracking-tight shrink-0">
                                    {cleanSymbol}
                                  </span>
                                  <span className="text-[11px] text-plt-muted truncate font-normal font-sans max-w-[120px]">
                                    {item.companyName ?? cleanSymbol}
                                  </span>
                                  <span className="text-[9px] font-mono text-plt-muted px-1.5 py-0.2 rounded bg-plt-card border border-plt-border-soft shrink-0">
                                    {item.strategy === 'thoth_egx_macro' || item.strategy === 'thoth'
                                      ? 'THOTH'
                                      : item.strategy === 'psi_v2'
                                      ? 'PSI V2'
                                      : 'PSI'}
                                  </span>
                                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border shrink-0 font-medium ${regime.className}`}>
                                    {regime.icon} {regime.label}
                                  </span>
                                </div>

                                <div className="text-[10px] font-mono text-plt-muted mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span>{item.signalDate}</span>
                                  <span className="text-plt-muted/40">•</span>
                                  <span>{formatTimeAgo(item.sentAt)}</span>
                                  {item.industryGroup && (
                                    <>
                                      <span className="text-plt-muted/40">•</span>
                                      <span className="text-plt-muted/70 truncate max-w-[130px]" title={item.industryGroup}>
                                        {item.industryGroup}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Chart Icon Button + Buy/Sell Button */}
                            <div className="flex items-center gap-2 shrink-0">
                              <Link
                                href={`/invest?ticker=${cleanSymbol}&view=chart&strategy=${item.strategy || 'psi'}`}
                                onClick={onClose}
                                className="p-1.5 rounded-lg bg-plt-card hover:bg-plt-hover border border-plt-border-soft text-plt-muted hover:text-plt-text transition"
                                title="Open chart"
                                aria-label={`Open ${cleanSymbol} chart`}
                              >
                                <ArrowUpRight size={14} />
                              </Link>

                              {isBuy ? (
                                <Link
                                  href={`/invest?ticker=${cleanSymbol}&view=chart&strategy=${item.strategy || 'psi'}&positions=1`}
                                  onClick={onClose}
                                  className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-plt-profit/15 hover:bg-plt-profit text-plt-profit hover:text-white border border-plt-profit/30 transition-all text-center shrink-0"
                                  title="Open positions to buy"
                                >
                                  Buy
                                </Link>
                              ) : (
                                <Link
                                  href={`/invest?ticker=${cleanSymbol}&view=chart&strategy=${item.strategy || 'psi'}&positions=1`}
                                  onClick={onClose}
                                  className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-plt-risk/15 hover:bg-plt-risk text-plt-risk hover:text-white border border-plt-risk/30 transition-all text-center shrink-0"
                                  title="Open positions to sell"
                                >
                                  Sell
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Thin separator line */}
                          {index < filteredNotifications.length - 1 && (
                            <div className="h-px bg-plt-border-soft mx-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                isLoadingLogs && systemLogs.length === 0 ? (
                  <div className="py-20 text-center text-plt-muted text-xs flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-plt-muted" />
                    <span className="font-mono text-[11px]">Loading system logs...</span>
                  </div>
                ) : systemLogs.length === 0 ? (
                  <div className="py-24 text-center text-plt-muted text-xs flex flex-col items-center justify-center gap-2 px-6">
                    <div className="w-10 h-10 rounded-full bg-plt-card border border-plt-border-soft flex items-center justify-center text-plt-muted mb-1">
                      <Clock size={18} />
                    </div>
                    <span className="font-semibold text-plt-text block font-sans">No system logs</span>
                    <span className="text-[11px] text-plt-muted block leading-relaxed font-sans">
                      Cron job updates and system status logs will appear here.
                    </span>
                  </div>
                ) : (
                  <div>
                    {systemLogs.map((log, idx) => {
                      const isError = log.level === 'ERROR';
                      const isWarning = log.level === 'WARNING';

                      return (
                        <div key={log.id}>
                          <div className="px-4 py-3 hover:bg-plt-hover/60 transition-colors flex items-start gap-3">
                            {/* Status Icon Circle */}
                            <div className="w-8 h-8 rounded-full bg-plt-card border border-plt-border-soft flex items-center justify-center shrink-0 mt-0.5">
                              {isError ? (
                                <AlertCircle size={15} className="text-plt-risk" />
                              ) : isWarning ? (
                                <AlertCircle size={15} className="text-plt-warning" />
                              ) : (
                                <CheckCircle2 size={15} className="text-plt-profit" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-bold font-mono text-plt-text tracking-tight">
                                  {formatUiLabel(log.source)}
                                </span>
                                <span className="text-[10px] font-mono text-plt-muted shrink-0">
                                  {formatTimeAgo(log.createdAt)}
                                </span>
                              </div>

                              <p className="text-xs text-plt-subtle mt-0.5 break-words font-sans">
                                {log.message}
                              </p>
                            </div>
                          </div>

                          {idx < systemLogs.length - 1 && (
                            <div className="h-px bg-plt-border-soft mx-4" />
                          )}
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
