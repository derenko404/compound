import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ALL_CHAPTERS, CH, WEEKDAYS } from '@/data/plan'
import { fmtShort, fmtStamp, keyOf, parseKey } from '@/lib/dates'
import type { ChapterId, Repeat } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { toast } from '@/fx/fx'
import { ConfirmButton, Header, Section, cvar, empty } from '@/components/kit'

export function ChapterSelect({ id, value, onChange }: { id: string; value: ChapterId; onChange: (c: ChapterId) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ChapterId)}>
      <SelectTrigger id={id} className="w-full bg-background"><SelectValue /></SelectTrigger>
      <SelectContent>
        {ALL_CHAPTERS.map((c) => (
          <SelectItem key={c} value={c}><span className="dot" style={cvar(c)} />{CH[c].name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function Notes() {
  const { state, dispatch } = useStore()
  const [text, setText] = useState('')
  const [noteCh, setNoteCh] = useState<ChapterId>('tech')
  const [title, setTitle] = useState('')
  const [taskCh, setTaskCh] = useState<ChapterId>('own')
  const [repeat, setRepeat] = useState<Repeat>('once')
  const [date, setDate] = useState(keyOf(new Date()))
  const [weekday, setWeekday] = useState(1)

  const addNote = () => {
    if (!text.trim()) return toast('Write something first.')
    dispatch({ type: 'addNote', note: { id: crypto.randomUUID(), chapter: noteCh, body: text.trim(), created_at: new Date().toISOString() } })
    setText('')
    toast('Note saved.')
  }
  const addTask = () => {
    if (!title.trim()) return toast('Give the task a name first.')
    if (repeat === 'once' && !date) return toast('Pick a date first.')
    dispatch({
      type: 'addTask',
      task: {
        id: crypto.randomUUID(), title: title.trim(), chapter: taskCh, repeat,
        date: repeat === 'once' ? date : null, weekday: repeat === 'weekly' ? weekday : null, created_at: new Date().toISOString(),
      },
    })
    setTitle('')
    toast('Task added.')
  }

  return (
    <>
      <Header title="Notes and your own tasks" lead="Write down what you learn, and add tasks that show up on your Today list." />
      <Section title="New note">
        <div className="panel grid gap-3">
          <div className="field">
            <Label htmlFor="note-text">Note</Label>
            <Textarea id="note-text" className="bg-background" value={text} onChange={(e) => setText(e.target.value)} placeholder="An insight, a link, a question for later…" />
          </div>
          <div className="field max-w-xs">
            <Label htmlFor="note-ch">Chapter</Label>
            <ChapterSelect id="note-ch" value={noteCh} onChange={setNoteCh} />
          </div>
          <div><Button onClick={addNote}>Save note</Button></div>
        </div>
      </Section>

      <Section title="Add a task">
        <div className="panel">
          <div className="grid2">
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <Label htmlFor="item-title">Task</Label>
              <Input id="item-title" className="bg-background" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: watch one Hussein Nasser video" />
            </div>
            <div className="field">
              <Label htmlFor="item-ch">Chapter</Label>
              <ChapterSelect id="item-ch" value={taskCh} onChange={setTaskCh} />
            </div>
            <div className="field">
              <Label htmlFor="item-repeat">When</Label>
              <Select value={repeat} onValueChange={(v) => setRepeat(v as Repeat)}>
                <SelectTrigger id="item-repeat" className="w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once, on a date</SelectItem>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {repeat === 'once' && (
              <div className="field">
                <Label htmlFor="item-date">Date</Label>
                <Input type="date" id="item-date" className="bg-background" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            )}
            {repeat === 'weekly' && (
              <div className="field">
                <Label htmlFor="item-weekday">Day</Label>
                <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
                  <SelectTrigger id="item-weekday" className="w-full bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="actions"><Button onClick={addTask}>Add task</Button></div>
        </div>
      </Section>

      <Section title="Your tasks" aside={state.tasks.length}>
        <div className="list">
          {state.tasks.length ? state.tasks.map((t) => (
            <div key={t.id} className="row" style={cvar(t.chapter)}>
              <span className="dot" style={{ marginTop: 8 }} />
              <div className="row-body">
                <div className="row-title">{t.title}</div>
                <div className="row-sub">
                  {t.repeat === 'daily' ? 'Every day' : t.repeat === 'weekly' ? `Every ${WEEKDAYS[t.weekday ?? 0]}` : `On ${fmtShort(parseKey(t.date!))}`}
                </div>
              </div>
              <ConfirmButton label="Delete" armed="Tap again to delete" onConfirm={() => { dispatch({ type: 'deleteTask', id: t.id }); toast('Deleted.') }} />
            </div>
          )) : empty('No tasks of your own yet. Add one above and it appears on Today.')}
        </div>
      </Section>

      <Section title="Your notes" aside={state.notes.length}>
        <div className="list">
          {state.notes.length ? state.notes.map((n) => (
            <div key={n.id} className="note" style={cvar(n.chapter)}>
              <div className="note-meta">
                <span className="dot" /><span>{CH[n.chapter]?.name}</span><span>{fmtStamp(n.created_at)}</span>
                <ConfirmButton label="Delete" armed="Tap again to delete" onConfirm={() => { dispatch({ type: 'deleteNote', id: n.id }); toast('Deleted.') }} />
              </div>
              <div className="note-text">{n.body}</div>
            </div>
          )) : empty('No notes yet. Your first one goes above.')}
        </div>
      </Section>
    </>
  )
}
