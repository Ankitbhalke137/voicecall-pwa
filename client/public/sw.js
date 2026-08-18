const CACHE_NAME = 'voicecall-v1';
const ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
      );
    })
  );
});

self.addEventListener('push', function (event) {
  if (!event.data) return;
  const data = event.data.json();

  if (data.type === 'INCOMING_CALL') {
    const options = {
      body: 'Tap to answer or dismiss.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `call-${data.callId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500, 250, 500, 250, 500],
      data: {
        callId: data.callId,
        callerId: data.callerId,
        roomUrl: `/?callId=${data.callId}&autoAnswer=true`
      },
      actions: [
        { action: 'answer', title: 'Answer', icon: '/icons/icon-192.png' },
        { action: 'decline', title: 'Decline', icon: '/icons/icon-192.png' }
      ]
    };
    event.waitUntil(self.registration.showNotification(`Incoming Call from ${data.callerName || 'User'}`, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const action = event.action;
  const notificationData = event.notification.data;

  if (action === 'decline') {
    fetch('/api/v1/calls/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: notificationData.callId })
    }).catch(() => {});
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'ACCEPT_CALL_FROM_SW', callId: notificationData.callId });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(notificationData.roomUrl);
      }
    })
  );
});
