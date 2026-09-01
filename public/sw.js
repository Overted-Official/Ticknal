self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', () => {
  // A minimal fetch listener is required to pass PWA installation criteria on some browsers.
  // We just let the network handle it.
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    try {
      payload = {
        title: 'QuantEGX Signal Alert',
        body: event.data.text() || 'A new trading signal is available.',
      };
    } catch {
      payload = {
        title: 'QuantEGX Signal Alert',
        body: 'A new trading signal is available.',
      };
    }
  }

  const title = payload.title || 'QuantEGX Signal Alert';
  const options = {
    body: payload.body || 'A trading signal is available.',
    icon: '/icon-192x192.png',
    badge: '/badge.png',
    tag: payload.tag || `quantegx-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200], // Vibration pattern for mobile
    data: {
      url: payload.url || '/invest?view=chart',
    },
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
