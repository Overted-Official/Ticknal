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
    body: payload.body || 'A trading signal is available.',
    icon: '/icon-192x192.png',
    badge: '/badge.png',
    tag: payload.tag || 'quantegx-signal',
    vibrate: [200, 100, 200], // Makes the phone buzz!
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
