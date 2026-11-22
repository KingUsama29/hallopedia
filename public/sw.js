/* Hallopedia Push-Ready PWA Service Worker Shell (Stage 2C) */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function resolveSafeOrderPath(rawOrderId) {
  if (typeof rawOrderId === 'string' && /^[a-zA-Z0-9_-]{3,80}$/.test(rawOrderId)) {
    return `/dashboard/orders/${rawOrderId}`
  }
  return '/dashboard/orders'
}

function showHallopediaNotification(payload) {
  const title =
    typeof payload?.title === 'string' && payload.title.trim()
      ? payload.title.trim().slice(0, 100)
      : 'Pembaruan Pesanan Hallopedia'
  const body =
    typeof payload?.body === 'string' && payload.body.trim()
      ? payload.body.trim().slice(0, 220)
      : 'Ada pesan atau pembaruan baru dari Admin Operasional Hallopedia.'
  const targetPath = resolveSafeOrderPath(payload?.orderId)
  const tag =
    typeof payload?.tag === 'string' && payload.tag.trim()
      ? payload.tag.trim().slice(0, 64)
      : 'hallopedia-order-update'

  const tasks = [
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag,
      renotify: true,
      data: { url: targetPath },
    }),
  ]

  if (typeof payload?.unreadCount === 'number' && self.registration && 'setAppBadge' in self.registration) {
    const count = Math.max(0, Math.floor(payload.unreadCount))
    tasks.push(
      count > 0
        ? self.registration.setAppBadge(count).catch(() => {})
        : self.registration.clearAppBadge().catch(() => {}),
    )
  }

  return Promise.all(tasks)
}

self.addEventListener('push', (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { body: event.data.text() }
    }
  }
  event.waitUntil(showHallopediaNotification(payload))
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_PREVIEW_NOTIFICATION') {
    event.waitUntil(showHallopediaNotification(event.data.payload))
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification?.data?.url
  const targetUrl =
    typeof rawUrl === 'string' && rawUrl.startsWith('/dashboard/orders')
      ? rawUrl
      : '/dashboard/orders'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          return client.navigate(targetUrl).then((navigated) => (navigated ?? client).focus())
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})

