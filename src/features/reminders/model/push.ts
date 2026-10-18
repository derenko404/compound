/**
 * Push reminders for this device: the browser's subscription plus a row in push_subscriptions that the worker's
 * hourly cron reads. Needs an account (the worker reads the data from Supabase) and VITE_VAPID_PUBLIC_KEY.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { pushDevices, type PushDevice } from '@/shared/api/backends'
import { lang } from '@/shared/i18n'

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// The browser can take pushes here. iPhone Safari only can in the installed app (iOS 16.4+).
const supported = () => !!PUBLIC_KEY && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const subscription = async () => (await navigator.serviceWorker.ready).pushManager.getSubscription()

// What the row needs from a browser subscription, plus this device's time zone and language.
function deviceOf(sub: PushSubscription) {
  const keys = sub.toJSON().keys ?? {}
  return { endpoint: sub.endpoint, p256dh: keys.p256dh ?? '', auth: keys.auth ?? '', time_zone: timeZone(), lang }
}

const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0))

// This device's saved reminders, or null when they're off.
async function current(db: SupabaseClient): Promise<PushDevice | null> {
  if (!supported()) return null
  const sub = await subscription()
  return sub ? pushDevices(db).get(sub.endpoint) : null
}

// Asks for permission (call it from a tap), subscribes and saves the device. Resolves false when not allowed.
async function enable(db: SupabaseClient) {
  if ((await Notification.requestPermission()) !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(PUBLIC_KEY!) })
  await pushDevices(db).save(deviceOf(sub))
  void hello(db, sub.endpoint)
  return true
}

// Asks the worker for one push now, so turning reminders on shows they arrive. A failure here isn't the user's problem.
async function hello(db: SupabaseClient, endpoint: string) {
  const token = (await db.auth.getSession()).data.session?.access_token
  if (!token) return
  await fetch('/push/hello', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint }) })
    .catch((e) => console.warn('push hello', e))
}

async function disable(db: SupabaseClient) {
  const sub = await subscription()
  if (!sub) return
  await pushDevices(db).remove(sub.endpoint).catch(() => {})
  await sub.unsubscribe()
}

const setHours = async (db: SupabaseClient, hours: Partial<Pick<PushDevice, 'morning_hour' | 'evening_hour'>>) => {
  const sub = await subscription()
  if (sub) await pushDevices(db).setHours(sub.endpoint, hours)
}

// On each start: the saved row follows the device's time zone, language and keys (hours stay as chosen).
async function sync(db: SupabaseClient) {
  if (!supported() || Notification.permission !== 'granted') return
  const sub = await subscription()
  if (sub) await pushDevices(db).save(deviceOf(sub)).catch((e) => console.warn('push sync', e))
}

// Push is set up for this build (the worker holds the matching private key).
const configured = () => !!PUBLIC_KEY

export const pushReminders = { configured, supported, current, enable, disable, setHours, sync }
