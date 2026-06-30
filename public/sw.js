/*
 * Minimal service worker for Lichess Friend Watcher.
 *
 * It does not cache anything (the app needs live API data). Its job is to make
 * notifications more reliable: notifications shown via the registration survive
 * the tab losing focus, and clicking one focuses an existing tab or opens the
 * game link.
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || 'https://lichess.org';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return client.navigate ? client.navigate(url) : undefined;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
