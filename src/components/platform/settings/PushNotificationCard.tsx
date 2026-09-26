'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, Loader2, Send } from '@/components/ui/icon-library';
import { useAlerts } from '@/components/platform/AlertProvider';
import { isNativePlatform, triggerNativeTestNotification } from '@/lib/native/capacitor-bridge';

type PushState = 'idle' | 'requesting' | 'sending_test';

export default function PushNotificationCard() {
  const { ensurePushSubscription, permission } = useAlerts();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushState, setPushState] = useState<PushState>('idle');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [probeComplete, setProbeComplete] = useState(false);

  // On mount — probe the actual browser/native subscription state
  useEffect(() => {
    let mounted = true;

    async function probe() {
      try {
        if (isNativePlatform()) {
          const { checkNativePushStatus } = await import('@/lib/native/capacitor-bridge');
          const granted = await checkNativePushStatus();
          if (mounted) setIsSubscribed(granted);
          return;
        }

        if (
          typeof window !== 'undefined' &&
          'serviceWorker' in navigator &&
          'PushManager' in window
        ) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (mounted) {
            setIsSubscribed(!!sub && Notification.permission === 'granted');
          }
        }
      } catch {
        // silently fall back to unsubscribed state
      } finally {
        if (mounted) setProbeComplete(true);
      }
    }

    probe();
    return () => { mounted = false; };
  }, []);

  // Also sync from the AlertProvider `permission` value (reactive)
  useEffect(() => {
    if (permission === 'granted') setIsSubscribed(true);
  }, [permission]);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Enable push
      setPushState('requesting');
      setStatusMsg(null);
      try {
        const res = await ensurePushSubscription({ forceResubscribe: true });
        if (res.success) {
          setIsSubscribed(true);
          setStatusMsg('Push notifications enabled on this device!');
          setTimeout(() => setStatusMsg(null), 5000);
        } else {
          setStatusMsg(res.error || 'Could not enable notifications. Check browser permissions.');
        }
      } catch {
        setStatusMsg('An unexpected error occurred.');
      } finally {
        setPushState('idle');
      }
    } else {
      // Disable — unsubscribe service worker locally and remove from server
      setPushState('requesting');
      setStatusMsg(null);
      try {
        if (
          typeof window !== 'undefined' &&
          'serviceWorker' in navigator &&
          'PushManager' in window
        ) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            // Remove from server
            await fetch(
              `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
              { method: 'DELETE' }
            ).catch(() => {});
            await sub.unsubscribe();
          }
        }
        setIsSubscribed(false);
        setStatusMsg('Push notifications disabled on this device.');
        setTimeout(() => setStatusMsg(null), 4000);
      } catch {
        setStatusMsg('Failed to disable notifications.');
      } finally {
        setPushState('idle');
      }
    }
  };

  const handleTestNotification = async () => {
    setPushState('sending_test');
    setStatusMsg(null);
    try {
      // Ensure subscription is still live first
      await ensurePushSubscription({ forceResubscribe: false }).catch(() => {});

      // Fire native test notification (no-op on web)
      await triggerNativeTestNotification(
        'COMI · BUY Signal (Cerberus)',
        'Triggered at 139.50 EGP · Target: 152.00 · Stop: 134.00'
      );

      const res = await fetch('/api/notifications/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg('🟢 Test notification sent! Check your notification tray.');
      } else {
        setStatusMsg(data.error || 'Failed to send test notification.');
      }
    } catch {
      setStatusMsg('Failed to send test notification.');
    } finally {
      setPushState('idle');
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  const isLoading = pushState !== 'idle';
  // Don't render the toggle until we've probed the real state (avoids flicker)
  const showToggle = probeComplete || permission !== 'default';

  return (
    <div className="w-full min-w-0 py-2 space-y-6">
      {/* Header row — same layout as PinSecurityCard */}
      <div className="flex items-start justify-between gap-4 pb-2">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white shrink-0 mt-0.5">
            {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Push Notifications
              </h2>
              {isSubscribed ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-profit-num/10 text-profit-num">
                  ENABLED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-text-muted">
                  OFF
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Receive real-time trade signals, buy alerts, and portfolio updates on this device.
            </p>
          </div>
        </div>

        {/* Toggle switch — matches PinSecurityCard */}
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {showToggle && (
            <label className={`relative inline-flex items-center select-none shrink-0 ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={isSubscribed}
                onChange={(e) => handleToggle(e.target.checked)}
                className="sr-only peer"
                disabled={isLoading}
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  isSubscribed ? 'bg-profit-num' : 'bg-white/20'
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm transition-transform duration-200 ease-out">
                    <Loader2 size={12} className="animate-spin text-black/60" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                      isSubscribed ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                )}
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Expanded state when subscribed — test push action + status */}
      {isSubscribed && (
        <div className="space-y-4 pt-1">
          {/* Action row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={pushState === 'sending_test'}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] active:scale-98 text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {pushState === 'sending_test' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} className="text-text-muted" />
              )}
              <span>{pushState === 'sending_test' ? 'Sending...' : 'Send Test Notification'}</span>
            </button>

            <div className="text-xs text-text-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-profit-num animate-pulse" />
              <span>Live on this device</span>
            </div>
          </div>

          {/* Sub-info card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors flex items-center gap-3 min-w-0">
              <Bell size={16} className="text-text-muted shrink-0" />
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-white">Trade Signal Alerts</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Buy/sell signals delivered the moment they trigger</p>
              </div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors flex items-center gap-3 min-w-0">
              <CheckCircle2 size={16} className="text-text-muted shrink-0" />
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-white">Portfolio Updates</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Position changes, stop-loss hits, and target reaches</p>
              </div>
            </div>
          </div>

          {/* Disable link */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => handleToggle(false)}
              disabled={isLoading}
              className="text-xs font-medium text-loss-num/80 hover:text-loss-num transition-colors cursor-pointer disabled:opacity-50"
            >
              Disable Push Notifications
            </button>
          </div>
        </div>
      )}

      {/* Status message */}
      {statusMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] text-xs text-text-secondary flex items-center gap-2">
          <CheckCircle2 size={14} className="text-profit-num shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
    </div>
  );
}
