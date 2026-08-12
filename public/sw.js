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

  const payload = event.data.json();
  const title = payload.title || 'QuantEGX signal';
  const options = {
    body: payload.body || 'A PSI strategy signal is available.',
    icon: '/icon-192x192.png',
    badge: '/badge.png',
    tag: payload.tag || 'quantegx-signal',
    vibrate: [200, 100, 200], // Makes the phone buzz!
    data: {
      url: payload.url || '/charts',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/charts', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
