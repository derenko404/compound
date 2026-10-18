import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, CircleHelp } from 'lucide-react'
import { DEFAULT_START, chapterOf, chapters, describeWhen, monthLabel, monthRange, program, HOW_IT_WORKS } from '@/lib/content'
import { allTasks, programPos, quarterPlan, startDate, tasksInQuarter } from '@/lib/derive'
import type { ChapterId, Program, QuarterPlan } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { celebrate, praise, toast } from '@/fx/fx'
import { ChapterTag, Linkify } from '@/components/guide'
import { Banner, Check, Chip, Dot, Header, LinkCard, List, Row, Section, cvar } from '@/components/kit'
import { AreaField, ChapterField, EditToggle, FormSheet, RowEdit, SelectField, TextField, useSheet } from '@/components/edit'

export function usePlanToggle() {
  const { state, dispatch } = useStore()
  return (id: string, on: boolean) => {
    dispatch({ type: 'plan', taskId: id, doneAt: on ? new Date().toISOString() : null })
    if (!on) return
    const t = allTasks(state).find((x) => x.id === id)
    const q = t ? Math.floor(t.to / 3) + 1 : 0
    if (t && tasksInQuarter(state, q).every((x) => x.id === id || state.plan[x.id])) {
      setTimeout(celebrate, 200)
      toast(`Q${q} complete. Huge.`)
    } else toast('Plan task done. ' + praise())
  }
}

function QuarterSheet({ q, plan, open, onOpenChange }: { q: number; plan: QuarterPlan; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const [focus, setFocus] = useState<ChapterId | null>(plan.focus)
  const [project, setProject] = useState(plan.project)
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={`Q${q}`} description="The focus chapter gets the study sessions and the weekend project block."
      onSubmit={() => {
        const p = program(state)
        const quarters = Array.from({ length: Math.max(p.quarters.length, q) }, (_, i) => p.quarters[i] ?? { focus: null, project: '' })
        quarters[q - 1] = { focus, project: project.trim() }
        dispatch({ type: 'settings', patch: { program: { ...p, quarters } } })
        toast('Quarter saved.')
      }}>
      <ChapterField label="Focus chapter" value={focus} onChange={setFocus} allowNone="No focus" />
      <TextField label="Weekend project" value={project} onChange={setProject} placeholder="T1: URL shortener on AWS" full />
    </FormSheet>
  )
}

function ProgramSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const p0 = program(state)
  const [start, setStart] = useState(state.settings.start_date || DEFAULT_START)
  const [months, setMonths] = useState(String(p0.months))
  const [motivation, setMotivation] = useState(p0.motivation ?? '')
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} wide title="Program" description="Quarters, months and day numbers follow the start date."
      onSubmit={() => {
        const program: Program = { ...p0, months: Number(months), motivation: motivation.trim() || undefined }
        dispatch({ type: 'settings', patch: { start_date: start, program } })
        toast('Program saved.')
      }}>
      <div className="grid2">
        <TextField label="Start date" type="date" value={start} onChange={setStart} required />
        <SelectField label="Length" value={months} onChange={setMonths}
          options={[3, 6, 9, 12, 18, 24, 36].map((m) => ({ value: String(m), label: `${m} months` }))} />
      </div>
      <AreaField label="Motivation" value={motivation} onChange={setMotivation} rows={4} hint="Why you're doing this. Shown under the plan's title." />
    </FormSheet>
  )
}

function Timeline({ sel, onSelect }: { sel: number; onSelect: (q: number) => void }) {
  const { state } = useStore()
  const pos = programPos(state, new Date())
  const len = program(state).months
  const start = startDate(state)
  const pct = (m: number) => `${(m / len) * 100}%`
  const quarters = Array.from({ length: pos.quarters }, (_, i) => i + 1)
  return (
    <div className="panel timeline">
      <div className="tl-row">
        <span />
        <div className="tl-head">{quarters.map((q) => <span key={q} style={{ left: pct((q - 1) * 3 + 1.5) }} title={monthLabel(start, (q - 1) * 3)}>Q{q}</span>)}</div>
      </div>
      {chapters(state, 'learn').map((c) => (
        <div key={c.id} className="tl-row" style={cvar(c.id)}>
          <Link to="/chapters/$ch" params={{ ch: c.id }} className="tl-name"><Dot />{c.name}</Link>
          <div className="tl-track">
            <div className="tl-bar" style={{ left: pct(c.start), width: pct(Math.min(c.months, len - c.start)) }} />
            {quarters.filter((q) => quarterPlan(state, q).focus === c.id).map((q) => (
              <button key={q} className={`tl-focus${q === sel ? ' sel' : ''}`} style={{ left: pct((q - 1) * 3), width: pct(3) }}
                aria-label={`Q${q} focus: ${c.name}`} onClick={() => onSelect(q)} />
            ))}
            {!pos.before && !pos.finished && <span className="tl-now" style={{ left: pct(pos.m + 0.5) }} />}
          </div>
        </div>
      ))}
      <p className="mt-1 text-caption text-muted-foreground">Solid blocks are focus quarters. The line marks this month.</p>
    </div>
  )
}

