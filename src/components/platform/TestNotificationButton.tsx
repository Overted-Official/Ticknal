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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-plt-orange animate-ping' : 'bg-plt-orange'}`} />
      <span>{loading ? 'Sending...' : 'Test Alert'}</span>
    </button>
  );
}
