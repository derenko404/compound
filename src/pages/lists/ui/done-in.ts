import type { ListDef, State } from '@core/domain/types'

// How many of a list's items are ticked.
export const doneIn = (s: State, l: ListDef) => l.items.filter((i) => s.listProgress[l.id]?.[i.id]?.done_at).length
