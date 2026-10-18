import { useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, Minus, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { WEEKDAYS_SHORT, nextPosition, uid } from '@/lib/content'
import { addDays, dayDiff, fmtShort, keyOf, parseKey } from '@/lib/dates'
import {
  DONE, HABIT_DEFAULTS, SLIP, chain, cleanStats, dueOn, gymMakeUp, gymStats, habitsOf, smokingStats, started, valueOn, waterStats,
} from '@/lib/habits'
import type { Habit, HabitType, State } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { praise, toast } from '@/fx/fx'
import { Chip, DoneButton, Chips, Fold, Header, IconBadge, List, Meter, Row, Section, Stats } from '@/components/kit'
import { FormSheet, PlusButton, RowEdit, TextField, WeekdaysField, fail, move, useSheet } from '@/components/edit'
import { usePageBar } from '@/components/bar'
import { HABIT_ORDER, HABIT_UI } from '@/components/habits'

const tone = (token: string) => ({ '--c': `var(${token})` }) as CSSProperties

const weekOf = (today: Date) => {
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/* ---------- Mood ---------- */

// Each face: the mouth (and brows for awful) on a round face filled with the mood's colour.
const MOODS = [
  { value: 1, label: 'Awful', mouth: 'M11.5 26.5 Q18 20 24.5 26.5', brows: 'M9 10.5 L14.5 12.5 M27 10.5 L21.5 12.5' },
  { value: 2, label: 'Bad', mouth: 'M12 25 Q18 21.5 24 25' },
  { value: 3, label: 'Okay', mouth: 'M12.5 23.5 H23.5' },
  { value: 4, label: 'Good', mouth: 'M11.5 21.5 Q18 28 24.5 21.5' },
  { value: 5, label: 'Great', mouth: 'M10.5 20.5 Q18 32 25.5 20.5 Z', filled: true },
]

function MoodFace({ value, label }: { value: number; label?: string }) {
  const m = MOODS[value - 1]
  const ink = 'var(--mood-ink)'
  return (
    <svg className="mood-face" viewBox="0 0 36 36" style={tone(`--mood-${value}`)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <circle cx="18" cy="18" r="17" fill="var(--c)" />
      <circle cx="12.5" cy="15" r="2.2" fill={ink} />
      <circle cx="23.5" cy="15" r="2.2" fill={ink} />
      {m.brows && <path d={m.brows} stroke={ink} strokeWidth="2.2" strokeLinecap="round" />}
      <path d={m.mouth} stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill={m.filled ? ink : 'none'} />
    </svg>
  )
}

// Today's mood, one tap; the week below. Stored per day (day_logs.mood) for charts later.
function MoodWidget() {
  const { state, dispatch } = useStore()
  const today = new Date()
  const k = keyOf(today)
  const day = state.days[k] ?? { done: [] }
  const set = (mood: number) => {
    const next = day.mood === mood ? null : mood
    dispatch({ type: 'day', day: k, log: { ...day, mood: next } })
    if (next) toast(`Mood: ${MOODS[next - 1].label.toLowerCase()}.`)
  }
  const [open, setOpen] = useState(false)
  const now = day.mood ? MOODS[day.mood - 1] : null
  const faces = (
    <div className="moods" role="group" aria-label="Today's mood">
      {MOODS.map((m) => (
        <button key={m.value} type="button" className="mood-btn" aria-pressed={day.mood === m.value} aria-label={m.label} title={m.label}
          style={tone(`--mood-${m.value}`)} onClick={() => { set(m.value); setOpen(false) }}>
          <MoodFace value={m.value} />
        </button>
      ))}
    </div>
  )
  const week = (
    <div className="mood-week">
      {weekOf(today).map((d) => {
        const v = state.days[keyOf(d)]?.mood
        return (
          <div key={keyOf(d)}>
            <span>{WEEKDAYS_SHORT[d.getDay()]}</span>
            {v ? <MoodFace value={v} label={MOODS[v - 1].label} /> : <span className="mood-empty" role="img" aria-label="Not logged" />}
          </div>
        )
      })}
    </div>
  )
  // Not answered today: the question and the faces, highlighted. Answered: one short row; open it to change or see the week.
  if (!now) return (
    <section>
      <div className="hcard ask mood-ask">
        <span className="hcard-name">How do you feel today?</span>
        {faces}
      </div>
    </section>
  )
  return (
    <section>
      <div className="hcard mood-card">
        <div className="hcard-head">
          <button type="button" className="hcard-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className="hcard-mood"><MoodFace value={now.value} /></span>
            <span className="hcard-text">
              <span className="hcard-name">Mood<ChevronDown className={open ? 'rotate-180' : undefined} aria-hidden="true" /></span>
              <span className="hcard-sub" style={tone(`--mood-${now.value}`)}>{now.label} today</span>
            </span>
          </button>
        </div>
        {/* Wide screens show the week beside the header; phones keep it inside, under the faces. */}
        <div className="mood-side">{week}</div>
        {open && (
          <div className="hcard-body">
            {faces}
            {week}
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------- Habit cards: one compact shell, a skin per type ---------- */

function useHabitLog(h: Habit) {
  const { state, dispatch } = useStore()
  const k = keyOf(new Date())
  return {
    value: valueOn(state, h, k),
    set: (value: number | null) => dispatch({ type: 'habitLog', habit: h.id, day: k, value }),
  }
}

// Today's tick for a habit, with the app's sound and burst.
function HabitDone({ h, label, done }: { h: Habit; label: string; done?: string }) {
  const log = useHabitLog(h)
  return <DoneButton on={log.value === DONE} label={label} done={done} onToggle={(v) => { log.set(v ? DONE : null); if (v) toast(praise()) }} />
}

function SlipButton({ h }: { h: Habit }) {
  const log = useHabitLog(h)
  if (log.value === SLIP) return <Button variant="outline" onClick={() => log.set(null)}>Undo today's slip</Button>
  return (
    <Button variant="outline" onClick={() => { log.set(SLIP); toast("Logged. A slip isn't a relapse. Keep going.") }}>Log a slip today</Button>
  )
}

// Today's glasses for a water habit, and a way to change them.
function useWaterLog(h: Habit) {
  const { state } = useStore()
  const log = useHabitLog(h)
  const { today: n, target } = waterStats(state, h, new Date())
  const add = (d: number) => {
    const v = Math.max(0, n + d)
    log.set(v || null)
    if (d > 0 && v === target) toast('Target reached.')
  }
  return { add, n, target }
}

// Header: take one back if you tapped too many.
function WaterUndo({ h }: { h: Habit }) {
  const { add, n } = useWaterLog(h)
  return <button type="button" className="icon-btn" aria-label="Remove a glass" disabled={!n} onClick={() => add(-1)}><Minus aria-hidden="true" /></button>
}

// Bottom: one press, one glass. Fills once the day's target is reached.
function WaterAdd({ h }: { h: Habit }) {
  const { add, n, target } = useWaterLog(h)
  return <DoneButton repeat icon={Plus} on={n >= target} label="Add a glass" done="Add a glass" onToggle={() => add(1)} />
}

// What a card shows folded (value, one line, today's action) and unfolded (details).
// quick: a small control or hint in the header. done: today's full-width tick at the bottom.
interface Skin { value: ReactNode; line?: ReactNode; quick?: ReactNode; done?: ReactNode; details?: ReactNode; actions?: ReactNode }

function skinOf(s: State, h: Habit, today: Date): Skin {
  switch (h.type) {
    case 'smoking': {
      const st = smokingStats(s, h, today)
      return {
        value: <>{st.clean}<small> clean {st.clean === 1 ? 'day' : 'days'}</small></>,
        line: `${st.saved.toFixed(0)} saved${st.next ? ` · next: ${st.next.label}` : ''}`,
        done: <HabitDone h={h} label="Mark smoke-free today" done="Smoke-free today" />,
        details: <>
          <Stats items={[
            { value: st.saved.toFixed(0), label: 'money saved' },
            { value: st.avoided, label: 'cigarettes avoided' },
            { value: st.slips, label: st.slips === 1 ? 'slip' : 'slips' },
          ]} />
          {st.next && (
            <div className="grid gap-2">
              <div><b>Next: {st.next.label}</b> <span className="text-muted-foreground">{st.next.text}</span></div>
              <Meter value={st.toNext} label={`Progress to ${st.next.label}`} />
            </div>
          )}
          <Fold title="Health milestones" meta={`${st.milestones.filter((m) => m.hit).length}/${st.milestones.length}`}>
            <div>{st.milestones.map((m) => <div key={m.label} className={`mile${m.hit ? ' hit' : ''}`}><i /><div><b>{m.label}</b> <span className="text-muted-foreground">{m.text}</span></div></div>)}</div>
          </Fold>
        </>,
        actions: <SlipButton h={h} />,
      }
    }
    case 'break': {
      const st = cleanStats(s, h, today)
      return {
        value: <>{st.clean}<small> clean {st.clean === 1 ? 'day' : 'days'}</small></>,
        line: `Longest run ${st.best} · ${st.slips} ${st.slips === 1 ? 'slip' : 'slips'}`,
        done: <HabitDone h={h} label="Mark clean today" done="Clean today" />,
        details: <>
          <Stats items={[
            { value: st.run, label: 'current run' },
            { value: st.best, label: 'longest run' },
            { value: st.slips, label: st.slips === 1 ? 'slip' : 'slips' },
          ]} />
        </>,
        actions: <SlipButton h={h} />,
      }
    }
    case 'build': {
      const c = chain(s, h, today)
      return {
        value: c.complete ? <>Built<small> {c.run}-day streak</small></> : <>{Math.min(c.day, c.target)}<small> of {c.target} days</small></>,
        line: c.complete ? 'You did it. Keep the chain going.' : (
          <span className="chain" role="img" aria-label={`${c.run} of ${c.target} days in a row`}>
            {Array.from({ length: c.target }, (_, i) => <i key={i} className={i < c.run ? 'on' : i === c.run ? 'now' : ''} />)}
          </span>
        ),
        done: <HabitDone h={h} label="Mark today done" />,
        details: <div className="widget-sub">A missed day starts the chain again. After {c.target} days in a row the habit counts as built.</div>,
      }
    }
    case 'gym': {
      const st = gymStats(s, h, today)
      const makeUp = gymMakeUp(s, h, today)
      return {
        value: <>{st.week}/{st.perWeek}<small> this week</small></>,
        line: (
          <span className="gym-line">
            <span className="gym-days">
              {weekOf(today).map((d) => {
                const gym = h.days.includes(d.getDay())
                const done = valueOn(s, h, keyOf(d)) === DONE
                return <i key={keyOf(d)} className={done ? 'on' : gym ? 'due' : undefined} title={WEEKDAYS_SHORT[d.getDay()]}>{WEEKDAYS_SHORT[d.getDay()][0]}</i>
              })}
            </span>
            {!dueOn(h, today) && !makeUp && <span>Next: {nextGymDay(h, today)}</span>}
          </span>
        ),
        // Any day can be logged: the goal is per week, so a missed day can be made up later.
        done: <HabitDone h={h} label={makeUp ? `Catch up on ${makeUp}` : 'Mark workout done'} done="Workout done" />,
        details: <Stats items={[
          { value: st.month, label: 'this month' },
          { value: st.total, label: 'in total' },
          { value: h.days.length, label: 'days a week' },
        ]} />,
      }
    }
    case 'water': {
      const st = waterStats(s, h, today)
      return {
        value: <>{st.today}/{st.target}<small> glasses</small></>,
        quick: <WaterUndo h={h} />,
        done: <WaterAdd h={h} />,
        details: <>
          <div className="bars">
            {st.week.map((d) => (
              <div key={keyOf(d.day)} className={d.future ? 'future' : undefined}>
                <i style={{ '--pct': `${Math.min(1, d.value / st.target) * 100}%` } as CSSProperties} aria-label={`${d.value} glasses`} />
                <span>{WEEKDAYS_SHORT[d.day.getDay()]}</span>
              </div>
            ))}
          </div>
          <div className="widget-sub">{st.onTarget} {st.onTarget === 1 ? 'day' : 'days'} on target</div>
        </>,
      }
    }
  }
}

// The first gym day after today, as "Mon".
const nextGymDay = (h: Habit, today: Date) => {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, i)
    if (h.days.includes(d.getDay())) return WEEKDAYS_SHORT[d.getDay()]
  }
  return ''
}

const START_LABEL: Record<HabitType, string> = {
  smoking: 'Quit day', break: 'First clean day', build: 'Day 1', gym: 'First week from', water: 'Start',
}

// A short card: icon, name, the main number and today's action. Tap it for the details.
// Wide screens (above the compact breakpoint) have room for the details, so cards start open there.
const wide = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 721px)').matches

function HabitCard({ h }: { h: Habit }) {
  const { state } = useStore()
  const [open, setOpen] = useState(wide)
  const today = new Date()
  const ui = HABIT_UI[h.type]
  const on = started(h, today)
  const skin = on ? skinOf(state, h, today) : null
  const waiting = h.start_date
    ? `${START_LABEL[h.type]} ${fmtShort(parseKey(h.start_date))}, in ${dayDiff(today, parseKey(h.start_date))} days`
    : 'Not started'
  return (
    <div className="hcard" style={tone(ui.color)}>
      <div className="hcard-head">
        <button type="button" className="hcard-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <IconBadge icon={ui.icon} label={ui.label} color={ui.color} />
          <span className="hcard-text">
            <span className="hcard-name">{h.name}<ChevronDown className={open ? 'rotate-180' : undefined} aria-hidden="true" /></span>
            <span className="hcard-value">{skin ? skin.value : waiting}</span>
          </span>
        </button>
        {skin?.quick}
      </div>
      {skin?.line && <div className="hcard-line">{skin.line}</div>}
      {skin?.done}
      {open && (
        <div className="hcard-body">
          {h.why && <div className="widget-sub">{h.why}</div>}
          {skin?.details}
          {skin?.actions && <div className="hcard-foot">{skin.actions}</div>}
        </div>
      )}
    </div>
  )
}

/* ---------- Adding and editing ---------- */

const singleTaken = (s: State, except?: string) =>
  new Set(s.habits.filter((x) => x.id !== except && HABIT_DEFAULTS[x.type].single).map((x) => x.type))

function newHabit(s: State): Habit {
  const taken = singleTaken(s)
  const type = HABIT_ORDER.find((t) => !taken.has(t)) ?? 'build'
  const d = HABIT_DEFAULTS[type]
  return {
    id: uid(), type, name: d.name, why: null, start_date: keyOf(new Date()), days: d.days, position: nextPosition(s.habits),
    custom_data: d.data, created_at: new Date().toISOString(),
  }
}

// The + picker: ready-made trackers (one each, with their own screens and content), then the ones you name yourself.
const PICK_GROUPS: { label: string; types: HabitType[] }[] = [
  { label: 'Ready-made', types: ['gym', 'water', 'smoking'] },
  { label: 'Your own', types: ['build', 'break'] },
]

const num = (v: string) => (v === '' ? undefined : Number(v))

function HabitSheet({ habit, ...sheet }: { habit: Habit; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const isNew = !state.habits.some((x) => x.id === habit.id)
  const [h, setH] = useState(habit)
  const set = (patch: Partial<Habit>) => setH({ ...h, ...patch })
  const setData = (patch: Partial<Habit['custom_data']>) => set({ custom_data: { ...h.custom_data, ...patch } })
  const pick = (type: HabitType) => {
    const d = HABIT_DEFAULTS[type]
    setH({ ...h, type, name: d.name, days: d.days, custom_data: d.data })
  }
  const taken = singleTaken(state, habit.id)

  return (
    <FormSheet {...sheet} title={isNew ? 'New tracker' : `Edit ${habit.name}`} submit={isNew ? 'Add tracker' : 'Save'}
      onDelete={isNew ? undefined : () => { dispatch({ type: 'deleteHabit', id: habit.id }); toast(`${habit.name} deleted.`) }}
      confirmDelete={{ title: `Delete ${habit.name}?`, description: "Its history goes with it. This can't be undone." }}
      onSubmit={() => {
        if (!h.name.trim()) return fail('Give it a name first.')
        if (h.type === 'gym' && !h.days.length) return fail('Pick at least one day.')
        dispatch({ type: 'putHabit', habit: { ...h, name: h.name.trim(), why: h.why?.trim() || null } })
        toast(isNew ? `${h.name.trim()} added.` : 'Saved.')
      }}>
      {isNew && (
        <div className="field span-all">
          <Label>Tracker</Label>
          <div className="pick">
            {PICK_GROUPS.map((g) => {
              const types = g.types.filter((t) => !taken.has(t))
              return types.length > 0 && (
                <div key={g.label} className="pick-group" role="group" aria-label={g.label}>
                  <span className="pick-label">{g.label}</span>
                  <Chips className="m-0">
                    {types.map((t) => {
                      const u = HABIT_UI[t]
                      return <Chip key={t} pressed={h.type === t} onClick={() => pick(t)} icon={u.icon} tone={u.color}>{u.label}</Chip>
                    })}
                  </Chips>
                </div>
              )
            })}
          </div>
          <span className="text-caption text-muted-foreground">{HABIT_UI[h.type].pitch}</span>
        </div>
      )}
      {/* Ready-made trackers keep their own name. */}
      {!HABIT_DEFAULTS[h.type].single && (
        <TextField label="Name" value={h.name} onChange={(name) => set({ name })} required full
          placeholder={h.type === 'break' ? 'No sugar' : 'Meditate 10 minutes'} />
      )}
      <TextField label="Why" value={h.why ?? ''} onChange={(why) => set({ why })} placeholder="Your reason, in one line (optional)" full />
      <div className="grid2">
        <TextField label={START_LABEL[h.type]} type="date" value={h.start_date ?? ''} onChange={(start_date) => set({ start_date: start_date || null })} />
        {h.type === 'water' && <TextField label="Glasses a day" type="number" value={String(h.custom_data.target ?? '')} onChange={(v) => setData({ target: num(v) })} />}
        {h.type === 'smoking' && <>
          <TextField label="Cigarettes a day, before" type="number" value={String(h.custom_data.per_day ?? '')} onChange={(v) => setData({ per_day: num(v) })} />
          <TextField label="Price of a pack of 20" type="number" value={String(h.custom_data.price ?? '')} onChange={(v) => setData({ price: num(v) })} />
        </>}
      </div>
      {h.type === 'gym' && <WeekdaysField value={h.days} onChange={(days) => set({ days })} />}
    </FormSheet>
  )
}

/* ---------- The page ---------- */

export function Wellbeing() {
  const { state, dispatch } = useStore()
  const sheet = useSheet<Habit>()
  const habits = habitsOf(state)
  const [edit, setEdit] = useState(false)
  usePageBar({
    actions: habits.length ? [{ label: 'Edit', icon: Pencil, onSelect: () => setEdit(true) }] : [],
    done: edit ? () => setEdit(false) : undefined,
  })
  const reorder = (i: number, d: -1 | 1) => {
    const ys = move(habits, i, d)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putHabit' as const, habit: { ...x, position: j } }])) })
  }
  return (
    <>
      <Header title="Wellbeing" lead="Your mood, and habits to build or break.">
        <PlusButton label="Add a tracker" onClick={() => sheet.open(newHabit(state))} />
      </Header>
      <MoodWidget />
      <Section title="Habits">
        {edit ? (
          <List>
            {habits.map((h, i) => (
              <Row key={h.id} title={h.name} sub={HABIT_UI[h.type].label} style={tone(HABIT_UI[h.type].color)}
                tag={<RowEdit label={h.name} onEdit={() => sheet.open(h)}
                  onUp={i > 0 ? () => reorder(i, -1) : undefined} onDown={i < habits.length - 1 ? () => reorder(i, 1) : undefined} />} />
            ))}
          </List>
        ) : habits.length
          ? <div className="widgets">{habits.map((h) => <HabitCard key={h.id} h={h} />)}</div>
          : <List empty="No habits yet. Tap + to add a tracker: gym, water, quitting smoking, or a habit of your own." />}
      </Section>
      {sheet.value && <HabitSheet key={sheet.value.id} {...sheet.props} habit={sheet.value} />}
    </>
  )
}
