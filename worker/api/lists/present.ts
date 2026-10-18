import type { ListDef, ListItem } from '../../../core/domain/types'

/** What an AI reads back about lists. */
export const present = {
  list: ({ list: l, progress }: { list: ListDef; progress: Record<string, ListItem> }) => ({
    id: l.id, name: l.name, title: l.title, detail_label: l.sub_label,
    items: l.items.map((it) => ({ id: it.id, title: it.title, detail: it.sub ?? '', done: !!progress[it.id]?.done_at, note: progress[it.id]?.note ?? '' })),
  }),
  summary: ({ list: l, done }: { list: ListDef; done: number }) => ({ id: l.id, name: l.name, title: l.title, items: l.items.length, done }),
}
