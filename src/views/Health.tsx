import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { chapters, program } from '@/lib/content'
import { addDays, dayDiff, fmtShort, keyOf, parseKey } from '@/lib/dates'
import { checkCount } from '@/lib/derive'
import type { Chapter, Components } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { toast } from '@/fx/fx'
import { ConfirmButton, Dot, Header, List, MoreText, Panel, Section, cvar } from '@/components/kit'
import { PlusButton, useSheet } from '@/components/edit'
import { Linkify } from '@/components/guide'
import { ChapterSheet, ComponentsSheet, newChapter, useChapterSave } from './chapterForms'

function Sparkline({ pts }: { pts: { w: number }[] }) {
  const W = 600, H = 90, padX = 34, padY = 14
  const ws = pts.map((p) => p.w)
  const lo = Math.min(...ws), hi = Math.max(...ws), span = hi - lo || 1
  const X = (i: number) => padX + (i / (pts.length - 1)) * (W - padX - 10)
  const Y = (w: number) => padY + (1 - (w - lo) / span) * (H - padY * 2)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.w).toFixed(1)}`).join(' ')
  const area = `${line} L${X(pts.length - 1).toFixed(1)} ${H - padY} L${X(0).toFixed(1)} ${H - padY} Z`
  const last = pts[pts.length - 1]
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight trend, last ${pts.length} entries`}>
      <line x1={padX} x2={W - 10} y1={Y(hi)} y2={Y(hi)} stroke="var(--border)" />
      <line x1={padX} x2={W - 10} y1={Y(lo)} y2={Y(lo)} stroke="var(--border)" />
      <text x="0" y={Y(hi) + 4} fontSize="11" fill="var(--muted-foreground)">{hi.toFixed(1)}</text>
      <text x="0" y={Y(lo) + 4} fontSize="11" fill="var(--muted-foreground)">{lo.toFixed(1)}</text>
      <path d={area} fill="var(--c)" fillOpacity=".12" />
      <path d={line} fill="none" stroke="var(--c)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={X(pts.length - 1)} cy={Y(last.w)} r="4.5" fill="var(--c)" />
    </svg>
  )
}

type Quit = NonNullable<Components['quit']>
type Workout = NonNullable<Components['workout']>

function QuitPanel({ c, quit }: { c: Chapter; quit: Quit }) {
  const { state, dispatch } = useStore()
  const save = useChapterSave()
  const today = new Date()
  const [date, setDate] = useState(keyOf(addDays(today, 14)))
  const [perDay, setPerDay] = useState(String(quit.per_day))
  const [price, setPrice] = useState(String(quit.price))
  const setQuit = (patch: Partial<Quit>) => save({ ...c, components: { ...c.components, quit: { ...quit, ...patch } } })

  if (!quit.date)
    return (
      <>
        <p className="lead mb-4 mt-0">Not started. When you're ready, set a quit date. The app then counts your clean days, money saved and milestones, and adds a daily check to Today.</p>
        <div className="grid2">
          <div className="field"><Label htmlFor={`${c.id}-q-date`}>Quit date</Label><Input type="date" id={`${c.id}-q-date`} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><Label htmlFor={`${c.id}-q-pd`}>{quit.unit} per day</Label><Input type="number" id={`${c.id}-q-pd`} min={0} value={perDay} onChange={(e) => setPerDay(e.target.value)} /></div>
          <div className="field"><Label htmlFor={`${c.id}-q-price`}>Price per 20</Label><Input type="number" id={`${c.id}-q-price`} min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </div>
        <div className="actions">
          <Button onClick={() => {
            if (!date) return toast('Pick a quit date first.')
            setQuit({ date, per_day: Number(perDay) || 0, price: Number(price) || 0 })
            toast('Quit date set. You can do this.')
          }}>Set quit date</Button>
        </div>
      </>
    )

  const qd = parseKey(quit.date)
  if (qd > today)
    return (
      <>
        <p>Quit day is <b>{fmtShort(qd)}</b>, in {dayDiff(today, qd)} days. Use the time for the prep checklist.</p>
        <ConfirmButton label="Reset quit date" armed="Tap again to reset" onConfirm={() => setQuit({ date: null })} />
      </>
    )

  const mins = Math.max(0, (Date.now() - qd.getTime()) / 6e4)
  const days = Math.max(0, dayDiff(qd, today))
  const saved = (days * quit.per_day / 20) * quit.price
  const ms = [...quit.milestones].sort((a, b) => a.mins - b.mins)
  const nextM = ms.find((m) => m.mins > mins)
  const prevM = [...ms].reverse().find((m) => m.mins <= mins)
  const frac = nextM ? (mins - (prevM?.mins ?? 0)) / (nextM.mins - (prevM?.mins ?? 0)) : 1
  const slipId = `${quit.check_id}:slip`
  // The original smoking tracker stored slips in day_logs.smoke.
  const slips = Object.values(state.days).filter((d) => d.done.includes(slipId) || (quit.check_id === 'smoke-free' && d.smoke === 'slip')).length

  return (
    <>
      <div className="big">{days}</div>
      <p className="mb-4 mt-1 text-muted-foreground">clean days{slips ? `, ${slips} slip${slips === 1 ? '' : 's'} logged` : ''}</p>
      <div className="grid2 mb-4">
        <div><b className="font-display text-stat">{saved.toFixed(0)}</b> <span className="text-muted-foreground">money saved</span></div>
        <div><b className="font-display text-stat">{Math.round(days * quit.per_day)}</b> <span className="text-muted-foreground">{quit.unit} avoided</span></div>
      </div>
      {nextM && (
        <div>
          <b>Next: {nextM.label}</b><span className="text-muted-foreground">, {nextM.text.toLowerCase()}</span>
          <div className="progress"><i style={{ width: `${Math.min(100, frac * 100)}%` }} /></div>
        </div>
      )}
      {ms.length > 0 && (
        <div className="mt-3">
          {ms.map((m) => (
            <div key={m.label} className={`mile${m.mins <= mins ? ' hit' : ''}`}><i /><div><b>{m.label}</b> <span className="text-muted-foreground">{m.text}</span></div></div>
          ))}
        </div>
      )}
      <div className="actions">
        <Button variant="outline" size="sm" onClick={() => {
          const k = keyOf(new Date())
          const d = state.days[k] ?? { done: [] }
          dispatch({ type: 'day', day: k, log: { ...d, ...(quit.check_id === 'smoke-free' ? { smoke: 'slip' as const } : {}), done: [...d.done.filter((x) => x !== quit.check_id && x !== slipId), slipId] } })
          toast("Logged. A slip isn't a relapse; keep going.")
        }}>Log a slip today</Button>
        <ConfirmButton label="Reset quit date" armed="Tap again to reset" onConfirm={() => setQuit({ date: null })} />
      </div>
    </>
  )
}

