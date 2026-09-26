'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  CheckCircle2,
  Bell,
  BellOff,
  Trash2,
} from '@/components/ui/icon-library';
import { useAlerts } from '@/components/platform/AlertProvider';
import { triggerNativeTestNotification, isNativePlatform, checkNativePushStatus } from '@/lib/native/capacitor-bridge';

export type DeviceInfo = {
  id: number;
  endpoint: string;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
};

interface PushDevicesWidgetProps {
  initialDevices: DeviceInfo[];
}

function parseUserAgent(ua: string | null): {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
} {
  if (!ua) return { browser: 'Web Client', os: 'Unknown OS', deviceType: 'desktop' };

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  if (/ipad/i.test(ua)) deviceType = 'tablet';
  else if (/mobile|iphone|android/i.test(ua)) deviceType = 'mobile';

  return { browser, os, deviceType };
}

export default function PushDevicesWidget({ initialDevices }: PushDevicesWidgetProps) {
  const { ensurePushSubscription, permission } = useAlerts();

  const [devices, setDevices] = useState<DeviceInfo[]>(initialDevices);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<number | null>(null);
  const [clientUa, setClientUa] = useState<string>('');
  const [isProbedSubscribed, setIsProbedSubscribed] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined') {
      setClientUa(navigator.userAgent);
    }

    async function probeDeviceSubscription() {
      if (isNativePlatform()) {
        const granted = await checkNativePushStatus();
        if (isMounted && granted) {
          setIsProbedSubscribed(true);
        }
        return;
      }

      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub && Notification.permission === 'granted') {
            if (isMounted) setIsProbedSubscribed(true);
          }
        } catch {}
      }
    }

    probeDeviceSubscription();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentClient = parseUserAgent(clientUa || (typeof navigator !== 'undefined' ? navigator.userAgent : ''));
  const CurrentDeviceIcon =
    currentClient.deviceType === 'mobile' ? Smartphone :
    currentClient.deviceType === 'tablet' ? Tablet :
    currentClient.os === 'macOS' ? Laptop :
    Monitor;

  const isCurrentDeviceSubscribed =
    isProbedSubscribed ||
    permission === 'granted' ||
    (isNativePlatform() && devices.some((d) => d.userAgent?.includes('Native App'))) ||
    devices.some(
      (d) => clientUa && d.userAgent && (clientUa.includes(d.userAgent.slice(0, 30)) || d.userAgent.includes(clientUa.slice(0, 30)))
    );

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    setPushStatus(null);
    try {
      const res = await ensurePushSubscription({ forceResubscribe: true });
      if (res.success) {
        setIsProbedSubscribed(true);
        setPushStatus('Notifications enabled successfully on this device!');
        const devRes = await fetch('/api/push/subscribe');
        if (devRes.ok) {
          const data = await devRes.json();
          setDevices(data.subscriptions || data.devices || []);
        }
      } else {
        setPushStatus(res.error || 'Failed to enable notifications. Please check browser permissions.');
      }
    } catch {
      setPushStatus('An unexpected error occurred while requesting notification access.');
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleTestPush = async () => {
    setIsEnablingPush(true);
    setPushStatus(null);
    try {
      await ensurePushSubscription({ forceResubscribe: false }).catch(() => {});

      await triggerNativeTestNotification(
        'COMI · BUY Signal (Cerberus)',
        'Triggered at 139.50 EGP · Target: 152.00 · Stop: 134.00'
      );

      const res = await fetch('/api/notifications/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPushStatus('🟢 Test notification dispatched! Check your status bar & notification tray.');
        const devRes = await fetch('/api/push/subscribe');
        if (devRes.ok) {
          const devData = await devRes.json();
          setDevices(devData.subscriptions || devData.devices || []);
        }
      } else {
        setPushStatus(data.error || 'Failed to send test notification.');
      }
    } catch {
      setPushStatus('Failed to dispatch test notification.');
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleDeleteDevice = async (device: DeviceInfo) => {
    setDeletingDeviceId(device.id);
    try {
      const res = await fetch(
        `/api/push/subscribe?id=${device.id}&endpoint=${encodeURIComponent(device.endpoint)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== device.id && d.endpoint !== device.endpoint));

        // If the deleted device is the current browser session, unsubscribe PushManager locally
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
          try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub && (sub.endpoint === device.endpoint || !device.endpoint.startsWith('http'))) {
              await sub.unsubscribe();
              setIsProbedSubscribed(false);
            }
          } catch (err) {
            console.warn('Local service worker unsubscribe error:', err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete device:', err);
    } finally {
      setDeletingDeviceId(null);
    }
  };

  return (
    <div className="w-full min-w-0 py-2 space-y-8">
      {/* 1. CURRENT ACTIVE SESSION */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center text-white shrink-0">
              <CurrentDeviceIcon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white truncate">
                  {currentClient.browser} on {currentClient.os}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-white/70">
                  {currentClient.deviceType}
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-profit-num/10 text-profit-num">
                  <span className="w-1.5 h-1.5 rounded-full bg-profit-num animate-pulse" />
                  Active Now
                </span>
              </div>
              <div className="text-xs text-text-muted mt-1 truncate">
                {isCurrentDeviceSubscribed ? (
                  <span className="text-profit-num flex items-center gap-1.5 font-medium">
                    <CheckCircle2 size={13} />
                    Subscribed to real-time trade signals &amp; alert triggers
                  </span>
                ) : (
                  <span className="text-text-muted flex items-center gap-1.5">
                    <BellOff size={13} />
                    Push alerts inactive on this browser session
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={isCurrentDeviceSubscribed ? handleTestPush : handleEnablePush}
              disabled={isEnablingPush}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all w-full md:w-auto cursor-pointer active:scale-98 ${
                isCurrentDeviceSubscribed
                  ? 'text-white bg-white/[0.06] hover:bg-white/[0.12]'
                  : 'text-white bg-brand-blue hover:opacity-90 shadow-xs'
              }`}
            >
              <Bell size={14} />
              <span>
                {isEnablingPush
                  ? 'Connecting...'
                  : isCurrentDeviceSubscribed
                  ? 'Send Test Push Alert'
                  : 'Enable Push on This Device'}
              </span>
            </button>
          </div>
        </div>

        {pushStatus && (
          <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] text-xs text-text-secondary flex items-center gap-2">
            <CheckCircle2 size={14} className="text-profit-num shrink-0" />
            <span>{pushStatus}</span>
          </div>
        )}
      </div>

      {/* 2. REGISTERED PUSH & MOBILE DEVICES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
            Linked Notification Endpoints ({devices.length})
          </h3>
        </div>

        {devices.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02]">
            <Smartphone size={28} className="mx-auto mb-2 text-white/30" />
            <p className="text-xs text-white/80 font-medium">No additional background devices registered</p>
            <p className="text-[11px] text-text-muted mt-1 max-w-sm mx-auto">
              Click &quot;Enable Push on This Device&quot; to link this browser, or log in from the Ticknal mobile app to receive instant trade notifications.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices.map((device) => {
              const { browser, os, deviceType } = parseUserAgent(device.userAgent);
              const isCurrent =
                clientUa &&
                device.userAgent &&
                (clientUa.includes(device.userAgent.slice(0, 30)) ||
                  device.userAgent.includes(clientUa.slice(0, 30)));

              const DeviceIcon =
                deviceType === 'mobile' ? Smartphone :
                deviceType === 'tablet' ? Tablet :
                deviceType === 'desktop' && os === 'macOS' ? Laptop :
                Monitor;

              return (
                <div
                  key={device.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors flex items-center justify-between gap-3 min-w-0"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white/80 shrink-0">
                      <DeviceIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-white truncate">
                          {device.userAgent?.startsWith('Native App')
                            ? device.userAgent
                            : `${browser} on ${os}`}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-sans font-semibold bg-profit-num/10 text-profit-num shrink-0">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5 tabular-nums">
                        Registered {new Date(device.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteDevice(device)}
                    disabled={deletingDeviceId === device.id}
                    className="p-2 rounded-lg text-white/40 hover:text-loss-num hover:bg-loss-num/10 transition-colors shrink-0 cursor-pointer"
                    title="Disconnect Device"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
