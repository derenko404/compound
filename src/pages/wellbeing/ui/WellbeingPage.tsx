import { useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, GlassWater } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { Label } from '@/shared/ui/primitives/label'
import { nextPosition, uid } from '@/core/domain/content'
import { addDays, dayDiff, fmtShort, keyOf, parseKey } from '@/shared/lib/dates'
import {
  DONE, HABIT_DEFAULTS, SLIP, chain, cleanStats, dueOn, gymMakeUp, gymStats, habitsOf, smokingStats, started, valueOn, waterStats,
} from '@/features/habits'
import type { Habit, HabitType, State } from '@/core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import {
  Chip, CountRow, DoneButton, Chips, Fold, Header, IconBadge, List, Meter, Row, SortList, Section, Stats, FormSheet, RemoveButton, TextField, WeekdaysField, fail, moveTo, useSheet, usePageBar,
} from '@/shared/ui'
import { HABIT_ORDER, HABIT_UI } from '@/features/habits'
import { t } from '@/shared/i18n'

const W = t.wellbeing
const WEEKDAYS_SHORT = t.nav.weekdaysShort

const tone = (token: string) => ({ '--c': `var(${token})` }) as CSSProperties

const weekOf = (today: Date) => {
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/* ---------- Mood ---------- */

// Each face: the mouth (and brows for awful) on a round face filled with the mood's colour.
const MOODS = [
  { value: 1, label: W.mood.labels[0], mouth: 'M11.5 26.5 Q18 20 24.5 26.5', brows: 'M9 10.5 L14.5 12.5 M27 10.5 L21.5 12.5' },
  { value: 2, label: W.mood.labels[1], mouth: 'M12 25 Q18 21.5 24 25' },
  { value: 3, label: W.mood.labels[2], mouth: 'M12.5 23.5 H23.5' },
  { value: 4, label: W.mood.labels[3], mouth: 'M11.5 21.5 Q18 28 24.5 21.5' },
  { value: 5, label: W.mood.labels[4], mouth: 'M10.5 20.5 Q18 32 25.5 20.5 Z', filled: true },
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
  }
  const [open, setOpen] = useState(false)
  const now = day.mood ? MOODS[day.mood - 1] : null
  const faces = (
    <div className="moods" role="group" aria-label={W.mood.group}>
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
            {v ? <MoodFace value={v} label={MOODS[v - 1].label} /> : <span className="mood-empty" role="img" aria-label={W.mood.notLogged} />}
          </div>
        )
      })}
    </div>
  )
  // Not answered today: the question and the faces, highlighted. Answered: one short row; open it to change or see the week.
  if (!now) return (
    <section>
      <div className="hcard ask mood-ask">
        <span className="hcard-name">{W.mood.ask}</span>
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
              <span className="hcard-name">{W.mood.title}<ChevronDown className={open ? 'rotate-180' : undefined} aria-hidden="true" /></span>
              <span className="hcard-sub" style={tone(`--mood-${now.value}`)}>{W.mood.today(now.label)}</span>
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
  return <DoneButton on={log.value === DONE} label={label} done={done} onToggle={(v) => log.set(v ? DONE : null)} />
}

function SlipButton({ h }: { h: Habit }) {
  const log = useHabitLog(h)
  if (log.value === SLIP) return <Button variant="outline" onClick={() => log.set(null)}>{W.slip.undo}</Button>
  return (
    <Button variant="outline" onClick={() => log.set(SLIP)}>{W.slip.log}</Button>
  )
}

// Today's glasses as a row to tap: fill one more, or tap the last filled one to take it back.
function WaterCount({ h }: { h: Habit }) {
  const { state } = useStore()
  const log = useHabitLog(h)
  const { today: n, target } = waterStats(state, h, new Date())
  return <CountRow n={n} target={target} onSet={(v) => log.set(v || null)} icon={GlassWater} unit={W.water.unit} />
}

// What a card shows folded (value, one line, today's action) and unfolded (details).
// done: today's control at the bottom (a full-width tick, or water's row of glasses).
interface Skin { value: ReactNode; line?: ReactNode; done?: ReactNode; details?: ReactNode; actions?: ReactNode }

