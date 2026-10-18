import type { State } from '../domain/types'
import { reminders, type ReminderKind } from '../domain/reminders'
import type { PushSenderPort, PushSubscriptionRepositoryPort } from '../ports/push'

/**
 * What a reminder push carries. The app's service worker turns it into words in the device's language.
 * items: what's left by name. done and total: today's own tasks and habits. hello: the confirmation when a device turns them on.
 */
export interface ReminderPayload { kind: ReminderKind | 'hello'; lang: 'en' | 'uk'; items: string[]; done: number; total: number }

/**
 * The hourly reminders. Each device picks a morning hour ("Start your day") and an evening hour, repeated every
 * 2 hours until 22:00, in its own time zone. Only your own tasks and habits count, and nothing is sent once
 * they're all done.
 */
export class ReminderService {
  private readonly devices: PushSubscriptionRepositoryPort
  private readonly push: PushSenderPort
  private readonly stateFor: (userId: string) => Promise<State>

  constructor(deps: { devices: PushSubscriptionRepositoryPort; push: PushSenderPort; stateFor: (userId: string) => Promise<State> }) {
    this.devices = deps.devices
    this.push = deps.push
    this.stateFor = deps.stateFor
  }

  async run(now = new Date()) {
    const due = (await this.devices.all()).flatMap((d) => {
      const local = reminders.wallClock(now, d.time_zone)
      const kind = reminders.kindAt(local.getHours(), d)
      return kind ? [{ d, kind, local }] : []
    })
    // Each account's data is loaded once, however many of its devices are due.
    const states = new Map<string, Promise<State | null>>()
    const stateOf = (userId: string) => {
      if (!states.has(userId)) states.set(userId, this.stateFor(userId).catch((e) => { console.error('reminders: load', e); return null }))
      return states.get(userId)!
    }
    let sent = 0, gone = 0
    await Promise.all(due.map(async ({ d, kind, local }) => {
      const state = await stateOf(d.user_id)
      if (!state) return
      const { left, total } = reminders.ownToday(state, local)
      if (!left.length) return
      const payload: ReminderPayload = { kind, lang: d.lang, items: left, done: total - left.length, total }
      const result = await this.push.send(d, JSON.stringify(payload))
      if (result === 'sent') sent++
      if (result === 'gone') { gone++; await this.devices.remove(d.endpoint) }
    }))
    console.log(`reminders: ${due.length} due, ${sent} sent, ${gone} gone`)
    return { due: due.length, sent, gone }
  }
}
