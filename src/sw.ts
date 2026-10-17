/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
// Every app route serves index.html, so the app opens offline on any tab.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

// Tapping a reminder focuses the open app, or opens it on Today.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c)
      return open ? open.focus() : self.clients.openWindow('/today')
    }),
  )
})

// Ready for server-sent Web Push (e.g. a Cloudflare cron) later.
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {}
  e.waitUntil(self.registration.showNotification(data.title ?? 'Roadmap Log', { body: data.body ?? '', icon: '/pwa-192x192.png', tag: 'roadmap-daily' }))
})
