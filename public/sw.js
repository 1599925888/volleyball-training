// Self-destruct: clear old PWA cache and unregister
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => {
        // Reload all clients to get fresh version
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
      })
  );
});
