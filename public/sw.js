self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', () => {
  // Pass-through fetch handler for PWA installation
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    try {
      payload = {
        title: 'Ticknal Signal Alert',
        body: event.data.text() || 'A new trade signal is available.',
      };
    } catch {
      payload = {
        title: 'Ticknal Signal Alert',
        body: 'A new trade signal is available.',
      };
    }
  }

  const title = payload.title || 'Ticknal Signal Alert';
  const targetUrl = payload.url || (payload.symbol ? `/invest?ticker=${payload.symbol}&view=chart` : '/invest?view=chart');

  const options = {
    body: payload.body || 'A trade signal is available on Ticknal.',
    icon: '/icon-192x192.png',
    badge: '/badge.png',
    tag: payload.tag || `ticknal-signal-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: targetUrl,
      symbol: payload.symbol,
      signal: payload.signal,
      strategy: payload.strategy,
    },
    actions: [
      {
        action: 'open_chart',
        title: '📈 View Chart',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/invest?view=chart';
  const url = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
