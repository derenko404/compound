/**
 * Offline sync: changes made on the device wait in an outbox until they reach the server. The outbox lives on
 * the device (adapters/local) and survives reloads and app updates.
 */
import type { Op } from '../domain/types'

// A change waiting to be sent: the op and when it was made on the device (the latest edit of an item wins).
export interface PendingOp {
  id: string
  op: Op
  at: string
}

export interface OutboxPort {
  all(): PendingOp[]
  push(p: PendingOp): void
  remove(id: string): void
  clear(): void
}
