import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CH, QUARTERS, TASKS } from '@/data/plan'
import { fmtLong, fmtShort, keyOf } from '@/lib/dates'
import { bestStreak, programPos, startDate, streak, todayItems } from '@/lib/derive'
import { useStore } from '@/store/StoreProvider'
import { celebrate, praise, toast } from '@/fx/fx'
import { usePlanToggle } from './Plan'
import { Check, Dial, Row, Section, cvar, empty, useDebounced } from '@/components/kit'

export function Today() {
  const { state, dispatch } = useStore()
  const [pulse, setPulse] = useState(0)
  const today = new Date()
  const k = keyOf(today)
  const pos = programPos(state, today)
  const Q = QUARTERS[pos.q - 1]
  const items = todayItems(state, today)
  const day = state.days[k] ?? { done: [] }
  const done = new Set(day.done)
  const n = items.filter((i) => done.has(i.id)).length
  const left = items.length - n
  const saveLog = useDebounced((log: string) => {
    const d = state.days[keyOf(new Date())] ?? { done: [] }
    dispatch({ type: 'day', day: keyOf(new Date()), log: { ...d, log } })
  })

  const toggleDay = (id: string, on: boolean) => {
    const next = { ...day, done: on ? [...day.done, id] : day.done.filter((x) => x !== id) }
    if (id === 'smoke-free') next.smoke = on ? 'free' : null
    dispatch({ type: 'day', day: k, log: next })
    if (!on) return
    if (n + 1 === items.length) {
      setPulse((p) => p + 1)
      setTimeout(celebrate, 250)
      const s = streak({ ...state, days: { ...state.days, [k]: next } }, today)
      toast(`Day complete. ${s}-day streak.`)
    } else toast(praise())
  }

  const togglePlan = usePlanToggle()

  const dayLine = pos.before
    ? `Starts in ${pos.daysToStart} day${pos.daysToStart === 1 ? '' : 's'}`
    : pos.finished ? 'Program complete' : `Day ${pos.dayN} of ${pos.total}`
  const monthTasks = TASKS.filter((t) => t.q === pos.q && (t.m === null || t.m === pos.mi))

  return (
    <>
      <div className="day">
        <div>
          <h1 className="day-date">{fmtLong(today)}</h1>
          <div className="day-meta">
            <span className="chip">{dayLine}</span>
            <span className="chip">Q{pos.q}, {Q.months}</span>
            <span className="chip" style={cvar(Q.focus)}><span className="dot" />Focus: {CH[Q.focus].name}</span>
          </div>
        </div>
        <Dial n={n} total={items.length} sub="done today" pulse={pulse} />
      </div>

      {pos.before && (
        <div className="banner">
          <p>Your 18-month program starts on <b>{fmtShort(startDate(state))}</b>. Anything you tick before then counts as warm-up.</p>
          <Button size="sm" onClick={() => { dispatch({ type: 'settings', patch: { start_date: k } }); toast('Program started. Day 1.') }}>
            Start today instead
          </Button>
        </div>
      )}

      <div className="stats">
        <div className="stat"><b>{streak(state, today)}</b><span>day streak</span></div>
        <div className="stat"><b>{bestStreak(state)}</b><span>best streak</span></div>
        <div className="stat"><b>{Object.keys(state.plan).length}/{TASKS.length}</b><span>plan tasks done</span></div>
      </div>

      <Section title="Today" aside={left === 0 ? 'All done. Great work.' : `${left} left`}>
        <div className="list">
          {items.map((it) => (
            <Row key={it.id} ch={it.ch} done={done.has(it.id)} title={it.title} sub={it.sub} tag={CH[it.ch]?.short}
              check={<Check on={done.has(it.id)} label={it.title} onToggle={(on) => toggleDay(it.id, on)} />}>
              {it.log && (
                <Input className="mt-2 h-8 bg-background" defaultValue={day.log ?? ''} placeholder="Today I learned…" aria-label="Learning log for today"
                  onChange={(e) => saveLog(e.target.value)} />
              )}
            </Row>
          ))}
        </div>
      </Section>

      <Section title="This month's goals" aside={`Q${pos.q}, month ${pos.mi + 1} of 3`}>
        <div className="list">
          {monthTasks.length ? monthTasks.map((t) => (
            <Row key={t.id} ch={t.ch} done={!!state.plan[t.id]} title={t.text} tag={CH[t.ch].short}
              check={<Check on={!!state.plan[t.id]} label={t.text} onToggle={(on) => togglePlan(t.id, on)} />} />
          )) : empty('No goals for this month.')}
        </div>
      </Section>
    </>
  )
}