export function Plan() {
  const { state } = useStore()
  const toggle = usePlanToggle()
  const pos = programPos(state, new Date())
  const start = startDate(state)
  const [selQ, setSelQ] = useState<number | null>(null)
  const [edit, setEdit] = useState(false)
  const sheet = useSheet<'program' | number>()
  const p = program(state)
  const q = Math.min(selQ ?? pos.q, pos.quarters)
  const Qs = quarterPlan(state, q)
  const plan = state.plan
  const quarters = Array.from({ length: pos.quarters }, (_, i) => i + 1)
  const order = new Map(chapters(state, 'learn').map((c, i) => [c.id, i]))

  const next = allTasks(state)
    .filter((t) => !plan[t.id] && t.to >= pos.m)
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .slice(0, 5)
  const qTasks = tasksInQuarter(state, q).sort((a, b) => (order.get(a.ch) ?? 0) - (order.get(b.ch) ?? 0) || a.from - b.from)

  return (
    <>
      <Header title="The plan" lead={p.motivation ? <Linkify text={p.motivation} /> : undefined}>
        <EditToggle on={edit} onChange={setEdit} />
      </Header>

      {edit && (
        <Banner actions={<Chip onClick={() => sheet.open('program')}>Program settings</Chip>}>
          Set the start date and length, the focus of each quarter, and your motivation. Chapter dates and tasks are edited on each chapter.
        </Banner>
      )}

      <Section title="Timeline" aside={`${p.months} months from ${start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}>
        <Timeline sel={q} onSelect={setSelQ} />
      </Section>

      <div className="strip">
        {quarters.map((n) => {
          const ts = tasksInQuarter(state, n)
          const d = ts.filter((t) => plan[t.id]).length
          const f = quarterPlan(state, n).focus
          return (
            <button key={n} className={`qbtn${n === pos.q ? ' now' : ''}`} style={cvar(f)} aria-pressed={n === q} onClick={() => setSelQ(n)}>
              <b>Q{n}</b><span>{monthRange(start, (n - 1) * 3, Math.min(n * 3, p.months) - 1)}</span><span>{chapterOf(state, f)?.name ?? 'No focus'}</span>
              <div className="qbar"><i style={{ width: `${ts.length ? (d / ts.length) * 100 : 0}%` }} /></div>
            </button>
          )
        })}
      </div>

      <Section title="Next up" aside="Your closest open tasks">
        <List empty="Everything ahead is done.">
          {next.map((t) => (
            <Row key={t.id} ch={t.ch} title={<Linkify text={t.text} />} sub={monthRange(start, t.from, t.to)} tag={<ChapterTag ch={t.ch} />}
              check={<Check on={false} label={t.text} onToggle={(on) => toggle(t.id, on)} />} />
          ))}
        </List>
      </Section>

      <Section title={`Q${q}, ${monthRange(start, (q - 1) * 3, Math.min(q * 3, p.months) - 1)}`}
        aside={edit
          ? <RowEdit label={`Q${q}`} onEdit={() => sheet.open(q)} />
          : `Focus: ${chapterOf(state, Qs.focus)?.name ?? 'none'}${Qs.project ? `. Weekend project: ${Qs.project}` : ''}`}>
        <List empty="No tasks in this quarter yet. Add them on a chapter page.">
          {qTasks.map((t) => (
            <Row key={t.id} ch={t.ch} done={!!plan[t.id]} title={<Linkify text={t.text} />}
              sub={`${chapterOf(state, t.ch)?.name}, ${monthRange(start, t.from, t.to)}`} tag={<ChapterTag ch={t.ch} label={t.ch === Qs.focus ? 'Focus' : 'Light'} />}
              check={<Check on={!!plan[t.id]} label={t.text} onToggle={(on) => toggle(t.id, on)} />} />
          ))}
        </List>
      </Section>

      <Section title="Weekly rhythm" aside={<Link to="/today">Edit on Today</Link>}>
        <List empty="No routines yet.">
          {[...state.routines].filter((r) => r.when.kind !== 'once').sort((a, b) => a.position - b.position).map((r) => (
            <Row key={r.id} ch={r.fill ? Qs.focus : r.chapter} title={r.title} sub={describeWhen(r.when)}
              tag={r.fill ? { focus: 'Focus chapter', light: 'Other chapters', project: 'Quarter project' }[r.fill] : <ChapterTag ch={r.chapter} />} />
          ))}
        </List>
      </Section>

      <Section title="Skills by chapter" aside="Re-score 1 to 5 each month">
        <div className="card-grid">
          {chapters(state, 'learn').filter((c) => c.skills.length).map((c) => (
            <LinkCard key={c.id} to="/chapters/$ch" params={{ ch: c.id }} ch={c.id} title={c.name} sub={c.skills.join(' · ')} />
          ))}
        </div>
      </Section>

      <section>
        <details className="faq">
          <summary>
            <CircleHelp aria-hidden="true" />
            <span>How it works</span>
            <ChevronDown className="chev" aria-hidden="true" />
          </summary>
          <ul className="faq-list">{HOW_IT_WORKS.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </details>
      </section>

      {sheet.value === 'program' && <ProgramSheet {...sheet.props} />}
      {typeof sheet.value === 'number' && <QuarterSheet key={sheet.value} {...sheet.props} q={sheet.value} plan={quarterPlan(state, sheet.value)} />}
    </>
  )
}
