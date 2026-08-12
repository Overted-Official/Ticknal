'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AlertContextValue = {
  alertedSymbols: Set<string>;
  statusMessage: string | null;
  permission: NotificationPermission | 'unsupported';
  ready: boolean;
  isAlerted: (symbol: string) => boolean;
  toggleAlert: (symbol: string) => Promise<boolean>;
  ensurePushSubscription: () => Promise<{ success: boolean; error?: string }>;
};

const AlertContext = createContext<AlertContextValue | null>(null);

const DEVICE_ID_KEY = 'quantegx-device-id';

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [alertedSymbols, setAlertedSymbols] = useState<Set<string>>(new Set());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermission());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      setDeviceId(getOrCreateDeviceId());
      setPermission(getNotificationPermission());
    }, 0);
  }, []);

  useEffect(() => {
    if (!deviceId) return;

    const controller = new AbortController();
    async function loadAlerts() {
      try {
        const res = await fetch(`/api/alerts?deviceId=${deviceId}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setAlertedSymbols(new Set((data.alerts ?? []).filter((alert: { enabled: boolean }) => alert.enabled).map((alert: { symbol: string }) => alert.symbol)));
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to load alerts:', error);
        }
      } finally {
        setReady(true);
      }
    }

    loadAlerts();
    return () => controller.abort();
  }, [deviceId]);

  const ensurePushSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!deviceId) return { success: false, error: 'Device ID not initialized.' };
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPermission('unsupported');
      setStatusMessage('Push notifications are not supported on this browser.');
      return { success: false, error: 'Push notifications are not supported on this browser.' };
    }

    const keyRes = await fetch('/api/push/vapid-key');
    if (!keyRes.ok) {
      setStatusMessage('Could not load push configuration.');
      return { success: false, error: 'Could not load push configuration from server.' };
    }

    const keyData = await keyRes.json();
    if (!keyData.configured || !keyData.publicKey) {
      setStatusMessage('Web Push keys are not configured yet.');
      return { success: false, error: 'Web Push VAPID keys are not configured.' };
    }

    let currentPermission = Notification.permission;
    if (currentPermission === 'default') {
      currentPermission = await Notification.requestPermission();
    }
    setPermission(currentPermission);

    if (currentPermission !== 'granted') {
      setStatusMessage('Notification permission was not granted.');
      return { success: false, error: 'Notification permission was denied by the user.' };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        }));

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        setStatusMessage('Could not save the browser push subscription.');
        return { success: false, error: 'Failed to save subscription to database.' };
      }

      setStatusMessage(null);
      return { success: true };
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      setStatusMessage('Failed to subscribe to push manager.');
      return { success: false, error: err.message || 'PushManager subscription failed' };
    }
  }, [deviceId]);

  const toggleAlert = useCallback(
    async (rawSymbol: string) => {
      if (!deviceId) return false;
      const symbol = normalizeSymbol(rawSymbol);
      const enabled = !alertedSymbols.has(symbol);

      if (enabled) {
        const subscribed = await ensurePushSubscription();
        if (!subscribed.success) return false;
      }

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, symbol, enabled }),
      });

      if (!res.ok) {
        setStatusMessage('Could not save alert preference.');
        return false;
      }

      setAlertedSymbols((current) => {
        const next = new Set(current);
        if (enabled) next.add(symbol);
        else next.delete(symbol);
        return next;
      });
      setStatusMessage(enabled ? `${symbol} alert enabled.` : `${symbol} alert disabled.`);
      return enabled;
    },
    [alertedSymbols, deviceId, ensurePushSubscription],
  );

  const value = useMemo<AlertContextValue>(
    () => ({
      alertedSymbols,
      statusMessage,
      permission,
      ready,
      isAlerted: (symbol: string) => alertedSymbols.has(normalizeSymbol(symbol)),
      toggleAlert,
      ensurePushSubscription,
    }),
    [alertedSymbols, permission, ready, statusMessage, toggleAlert, ensurePushSubscription],
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  return context;
}

function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  window.localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace('.CA', '');
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
