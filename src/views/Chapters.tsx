import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CH, CH_ORDER, DOC_URL, PROJECTS, TASKS } from '@/data/plan'
import type { ChapterId, ProjectStatus } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { burst, toast } from '@/fx/fx'
import { Check, Header, Row, Section, cvar, useDebounced } from '@/components/kit'
import { usePlanToggle } from './Plan'

const LABEL: Record<ProjectStatus, string> = { todo: 'Not started', doing: 'In progress', done: 'Done' }
const NEXT: Record<ProjectStatus, ProjectStatus> = { todo: 'doing', doing: 'done', done: 'todo' }

export function Chapters() {
  const { state, dispatch } = useStore()
  const toggle = usePlanToggle()
  const [ch, setCh] = useState<ChapterId>('tech')
  const [noteState, setNoteState] = useState('Saves as you type')
  const ts = TASKS.filter((t) => t.ch === ch)
  const d = ts.filter((t) => state.plan[t.id]).length
  const saveNote = useDebounced(({ chapter, body }: { chapter: string; body: string }) => {
    dispatch({ type: 'chapterNote', chapter, body })
    setNoteState('Saved')
  })

  return (
    <>
      <Header title={CH[ch].name} lead={<>{d} of {ts.length} plan tasks done. Full resources are in the <a href={DOC_URL} target="_blank" rel="noopener">roadmap doc</a>.</>} />
      <div className="chips">
        {CH_ORDER.map((c) => (
          <button key={c} className="chbtn" style={cvar(c)} aria-pressed={ch === c} onClick={() => setCh(c)}>
            <span className="dot" />{CH[c].short}
          </button>
        ))}
      </div>

      <Section title="Plan tasks" aside="Tap to tick">
        <div className="list">
          {ts.map((t) => (
            <Row key={t.id} ch={t.ch} done={!!state.plan[t.id]} title={t.text} tag={`Q${t.q}${t.m !== null ? `.${t.m + 1}` : ''}`}
              check={<Check on={!!state.plan[t.id]} label={t.text} onToggle={(on) => toggle(t.id, on)} />} />
          ))}
        </div>
      </Section>

      <Section title="Projects" aside="Tap the status to change it">
        <div className="list">
          {PROJECTS.filter((p) => p.ch === ch).map((p) => {
            const sv = state.projects[p.id] ?? 'todo'
            return (
              <div key={p.id} className="row" style={cvar(p.ch)}>
                <span className="row-tag" style={{ paddingTop: 2, fontWeight: 700, color: 'var(--ink)' }}>{p.id}</span>
                <div className="row-body"><div className="row-title">{p.name}</div></div>
                <button className={`status ${sv}`} aria-label={`${p.name}: ${LABEL[sv]}. Change status`} onClick={(e) => {
                  const nx = NEXT[sv]
                  dispatch({ type: 'project', projectId: p.id, status: nx })
                  if (nx === 'done') {
                    burst(e.currentTarget.closest('.row')!, 26)
                    toast(`Project ${p.id} done.`)
                  }
                }}>{LABEL[sv]}</button>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Chapter notes" aside={noteState}>
        <div className="panel">
          <div className="field">
            <Label htmlFor={`cnote-${ch}`}>What you learned, links, ideas</Label>
            <Textarea key={ch} id={`cnote-${ch}`} rows={6} className="bg-background" defaultValue={state.chapterNotes[ch] ?? ''} onChange={(e) => {
              setNoteState('Typing…')
              saveNote({ chapter: ch, body: e.target.value })
            }} />
          </div>
        </div>
      </Section>
    </>
  )
}
