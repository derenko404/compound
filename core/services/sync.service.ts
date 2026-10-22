/**
 * Sends changes made on the device to the server, oldest first, one at a time. A change that can't be sent
 * for now (offline, server unreachable) stops the run and stays for the next one; a change the server refuses
 * for good is dropped and reported, so it never blocks the ones behind it.
 */
import { reduce } from '../domain/reduce'
import type { Op, State } from '../domain/types'
import type { OutboxPort, PendingOp } from '../ports/sync'

export interface SyncStatus {
  pending: number
  sending: boolean
}

export class SyncService {
  private readonly outbox: OutboxPort
  private readonly send: (p: PendingOp) => Promise<void>
  private readonly permanent: (e: unknown) => boolean
  private readonly listeners = new Set<() => void>()
  private run: Promise<unknown[]> | null = null
  private status: SyncStatus

  constructor(outbox: OutboxPort, send: (p: PendingOp) => Promise<void>, permanent: (e: unknown) => boolean) {
    this.outbox = outbox
    this.send = send
    this.permanent = permanent
    this.status = { pending: outbox.all().length, sending: false }
  }

  // Queues a change. A settings op keeps the whole settings it led to, so sending it later needs no other state.
  record(op: Op, next: State): PendingOp {
    const whole = (o: Op): Op => (o.type === 'settings' ? { ...o, patch: next.settings } : o.type === 'batch' ? { ...o, ops: o.ops.map(whole) } : o)
    const p = { id: crypto.randomUUID(), op: whole(op), at: new Date().toISOString() }
    this.outbox.push(p)
    this.update()
    return p
  }

  // The server's state with the changes still waiting applied on top, so they never flicker away.
  replay(s: State): State {
    return this.outbox.all().reduce((acc, p) => reduce(acc, p.op), s)
  }

  // Whether any waiting change matches.
  waiting(match: (op: Op) => boolean): boolean {
    const has = (o: Op): boolean => match(o) || (o.type === 'batch' && o.ops.some(has))
    return this.outbox.all().some((p) => has(p.op))
  }

  /**
   * Sends what's waiting. Resolves with the errors of changes dropped for good; rejects when a change couldn't be
   * sent for now. Calls while a run is going share it.
   */
  flush(): Promise<unknown[]> {
    this.run ??= this.drain().finally(() => {
      this.run = null
      this.update()
    })
    return this.run
  }

  clear() {
    this.outbox.clear()
    this.update()
  }

  get(): SyncStatus {
    return this.status
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  private async drain() {
    const dropped: unknown[] = []
    this.update(true)
    for (let p = this.outbox.all()[0]; p; p = this.outbox.all()[0]) {
      try {
        await this.send(p)
      } catch (e) {
        if (!this.permanent(e)) throw e
        dropped.push(e)
      }
      this.outbox.remove(p.id)
      this.update(true)
    }
    return dropped
  }

  private update(sending = this.run !== null) {
    const pending = this.outbox.all().length
    if (pending === this.status.pending && sending === this.status.sending) return
    this.status = { pending, sending }
    for (const l of this.listeners) l()
  }
}
