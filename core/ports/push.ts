import type { ReminderHours } from '../domain/reminders'

// A browser's push subscription: where to send, and the keys to encrypt for it.
export interface PushTarget { endpoint: string; p256dh: string; auth: string }

// One device's reminders (table push_subscriptions). Language and time zone come from the device.
export interface PushDevice extends PushTarget, ReminderHours {
  time_zone: string
  lang: 'en' | 'uk'
}

export interface PushSubscriptionRepositoryPort {
  // The app (RLS): this device's row, saving it (hours kept unless given), changing its hours, removing it.
  get(endpoint: string): Promise<PushDevice | null>
  save(device: PushTarget & Pick<PushDevice, 'time_zone' | 'lang'> & Partial<ReminderHours>): Promise<void>
  setHours(endpoint: string, hours: Partial<ReminderHours>): Promise<void>
  remove(endpoint: string): Promise<void>
  // The worker (service key): every device, with its owner.
  all(): Promise<(PushDevice & { user_id: string })[]>
}

// What a push service said: delivered, or the subscription is gone for good (404/410) and should be dropped.
export type PushResult = 'sent' | 'gone' | 'failed'

export interface PushSenderPort {
  send(target: PushTarget, payload: string): Promise<PushResult>
}
