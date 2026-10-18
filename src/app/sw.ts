/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import type { ReminderPayload } from '@core/services/reminder.service'
import { push as enPush } from '@/shared/i18n/en/push'
import { push as ukPush } from '@/shared/i18n/uk/push'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
// Every app route serves index.html, so the app opens offline on any tab.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// A new version takes over right away; the page reloads itself when it does (see main.tsx).
void self.skipWaiting()
clientsClaim()

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

// Reminders from the worker's hourly cron (ReminderService): what's left, put into words in the device's language.
self.addEventListener('push', (e) => {
  let data: Partial<ReminderPayload> = {}
  try { data = e.data?.json() ?? {} } catch { /* not JSON: a bare reminder */ }
  const tx = data.lang === 'uk' ? ukPush : enPush
  const items = data.items ?? []
  const list = items.length > 4 ? `${items.slice(0, 3).join(', ')}, ${tx.more(items.length - 3)}` : items.join(', ')
  const [title, body] = data.kind === 'hello' ? [tx.helloTitle, tx.hello]
    : data.kind === 'morning' ? [tx.morningTitle, tx.morning(list)]
    : data.kind === 'last' ? [tx.lastTitle, tx.last(list)]
    : [tx.eveningTitle(data.done ?? 0, data.total ?? items.length), tx.evening(list)]
  e.waitUntil(self.registration.showNotification(title, {
    body: items.length || data.kind === 'hello' ? body : '',
    icon: '/pwa-192x192.png', badge: '/pwa-64x64.png', tag: 'roadmap-daily',
}))
})
