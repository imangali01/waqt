// Оффлайн-оболочка: сначала сеть (свежая версия), при её отсутствии — кэш. Время намаза кэшируется в localStorage.
const CACHE = 'waqt-v2';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || Response.error())),
  );
});

// Push-уведомления о намазе (шлёт Edge Function send-reminders). Один tag на намаз:
// новое напоминание заменяет предыдущее, но renotify снова подаёт сигнал.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* не JSON */ }
  e.waitUntil(self.registration.showNotification(d.title || 'Waqt', {
    body: d.body || '',
    tag: d.tag || 'waqt',
    renotify: true,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { url: d.url },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.length) return list[0].focus();
    return self.clients.openWindow(e.notification.data?.url || './');
  })());
});