function skinOf(s: State, h: Habit, today: Date): Skin {
  switch (h.type) {
    case 'smoking': {
      const st = smokingStats(s, h, today)
      return {
        value: <>{st.clean}<small> {W.clean.days(st.clean)}</small></>,
        line: W.smoking.line(st.saved.toFixed(0), st.next?.label),
        done: <HabitDone h={h} label={W.smoking.mark} done={W.smoking.today} />,
        details: <>
          <Stats items={[
            { value: st.saved.toFixed(0), label: W.smoking.saved },
            { value: st.avoided, label: W.smoking.avoided },
            { value: st.slips, label: W.slip.word(st.slips) },
          ]} />
          {st.next && (
            <div className="grid gap-2">
              <div><b>{W.next(st.next.label)}</b> <span className="text-muted-foreground">{st.next.text}</span></div>
              <Meter value={st.toNext} label={W.smoking.progressTo(st.next.label)} />
            </div>
          )}
          <Fold title={W.smoking.milestones} meta={`${st.milestones.filter((m) => m.hit).length}/${st.milestones.length}`}>
            <div>{st.milestones.map((m) => <div key={m.label} className={`mile${m.hit ? ' hit' : ''}`}><i /><div><b>{m.label}</b> <span className="text-muted-foreground">{m.text}</span></div></div>)}</div>
          </Fold>
        </>,
        actions: <SlipButton h={h} />,
      }
    }
    case 'break': {
      const st = cleanStats(s, h, today)
      return {
        value: <>{st.clean}<small> {W.clean.days(st.clean)}</small></>,
        line: W.clean.line(st.best, st.slips),
        done: <HabitDone h={h} label={W.clean.mark} done={W.clean.today} />,
        details: <>
          <Stats items={[
            { value: st.run, label: W.clean.run },
            { value: st.best, label: W.clean.best },
            { value: st.slips, label: W.slip.word(st.slips) },
          ]} />
        </>,
        actions: <SlipButton h={h} />,
      }
    }
    case 'build': {
      const c = chain(s, h, today)
      return {
        value: c.complete ? <>{W.build.built}<small> {W.build.streak(c.run)}</small></> : <>{Math.min(c.day, c.target)}<small> {W.build.ofDays(c.target)}</small></>,
        line: c.complete ? W.build.didIt : (
          <span className="chain" role="img" aria-label={W.build.chain(c.run, c.target)}>
            {Array.from({ length: c.target }, (_, i) => <i key={i} className={i < c.run ? 'on' : i === c.run ? 'now' : ''} />)}
          </span>
        ),
        done: <HabitDone h={h} label={W.build.mark} />,
        details: <div className="widget-sub">{W.build.details(c.target)}</div>,
      }
    }
    case 'gym': {
      const st = gymStats(s, h, today)
      const makeUp = gymMakeUp(s, h, today)
      return {
        value: <>{st.week}/{st.perWeek}<small> {W.gym.thisWeek}</small></>,
        line: (
          <span className="gym-line">
            <span className="gym-days">
              {weekOf(today).map((d) => {
                const gym = h.days.includes(d.getDay())
                const done = valueOn(s, h, keyOf(d)) === DONE
                return <i key={keyOf(d)} className={done ? 'on' : gym ? 'due' : undefined} title={WEEKDAYS_SHORT[d.getDay()]}>{WEEKDAYS_SHORT[d.getDay()][0]}</i>
              })}
            </span>
            {!dueOn(h, today) && !makeUp && <span>{W.next(nextGymDay(h, today))}</span>}
          </span>
        ),
        // Any day can be logged: the goal is per week, so a missed day can be made up later.
        done: <HabitDone h={h} label={makeUp ? W.gym.catchUp(makeUp) : W.gym.mark} done={W.gym.done} />,
        details: <Stats items={[
          { value: st.month, label: W.gym.month },
          { value: st.total, label: W.gym.total },
          { value: h.days.length, label: W.gym.perWeek },
        ]} />,
      }
    }
    case 'water': {
      const st = waterStats(s, h, today)
      return {
        value: <>{st.today}/{st.target}<small> {W.water.glasses}</small></>,
        done: <WaterCount h={h} />,
        details: <>
          <div className="bars">
            {st.week.map((d) => (
              <div key={keyOf(d.day)} className={d.future ? 'future' : undefined}>
                <i style={{ '--pct': `${Math.min(1, d.value / st.target) * 100}%` } as CSSProperties} aria-label={W.water.bar(d.value)} />
                <span>{WEEKDAYS_SHORT[d.day.getDay()]}</span>
              </div>
            ))}
          </div>
          <div className="widget-sub">{W.water.onTarget(st.onTarget)}</div>
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

const START_LABEL: Record<HabitType, string> = W.start

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
    ? W.waiting(START_LABEL[h.type], fmtShort(parseKey(h.start_date)), dayDiff(today, parseKey(h.start_date)))
    : W.notStarted
  return (
    <div className="hcard" style={tone(ui.color)}>
      <div className="hcard-head">
        <button type="button" className="hcard-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <IconBadge icon={ui.icon} label={ui.label} color={ui.color} />
          <span className="hcard-text">
            <span className="hcard-name">{h.name}<ChevronDown className={open ? 'rotate-180' : undefined} aria-hidden="true" /></span>
          </span>
        </button>
        {/* The count: on the right of the header, or under the name on wide screens with a done button. */}
        <span className="hcard-value">{skin ? skin.value : waiting}</span>
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
  const type = HABIT_ORDER.find((ty) => !taken.has(ty)) ?? 'build'
  const d = HABIT_DEFAULTS[type]
  return {
    id: uid(), type, name: d.name, why: null, start_date: keyOf(new Date()), days: d.days, position: nextPosition(s.habits),
    custom_data: d.data, created_at: new Date().toISOString(),
  }
}

// The + picker: ready-made trackers (one each, with their own screens and content), then the ones you name yourself.
const PICK_GROUPS: { label: string; types: HabitType[] }[] = [
  { label: W.form.readyMade, types: ['gym', 'water', 'smoking'] },
  { label: W.form.yourOwn, types: ['build', 'break'] },
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
    <FormSheet {...sheet} title={isNew ? W.form.new : t.common.editNamed(habit.name)} submit={isNew ? W.form.addTracker : t.common.save}
      onSubmit={() => {
        if (!h.name.trim()) return fail(W.form.nameFirst)
        if (h.type === 'gym' && !h.days.length) return fail(W.form.pickDay)
        dispatch({ type: 'putHabit', habit: { ...h, name: h.name.trim(), why: h.why?.trim() || null } })
      }}>
      {isNew && (
        <div className="field span-all">
          <Label>{W.form.tracker}</Label>
          <div className="pick">
            {PICK_GROUPS.map((g) => {
              const types = g.types.filter((ty) => !taken.has(ty))
              return types.length > 0 && (
                <div key={g.label} className="pick-group" role="group" aria-label={g.label}>
                  <span className="pick-label">{g.label}</span>
                  <Chips className="m-0">
                    {types.map((ty) => {
                      const u = HABIT_UI[ty]
                      return <Chip key={ty} pressed={h.type === ty} onClick={() => pick(ty)} icon={u.icon} tone={u.color}>{u.label}</Chip>
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
        <TextField label={W.form.name} value={h.name} onChange={(name) => set({ name })} required full
          placeholder={h.type === 'break' ? W.form.breakPlaceholder : W.form.buildPlaceholder} />
      )}
      <TextField label={W.form.why} value={h.why ?? ''} onChange={(why) => set({ why })} placeholder={W.form.whyPlaceholder} full />
      <div className="grid2">
        <TextField label={START_LABEL[h.type]} type="date" value={h.start_date ?? ''} onChange={(start_date) => set({ start_date: start_date || null })} />
        {h.type === 'water' && <TextField label={W.form.glassesADay} type="number" value={String(h.custom_data.target ?? '')} onChange={(v) => setData({ target: num(v) })} />}
        {h.type === 'smoking' && <>
          <TextField label={W.form.perDay} type="number" value={String(h.custom_data.per_day ?? '')} onChange={(v) => setData({ per_day: num(v) })} />
          <TextField label={W.form.price} type="number" value={String(h.custom_data.price ?? '')} onChange={(v) => setData({ price: num(v) })} />
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
    add: { label: W.add, onClick: () => sheet.open(newHabit(state)) },
    edit: habits.length ? () => setEdit(true) : undefined,
    done: edit ? () => setEdit(false) : undefined,
  })
  const reorder = (from: number, to: number) => {
    const ys = moveTo(habits, from, to)
    dispatch({ type: 'batch', ops: ys.flatMap((x, j) => (x.position === j ? [] : [{ type: 'putHabit' as const, habit: { ...x, position: j } }])) })
  }
  return (
    <>
      <Header title={W.title} lead={W.lead} />
      <MoodWidget />
      <Section title={W.habits}>
        {edit ? (
          <SortList onMove={reorder}>
            {habits.map((h) => (
              <Row key={h.id} title={h.name} sub={HABIT_UI[h.type].label} style={tone(HABIT_UI[h.type].color)}
                check={<RemoveButton label={t.common.deleteNamed(h.name)} title={t.common.deleteAsk(h.name)} description={W.deleteText}
                  onConfirm={() => { dispatch({ type: 'deleteHabit', id: h.id }) }} />}
                onOpen={() => sheet.open(h)} sort />
            ))}
          </SortList>
        ) : habits.length
          ? <div className="widgets">{habits.map((h) => <HabitCard key={h.id} h={h} />)}</div>
          : <List empty={W.empty} />}
      </Section>
      {sheet.value && <HabitSheet key={sheet.value.id} {...sheet.props} habit={sheet.value} />}
    </>
  )
}
