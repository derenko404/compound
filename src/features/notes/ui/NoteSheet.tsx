import { useState } from 'react'
import { topicOf } from '@core/domain/content'
import { links } from '@core/domain/links'
import type { TopicId, Note } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { AreaField, TopicField, FormSheet, LinesField, fail } from '@/shared/ui'
import { t } from '@/shared/i18n'

// Offered under Tags: the tags you'd use most.
const QUICK_TAGS = ['todo', 'idea']

const blank = (topic: TopicId | null): Note => ({
  id: crypto.randomUUID(), type: 'note', body: '', url: null, kind: null, context: '', tags: [],
  topic, source: 'app', created_at: new Date().toISOString(),
})

/**
 * New or existing entry: one text box. If it holds a link the entry is a link: on save the link is
 * taken out and kept as the entry's link, and the rest is the note about it. Ideas are marked by the bot's AI.
 * From a topic page a new entry belongs to that topic, so there's no topic picker.
 */
export function NoteSheet({ open, onOpenChange, note, topic }: { open: boolean; onOpenChange: (o: boolean) => void; note?: Note; topic?: TopicId }) {
  const { state, dispatch } = useStore()
  const [n, setN] = useState<Note>(() => {
    // Every entry has a topic: Personal unless added from a topic page (or saved by the bot without one).
    const own = topicOf(state, 'own') ? 'own' : null
    const x = note ? { ...note, topic: note.topic ?? own } : blank(topic ?? own)
    return x.url ? { ...x, body: x.body ? `${x.url}\n${x.body}` : x.url } : x
  })
  const set = (patch: Partial<Note>) => setN({ ...n, ...patch })
  const url = links.findUrls(n.body)[0] ?? null
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={t.notebook.title} submit={t.common.save}
      onSubmit={() => {
        if (!n.body.trim()) return fail(t.notebook.sheet.writeFirst)
        const isLink = !!url
        // A link decides the type; otherwise #idea makes it an idea, and anything else is a note.
        const type = isLink ? 'link' : n.tags.includes('idea') ? 'idea' : 'note'
        dispatch({ type: 'putNote', note: {
          ...n, type, body: (isLink ? n.body.replace(url!, '') : n.body).trim(),
          url: isLink ? url : null, kind: isLink ? (url === note?.url && n.kind) || links.kindFromUrl(url!) || 'site' : null,
        } })
      }}>
      <AreaField label={t.notebook.sheet.note} value={n.body} rows={5} onChange={(body) => set({ body })}
        placeholder={t.notebook.sheet.notePlaceholder} />
      {n.context && (
        <div className="field span-all">
          <span className="text-small font-bold">{t.notebook.sheet.aiContext}</span>
          <div className="nb-context">{n.context}</div>
          <span className="text-caption text-muted-foreground">{t.notebook.sheet.aiContextHint}</span>
        </div>
      )}
      {!(topic && !note) && <TopicField value={n.topic} onChange={(c) => set({ topic: c })} />}
      <LinesField label={t.notebook.sheet.tags} value={n.tags} placeholder={t.notebook.sheet.tagPlaceholder} quick={QUICK_TAGS}
        onChange={(ts) => set({ tags: [...new Set(ts.map(links.cleanTag).filter(Boolean))] })} />
    </FormSheet>
  )
}
