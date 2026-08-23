'use client';

import { useAlerts } from './AlertProvider';
import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function TestNotificationButton() {
  const { ensurePushSubscription, permission } = useAlerts();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsMounted(true);
    }, 0);
  }, []);

  const handleTestNotification = async () => {
    try {
      setLoading(true);

      // Ensure the device is subscribed to push notifications first
      const subscribed = await ensurePushSubscription();
      if (!subscribed.success) {
        toast.warning(
          'Push Subscription Required',
          subscribed.error || 'Check browser permissions to enable push notifications.'
        );
        return;
      }

      const res = await fetch('/api/notifications/test', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Notification Dispatch Failed', data.error || 'Unknown error occurred.');
      } else {
        toast.success(
          'Test Notification Dispatched',
          `Sent: ${data.sent} notification(s). Messages: ${(data.messages || []).join(', ')}`
        );
      }
    } catch (err) {
      console.error(err);
      toast.error('Notification Error', 'An unexpected error occurred while sending test alert.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTestNotification}
      disabled={!isMounted || loading || permission === 'unsupported'}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-plt-subtle hover:text-plt-text bg-plt-hover border border-plt-border hover:border-plt-border-strong hover:bg-plt-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className={`w-2 h-2 rounded-full ${loading ? 'bg-plt-profit animate-ping' : 'bg-plt-profit'}`} />
      <span>{loading ? 'Sending...' : 'Test Alert'}</span>
    </button>
  );
}
