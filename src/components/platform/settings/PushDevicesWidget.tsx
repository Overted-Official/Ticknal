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
import { triggerNativeTestNotification } from '@/lib/native/capacitor-bridge';

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientUa(navigator.userAgent);
    }
  }, []);

  const currentClient = parseUserAgent(clientUa || (typeof navigator !== 'undefined' ? navigator.userAgent : ''));
  const CurrentDeviceIcon =
    currentClient.deviceType === 'mobile' ? Smartphone :
    currentClient.deviceType === 'tablet' ? Tablet :
    currentClient.os === 'macOS' ? Laptop :
    Monitor;

  const isCurrentDeviceSubscribed =
    devices.some(
      (d) => clientUa && d.userAgent && (clientUa.includes(d.userAgent.slice(0, 30)) || d.userAgent.includes(clientUa.slice(0, 30)))
    ) || permission === 'granted';

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    setPushStatus(null);
    try {
      const res = await ensurePushSubscription({ forceResubscribe: true });
      if (res.success) {
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
        '🟢 Ticknal Signal Test',
        'BUY Signal triggered for COMI at 84.50 EGP (Target: 92.00, Stop: 81.00)'
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

  const handleDeleteDevice = async (id: number) => {
    setDeletingDeviceId(id);
    try {
      const res = await fetch(`/api/push/subscribe?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete device:', err);
    } finally {
      setDeletingDeviceId(null);
    }
  };

  return (
    <div className="w-full min-w-0 relative space-y-4">
      {/* 1. CURRENT ACTIVE SESSION CARD */}
      <div className="border border-white/[0.09] rounded-md bg-black p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-plt-profit animate-pulse" />
            <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">Current Active Session</h2>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-sans bg-plt-profit-soft border border-plt-profit-border text-plt-profit">
            Connected Now
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-md bg-white/[0.02] border border-white/[0.07]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-md bg-white/[0.05] border border-white/[0.10] flex items-center justify-center text-white/80 shrink-0">
              <CurrentDeviceIcon size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">
                  {currentClient.browser} on {currentClient.os}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-white/[0.06] text-white/60">
                  {currentClient.deviceType}
                </span>
              </div>
              <div className="text-[11px] text-white/40 mt-0.5 truncate font-mono">
                {isCurrentDeviceSubscribed ? (
                  <span className="text-plt-profit flex items-center gap-1.5">
                    <CheckCircle2 size={12} />
                    Subscribed to instantaneous trade signals & stop-loss alerts
                  </span>
                ) : (
                  <span className="text-white/45 flex items-center gap-1.5">
                    <BellOff size={12} />
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
              className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-md btn-typography transition-all w-full md:w-auto cursor-pointer ${
                isCurrentDeviceSubscribed
                  ? 'text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12]'
                  : 'text-black bg-white hover:bg-white/90 shadow-sm btn-typography-semibold'
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
          <div className="mt-4 p-3 rounded-md bg-white/[0.03] border border-white/[0.08] text-xs text-white/70 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-plt-profit shrink-0" />
            <span>{pushStatus}</span>
          </div>
        )}
      </div>

      {/* 2. REGISTERED PUSH & MOBILE DEVICES */}
      <div className="border border-white/[0.09] rounded-md bg-black p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">
              Linked Notification Devices ({devices.length})
            </h2>
            <p className="mt-1 text-xs text-white/40">
              All browsers and mobile apps linked to your Ticknal account for real-time trade signals.
            </p>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-md bg-white/[0.01] border border-dashed border-white/[0.08]">
            <Smartphone size={28} className="mx-auto mb-2 text-white/20" />
            <p className="text-xs text-white/50 font-medium">No additional background devices registered</p>
            <p className="text-[11px] text-white/30 mt-1 max-w-sm mx-auto">
              Click &quot;Enable Push on This Device&quot; above to link this browser, or log in from the Ticknal Android app to receive instant trade notifications.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices.map((device) => {
              const { browser, os, deviceType } = parseUserAgent(device.userAgent);
              const isCurrent = clientUa && device.userAgent && (clientUa.includes(device.userAgent.slice(0, 30)) || device.userAgent.includes(clientUa.slice(0, 30)));

              const DeviceIcon =
                deviceType === 'mobile' ? Smartphone :
                deviceType === 'tablet' ? Tablet :
                deviceType === 'desktop' && os === 'macOS' ? Laptop :
                Monitor;

              return (
                <div
                  key={device.id}
                  className="p-3.5 rounded-md bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-3 hover:border-white/[0.14] transition-all min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 shrink-0">
                      <DeviceIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white truncate">
                          {device.userAgent?.startsWith('Native App') ? device.userAgent : `${browser} on ${os}`}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-sans bg-plt-profit-soft border border-plt-profit-border text-plt-profit shrink-0">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/35 mt-0.5 font-mono">
                        Registered {new Date(device.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteDevice(device.id)}
                    disabled={deletingDeviceId === device.id}
                    className="p-1.5 rounded text-white/30 hover:text-plt-risk hover:bg-plt-risk-soft transition-colors shrink-0 cursor-pointer"
                    title="Disconnect Device"
                  >
                    <Trash2 size={14} />
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
