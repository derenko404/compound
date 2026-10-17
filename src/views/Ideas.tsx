import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fmtShort, fmtStamp } from '@/lib/dates'
import type { Idea } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { burst, toast } from '@/fx/fx'
import { ConfirmButton, Header, Section, empty } from '@/components/kit'

const hay = (it: Idea) => [it.title, it.body, it.labels.join(' '), ...it.notes.map((n) => n.body)].join(' ').toLowerCase()

function IdeaCard({ idea, open, onOpen }: { idea: Idea; open: boolean; onOpen: () => void }) {
  const { dispatch } = useStore()
  const [note, setNote] = useState('')
  return (
    <div className="note" style={{ '--c': 'var(--primary)' } as React.CSSProperties}>
      <div className="note-meta">
        <span>{fmtShort(new Date(idea.created_at))}</span>
        {idea.notes.length > 0 && <span>{idea.notes.length} note{idea.notes.length === 1 ? '' : 's'}</span>}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="row-title font-display text-lg">{idea.title}</div>
          {idea.body && !open && <div className="row-sub line-clamp-2">{idea.body}</div>}
          {idea.labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {idea.labels.map((l) => <Badge key={l} variant="outline">#{l}</Badge>)}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" aria-expanded={open} onClick={onOpen}>{open ? 'Close' : 'Open'}</Button>
      </div>
      {open && (
        <div className="mt-3">
          {idea.body && <div className="note-text mb-3">{idea.body}</div>}
          {idea.notes.map((n) => (
            <div key={n.id} className="mb-2 border-l-[3px] border-border py-1 pl-2.5">
              <div className="text-[13px] text-muted-foreground">{fmtStamp(n.created_at)}</div>
              <div className="note-text">{n.body}</div>
            </div>
          ))}
          <div className="field">
            <Label htmlFor={`inote-${idea.id}`}>Add a note</Label>
            <Textarea id={`inote-${idea.id}`} rows={3} className="bg-background" value={note} onChange={(e) => setNote(e.target.value)} placeholder="A new thought, a link, a next step…" />
          </div>
          <div className="actions">
            <Button size="sm" onClick={() => {
              if (!note.trim()) return toast('Write the note first.')
              dispatch({ type: 'addIdeaNote', note: { id: crypto.randomUUID(), idea_id: idea.id, body: note.trim(), created_at: new Date().toISOString() } })
              setNote('')
              toast('Note added.')
            }}>Add note</Button>
            <ConfirmButton label="Delete idea" armed="Tap again to delete" onConfirm={() => { dispatch({ type: 'deleteIdea', id: idea.id }); toast('Deleted.') }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function Ideas() {
  const { state, dispatch } = useStore()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [labelText, setLabelText] = useState('')
  const [query, setQuery] = useState('')
  const [label, setLabel] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const it of state.ideas) for (const l of it.labels) c[l] = (c[l] || 0) + 1
    return c
  }, [state.ideas])
  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
  const activeLabel = label && counts[label] ? label : null
  const q = query.toLowerCase()
  const shown = state.ideas.filter((it) => (!activeLabel || it.labels.includes(activeLabel)) && (!q || hay(it).includes(q)))

  return (
    <>
      <Header title="Ideas" lead="Catch ideas fast, label them, and add notes as they grow." />
      <Section title="New idea">
        <div className="panel grid gap-3">
          <div className="field">
            <Label htmlFor="idea-title">Idea</Label>
            <Input id="idea-title" className="bg-background" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: a Chrome extension that summarizes Jira tickets" />
          </div>
          <div className="field">
            <Label htmlFor="idea-text">Details (optional)</Label>
            <Textarea id="idea-text" rows={3} className="bg-background" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Who it's for, why it matters, first step" />
          </div>
          <div className="field">
            <Label htmlFor="idea-labels">Labels, separated by commas</Label>
            <Input id="idea-labels" className="bg-background" list="label-options" value={labelText} onChange={(e) => setLabelText(e.target.value)} placeholder="startup, adtech, ai" />
            <datalist id="label-options">{labels.map((l) => <option key={l} value={l} />)}</datalist>
          </div>
          <div>
            <Button onClick={(e) => {
              if (!title.trim()) return toast('Write the idea first.')
              const ls = [...new Set(labelText.split(',').map((s) => s.trim().toLowerCase().replace(/^#/, '')).filter(Boolean))]
              dispatch({ type: 'addIdea', idea: { id: crypto.randomUUID(), title: title.trim(), body: body.trim(), labels: ls, created_at: new Date().toISOString(), notes: [] } })
              burst(e.currentTarget, 16)
              setTitle(''); setBody(''); setLabelText('')
              toast('Idea saved.')
            }}>Save idea</Button>
          </div>
        </div>
      </Section>

      <Section title="Your ideas" aside={state.ideas.length}>
        <div className="field mb-3">
          <Label htmlFor="idea-search">Search ideas</Label>
          <Input id="idea-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Words in the title, details, labels or notes" />
        </div>
        {labels.length > 0 && (
          <div className="chips">
            <button className="chbtn" aria-pressed={!activeLabel} onClick={() => setLabel(null)}>All <span className="font-normal text-muted-foreground">{state.ideas.length}</span></button>
            {labels.map((l) => (
              <button key={l} className="chbtn" aria-pressed={activeLabel === l} onClick={() => setLabel(l)}>
                #{l} <span className="font-normal text-muted-foreground">{counts[l]}</span>
              </button>
            ))}
          </div>
        )}
        <div className="list">
          {shown.length
            ? shown.map((it) => <IdeaCard key={it.id} idea={it} open={openId === it.id} onOpen={() => setOpenId(openId === it.id ? null : it.id)} />)
            : empty(state.ideas.length ? 'No ideas match.' : 'No ideas yet. Save your first one above.')}
        </div>
      </Section>
    </>
  )
}
