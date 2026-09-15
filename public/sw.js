// Service worker da Araméa (web app): mostra as notificações de entrega.
// "/" na Vercel, "/aramea" no GitHub Pages — tirado do próprio scope do service worker.
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Araméa', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Araméa', {
      body: data.body || '',
      icon: `${BASE}/icon-192.png`,
      badge: `${BASE}/icon-192.png`,
      tag: data.tag,
      data: { url: data.url || '' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // A função manda caminhos relativos (ex: "order/<id>"), resolvidos dentro da app.
  const url = new URL((event.notification.data && event.notification.data.url) || '', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
