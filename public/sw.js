self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.includes(targetUrl));
      if (existingClient) return existingClient.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '패트리어트 회비 알림';
  const body = data.body || '회비 납부 현황을 확인해 주세요.';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: data.tag || 'patriot-monthly-dues',
      data: { url: data.url || '/dashboard' },
    })
  );
});
