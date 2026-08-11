'use client';

export default function TestNotificationButton() {
  const handleTestNotification = async () => {
    try {
      // Assuming you have a route to trigger notifications, or we can just use the ServiceWorker directly for local tests
      // But to test if the push system works, we should hit the API that sends Web Push notifications to the subscription.
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
      });
      if (!res.ok) {
        alert('Failed to send push notification');
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering notification');
    }
  };

  return (
    <button
      onClick={handleTestNotification}
      className="rounded-tv-sm border border-tv-accent bg-tv-accent/10 px-3 py-2 text-xs text-tv-accent transition-colors hover:bg-tv-accent hover:text-white"
    >
      Test push notification
    </button>
  );
}
