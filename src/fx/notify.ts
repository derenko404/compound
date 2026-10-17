// Daily reminder. Without a push server, the reminder fires from the open app (or the
// installed PWA while it is alive): at the chosen time, if today's tasks aren't done.
const KEY = 'roadmap-reminder'
const SENT = 'roadmap-reminder-sent'

export interface Reminder {
  enabled: boolean
  time: string // "HH:MM"
}

export const supported = () => 'Notification' in window && 'serviceWorker' in navigator

export function getReminder(): Reminder {
  try {
    return { enabled: false, time: '20:00', ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { enabled: false, time: '20:00' }
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
    if (left > 0) void show('Roadmap Log', `${left} task${left === 1 ? '' : 's'} left today. Keep the streak alive.`)
  }
  check()
  const id = setInterval(check, 60_000)
  return () => clearInterval(id)
}
