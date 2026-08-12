'use client';

import { useAlerts } from './AlertProvider';
import { useState, useEffect } from 'react';

export default function TestNotificationButton() {
  const { ensurePushSubscription, permission, statusMessage } = useAlerts();
  const [loading, setLoading] = useState(false);

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
      disabled={loading || permission === 'unsupported'}
      className="rounded-tv-sm border border-tv-accent bg-tv-accent/10 px-3 py-2 text-xs text-tv-accent transition-colors hover:bg-tv-accent hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Sending...' : 'Test push notification'}
    </button>
  );
}
