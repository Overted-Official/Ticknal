'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Trash2, 
  TrendingUp, 
  ArrowUpRight, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2 
} from 'lucide-react';

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
};

export type SystemLogItem = {
  id: number;
  level: string;
  source: string;
  message: string;
  metadata?: any;
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

function getSignalBadge(signal: string) {
  const s = signal.toUpperCase();
  if (s.includes('BUY')) {
    return {
      label: 'BUY TRIGGER',
      className: 'bg-[#22c55e]/10 border-[#22c55e]/25 text-[#22c55e]',
      dot: 'bg-[#22c55e]',
    };
  }
  if (s.includes('TP')) {
    return {
      label: 'TAKE PROFIT',
      className: 'bg-[#00d2ff]/10 border-[#00d2ff]/25 text-[#00d2ff]',
      dot: 'bg-[#00d2ff]',
    };
  }
  if (s.includes('SL') || s.includes('STOP')) {
    return {
      label: 'STOP LOSS',
      className: 'bg-[#ef4444]/10 border-[#ef4444]/25 text-[#ef4444]',
      dot: 'bg-[#ef4444]',
    };
  }
  if (s.includes('TRAIL')) {
    return {
      label: 'TRAIL EXIT',
      className: 'bg-[#f59e0b]/10 border-[#f59e0b]/25 text-[#f59e0b]',
      dot: 'bg-[#f59e0b]',
    };
  }
  return {
    label: s,
    className: 'bg-white/[0.06] border-white/[0.12] text-white/70',
    dot: 'bg-white/50',
  };
}

function TickerLogo({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.09] p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-contain rounded-[3px] bg-transparent"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] font-bold text-white/50 uppercase font-mono">{symbol.slice(0, 2)}</span>
      )}
    </div>
  );
}