function WorkoutPanel({ c, workout }: { c: Chapter; workout: Workout }) {
  const save = useChapterSave()
  const { state } = useStore()
  const today = new Date()
  const k = keyOf(today)

  if (!workout.start)
    return (
      <>
        <p className="lead mb-4 mt-0">Not started. When you start, Today shows a workout on your chosen days, rotating through {workout.workouts.map((w) => w.name).join(', ')}.</p>
        <Button onClick={() => { save({ ...c, components: { ...c.components, workout: { ...workout, start: k } } }); toast('Workouts started.') }}>Start workouts</Button>
      </>
    )

  const wkStart = addDays(today, -((today.getDay() + 6) % 7))
  const thisWeek = [0, 1, 2, 3, 4, 5, 6].filter((i) => state.days[keyOf(addDays(wkStart, i))]?.done.includes(workout.check_id)).length
  const per = workout.days.length
  return (
    <>
      <div className="big big-sm">{thisWeek}<span className="text-dial text-muted-foreground">/{per}</span></div>
      <p className="mt-1 text-muted-foreground">workouts this week, {checkCount(state, workout.check_id)} in total</p>
      <div className="week">{Array.from({ length: per }, (_, i) => <span key={i} className={i < thisWeek ? 'on' : ''}>{workout.workouts[i % workout.workouts.length]?.name.slice(-1)}</span>)}</div>
      <div className="actions">
        <ConfirmButton label="Stop workouts" armed="Tap again to stop" onConfirm={() => save({ ...c, components: { ...c.components, workout: { ...workout, start: null } } })} />
      </div>
    </>
  )
}

function WeightPanel({ unit }: { unit: string }) {
  const { state, dispatch } = useStore()
  const k = keyOf(new Date())
  const [weight, setWeight] = useState(String(state.days[k]?.weight ?? ''))
  const weights = Object.entries(state.days)
    .filter(([, d]) => d.weight)
    .map(([day, d]) => ({ day, w: Number(d.weight) }))
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .slice(-30)
  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <div className="field flex-[1_1_160px]"><Label htmlFor="weight">Today's weight ({unit})</Label><Input type="number" id="weight" step={0.1} min={0} value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
        <Button onClick={() => {
          if (!weight) return toast('Enter a weight first.')
          dispatch({ type: 'day', day: k, log: { ...(state.days[k] ?? { done: [] }), weight: Number(weight) } })
          toast('Weight logged.')
        }}>Log weight</Button>
      </div>
      {weights.length > 1 ? <Sparkline pts={weights} /> : <p className="text-muted-foreground">Log your weight on a few mornings to see the trend here.</p>}
    </>
  )
}

// The tracker panels a chapter has switched on.
export function Trackers({ c }: { c: Chapter }) {
  const { quit, workout, weight } = c.components ?? {}
  return (
    <div className="grid gap-3" style={cvar(c.id)}>
      {quit && <Panel><QuitPanel c={c} quit={quit} /></Panel>}
      {workout && <Panel><WorkoutPanel c={c} workout={workout} /></Panel>}
      {weight && <Panel><WeightPanel unit={weight.unit} /></Panel>}
    </div>
  )
}

export function Health() {
  const { state } = useStore()
  const create = useSheet<Chapter>()
  const trackers = useSheet<Chapter>()
  const list = chapters(state, 'health')

  return (
    <>
      <Header title="Health" lead="Health points with optional trackers. Start each one whenever you're ready.">
        <PlusButton label="New health point" onClick={() => create.open(newChapter('health', state.chapters, program(state).months))} />
      </Header>
      {list.length ? list.map((c) => {
        const has = c.components && Object.keys(c.components).length > 0
        return (
          <Section key={c.id} title={<span className="inline-flex items-center gap-2"><Dot ch={c.id} />{c.name}</span>}
            aside={<span className="inline-flex gap-3"><button className="text-primary underline" onClick={() => trackers.open(c)}>Trackers</button><Link to="/chapters/$ch" params={{ ch: c.id }}>Guide</Link></span>}>
            {c.description && <div className="lead mb-3 mt-0"><MoreText><Linkify text={c.description} /></MoreText></div>}
            {has ? <Trackers c={c} /> : <List empty="No trackers yet. Tap Trackers to switch some on." />}
          </Section>
        )
      }) : <List empty="No health points yet. Add one with +." />}
      {create.value && <ChapterSheet {...create.props} chapter={create.value} onSaved={(c) => trackers.open(c)} />}
      {trackers.value && <ComponentsSheet key={trackers.value.id} {...trackers.props} chapter={trackers.value} />}
    </>
  )
}
