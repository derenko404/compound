/**
 * Daily reminder. Without a push server, the reminder fires from the open app (or the
 * installed PWA while it is alive): at 20:00, if today's tasks aren't done. Settings only switches it on or off.
 */
import { t } from '@/shared/i18n'

const KEY = 'roadmap-reminder'
const SENT = 'roadmap-reminder-sent'
const REMINDER_TIME = '20:00'

export interface Reminder {
  enabled: boolean
  time: string // "HH:MM"
}

export const supported = () => 'Notification' in window && 'serviceWorker' in navigator

export function getReminder(): Reminder {
  try {
    return { enabled: false, ...JSON.parse(localStorage.getItem(KEY) || '{}'), time: REMINDER_TIME }
  } catch {
    return { enabled: false, time: REMINDER_TIME }
  }
}
export const setReminder = (r: Reminder) => localStorage.setItem(KEY, JSON.stringify(r))

export async function requestPermission() {
  if (!supported()) return 'denied' as NotificationPermission
  return Notification.permission === 'default' ? Notification.requestPermission() : Notification.permission
}

export async function show(title: string, body: string) {
  if (!supported() || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.getRegistration()
  const opts = { body, icon: '/pwa-192x192.png', badge: '/pwa-64x64.png', tag: 'roadmap-daily' }
  if (reg) await reg.showNotification(title, opts)
  else new Notification(title, opts)
}

// Checks once a minute; sends at most one reminder a day.
export function startReminderLoop(getLeft: () => number, today: () => string) {
  const check = () => {
    const r = getReminder()
    if (!r.enabled) return
    const now = new Date()
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (hm < r.time || localStorage.getItem(SENT) === today()) return
    const left = getLeft()
    localStorage.setItem(SENT, today())
    if (left > 0) void show('Compound', t.today.reminder(left))
  }
  check()
  const id = setInterval(check, 60_000)
  return () => clearInterval(id)
}
