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
  sentAt: string;
  companyName?: string | null;
  logoUrl?: string | null;
  sector?: string | null;
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
  const { data, mutate, isLoading } = useSWR<{ notifications: SignalNotificationItem[] }>(
    isOpen ? '/api/notifications' : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const notifications = data?.notifications ?? [];
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (res.ok) {
        mutate({ notifications: [] }, false);
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
        mutate(
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
                {notifications.length > 0 && (
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

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-3 space-y-2">
              {isLoading && notifications.length === 0 ? (
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
                  const badge = getSignalBadge(item.signal);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-md bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <TickerLogo symbol={item.tickerSymbol} logoUrl={item.logoUrl} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-semibold text-white">{item.tickerSymbol}</span>
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border ${badge.className}`}
                              >
                                <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-white/40 truncate block max-w-[200px]">
                              {item.companyName ?? item.tickerSymbol}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Link
                            href={`/charts?symbol=${item.tickerSymbol}`}
                            onClick={onClose}
                            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
                            title="Open in Charts"
                          >
                            <ArrowUpRight size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded text-white/25 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-white/30 font-mono">
                        <span>Triggered on {item.signalDate}</span>
                        <span>{formatTimeAgo(item.sentAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
