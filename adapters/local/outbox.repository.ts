import type { OutboxPort, PendingOp } from '../../core/ports/sync'

/** Changes waiting to reach the server, as a JSON array in localStorage (one key per account). */
export class LocalOutboxRepository implements OutboxPort {
  private readonly key: string

  constructor(key: string) {
    this.key = key
  }

  all(): PendingOp[] {
    try {
      return JSON.parse(localStorage.getItem(this.key) ?? '[]') as PendingOp[]
    } catch {
      return []
    }
  }

  push(p: PendingOp) {
    this.write([...this.all(), p])
  }

  remove(id: string) {
    this.write(this.all().filter((p) => p.id !== id))
  }

  clear() {
    localStorage.removeItem(this.key)
  }

  private write(ps: PendingOp[]) {
    if (ps.length) localStorage.setItem(this.key, JSON.stringify(ps))
    else localStorage.removeItem(this.key)
  }
}
