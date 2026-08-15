'use client';

import { useAlerts } from './AlertProvider';
import { useState, useEffect } from 'react';

export default function TestNotificationButton() {
  const { ensurePushSubscription, permission } = useAlerts();
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
        alert(`Failed to subscribe. Reason: ${subscribed.error || 'Unknown error. Check browser permissions or VAPID keys.'}`);
        return;
      }

      const res = await fetch('/api/notifications/test', {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(`Failed to send push notification: ${data.error || 'Unknown error'}`);
      } else {
        alert(`Test notification triggered!\nSent: ${data.sent}\nSkipped: ${data.skipped}\nExpired: ${data.expiredSubscriptions}\nMessages: ${data.messages.join(', ')}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTestNotification}
      disabled={!isMounted || loading || permission === 'unsupported'}
      className="glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-plt-orange animate-ping' : 'bg-plt-orange'}`} />
      <span>{loading ? 'Sending...' : 'Test Notification'}</span>
    </button>
  );
}