export default function NotificationsDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'signals' | 'system'>('signals');

  const { data: signalsData, mutate: mutateSignals, isLoading: isLoadingSignals } = useSWR<{ notifications: SignalNotificationItem[] }>(
    isOpen ? '/api/notifications' : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const { data: logsData, isLoading: isLoadingLogs } = useSWR<{ logs: SystemLogItem[] }>(
    isOpen ? '/api/system-logs' : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const notifications = signalsData?.notifications ?? [];
  const systemLogs = logsData?.logs ?? [];
  const hasErrors = systemLogs.some(l => l.level === 'ERROR');
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

  const handleDeleteItem = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        mutateSignals(
          (prev) => ({
            notifications: (prev?.notifications ?? []).filter((n) => n.id !== id),
          }),
          false
        );
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative z-10 h-full w-full max-w-md bg-[#0a0a0a] border-l border-white/[0.12] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/[0.09] flex items-center justify-between shrink-0 bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-plt-orange">
                  <Bell size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold text-white">Trade Notifications</h2>
                    {notifications.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-plt-orange/20 text-plt-orange border border-plt-orange/30">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/35">Real-time alerts triggered on your watchlists & positions</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {activeTab === 'signals' && notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="px-2 py-1 rounded text-[11px] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                    title="Clear All Notifications"
                  >
                    {isClearing ? <Loader2 size={13} className="animate-spin" /> : 'Clear All'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-2 border-b border-white/[0.06] shrink-0">
              <button
                onClick={() => setActiveTab('signals')}
                className={`flex-1 text-[11px] py-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'signals'
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <span>Position Alerts</span>
                {notifications.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-plt-orange/20 text-plt-orange border border-plt-orange/30">
                    {notifications.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`flex-1 text-[11px] py-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'system'
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <span>System Logs</span>
                {systemLogs.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono border ${
                    hasErrors 
                      ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                      : 'bg-white/[0.06] text-white/50 border-white/[0.09]'
                  }`}>
                    {systemLogs.length}
                  </span>
                )}
              </button>
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-3 space-y-2">
              {activeTab === 'signals' ? (
                isLoadingSignals && notifications.length === 0 ? (
                  <div className="py-20 text-center text-white/30 text-xs flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-plt-orange" />
                    <span>Loading recent signals...</span>
                  </div>
                ) : notifications.length === 0 ? (
                <div className="py-24 text-center text-white/30 text-xs flex flex-col items-center justify-center gap-3 px-6">
                  <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/20">
                    <Bell size={22} />
                  </div>
                  <div>
                    <span className="font-medium text-white/60 block mb-1">No notifications yet</span>
                    <span className="text-[11px] text-white/30 block leading-relaxed">
                      You will receive notifications here and via Web Push whenever new BUY / SELL / STOP triggers occur on your monitored stocks.
                    </span>
                  </div>
                </div>
              ) : (
                notifications.map((item) => {
                  const isBuy = item.signal.toUpperCase().includes('BUY');

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-md transition-all group border ${
                        isBuy
                          ? 'bg-emerald-950/20 border-emerald-500/25 hover:border-emerald-500/40 hover:bg-emerald-950/30 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.1)]'
                          : 'bg-rose-950/20 border-rose-500/25 hover:border-rose-500/40 hover:bg-rose-950/30 shadow-[inset_0_1px_0_0_rgba(244,63,94,0.1)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TickerLogo symbol={item.tickerSymbol} logoUrl={item.logoUrl} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-mono font-bold text-white">{item.tickerSymbol}</span>
                              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                item.strategy === 'thoth_egx_macro' || item.strategy === 'thoth'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                              }`}>
                                {item.strategy === 'thoth_egx_macro' || item.strategy === 'thoth' ? 'THOTH' : 'PSI'}
                              </span>
                            </div>
                            <span className="text-[11px] text-white/40 truncate block max-w-[180px] mt-0.5">
                              {item.companyName ?? item.tickerSymbol}
                            </span>
                          </div>
                        </div>

                        {/* Right side: Primary Action (BUY / SELL to Positions) + Secondary (Chart) + Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isBuy ? (
                            <Link
                              href={`/invest?ticker=${item.tickerSymbol}&view=chart&positions=1`}
                              onClick={onClose}
                              className="px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase bg-emerald-500 hover:bg-emerald-400 text-black flex items-center shadow-sm transition active:scale-95 shrink-0"
                              title="Open Positions / Buy"
                            >
                              <span>BUY</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/invest?ticker=${item.tickerSymbol}&view=chart&positions=1`}
                              onClick={onClose}
                              className="px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase bg-rose-500 hover:bg-rose-400 text-white flex items-center shadow-sm transition active:scale-95 shrink-0"
                              title="Open Positions / Sell"
                            >
                              <span>SELL</span>
                            </Link>
                          )}

                          <Link
                            href={`/invest?ticker=${item.tickerSymbol}&view=chart`}
                            onClick={onClose}
                            className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
                            title="Open Chart"
                          >
                            <ArrowUpRight size={14} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded text-white/25 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-white/35 font-mono">
                        <span>Triggered on {item.signalDate}</span>
                        <span>{formatTimeAgo(item.sentAt)}</span>
                      </div>
                    </div>
                  );
                })
              )) : (
                isLoadingLogs && systemLogs.length === 0 ? (
                  <div className="py-20 text-center text-white/30 text-xs flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-plt-orange" />
                    <span>Loading system logs...</span>
                  </div>
                ) : systemLogs.length === 0 ? (
                  <div className="py-24 text-center text-white/30 text-xs flex flex-col items-center justify-center gap-3 px-6">
                    <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/20">
                      <Clock size={22} />
                    </div>
                    <div>
                      <span className="font-medium text-white/60 block mb-1">No system logs</span>
                      <span className="text-[11px] text-white/30 block leading-relaxed">
                        Cron job status updates will appear here.
                      </span>
                    </div>
                  </div>
                ) : (
                  systemLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-md border ${
                        log.level === 'ERROR'
                          ? 'bg-[#ef4444]/5 border-[#ef4444]/20'
                          : log.level === 'WARNING'
                          ? 'bg-[#f59e0b]/5 border-[#f59e0b]/20'
                          : 'bg-white/[0.02] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 ${
                          log.level === 'ERROR' ? 'text-[#ef4444]' : log.level === 'WARNING' ? 'text-[#f59e0b]' : 'text-[#22c55e]'
                        }`}>
                          {log.level === 'ERROR' ? <AlertCircle size={14} /> : log.level === 'WARNING' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[11px] font-mono font-medium text-white/70">
                              {log.source.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-mono text-white/30">
                              {formatTimeAgo(log.createdAt)}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${
                            log.level === 'ERROR' ? 'text-[#ef4444]/90' : log.level === 'WARNING' ? 'text-[#f59e0b]/90' : 'text-white/60'
                          }`}>
                            {log.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
