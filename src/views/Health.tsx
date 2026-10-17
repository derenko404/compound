import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MILESTONES } from '@/data/plan'
import { addDays, dayDiff, fmtShort, keyOf, parseKey } from '@/lib/dates'
import { gymCount } from '@/lib/derive'
import type { State } from '@/lib/types'
import { useStore } from '@/store/StoreProvider'
import { toast } from '@/fx/fx'
import { ConfirmButton, Header, Section, cvar } from '@/components/kit'

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
      <path d={area} fill="var(--c-gym)" fillOpacity=".12" />
      <path d={line} fill="none" stroke="var(--c-gym)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={X(pts.length - 1)} cy={Y(last.w)} r="4.5" fill="var(--c-gym)" />
    </svg>
  )
}

function Smoking({ state }: { state: State }) {
  const { dispatch } = useStore()
  const today = new Date()
  const [date, setDate] = useState(keyOf(addDays(today, 14)))
  const [cpd, setCpd] = useState('10')
  const [price, setPrice] = useState('100')
  const quit = state.settings.quit

  if (!quit?.date)
    return (
      <>
        <p className="lead mb-3.5 mt-0">Not started. When you're ready, set a quit date. The app then counts your smoke-free days, money saved and health milestones, and adds a daily check to Today.</p>
        <div className="grid2">
          <div className="field"><Label htmlFor="q-date">Quit date</Label><Input type="date" id="q-date" className="bg-background" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><Label htmlFor="q-cpd">Cigarettes per day</Label><Input type="number" id="q-cpd" min={0} className="bg-background" value={cpd} onChange={(e) => setCpd(e.target.value)} /></div>
          <div className="field"><Label htmlFor="q-price">Price per pack</Label><Input type="number" id="q-price" min={0} step={0.01} className="bg-background" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </div>
        <div className="actions">
          <Button onClick={() => {
            if (!date) return toast('Pick a quit date first.')
            dispatch({ type: 'settings', patch: { quit: { date, cpd: Number(cpd) || 0, price: Number(price) || 0 } } })
            toast('Quit date set. You can do this.')
          }}>Set quit date</Button>
        </div>
      </>
    )

  const qd = parseKey(quit.date)
  if (qd > today) return <p>Quit day is <b>{fmtShort(qd)}</b>, in {dayDiff(today, qd)} days. Use the time to do the prep list in the doc.</p>

  const mins = Math.max(0, (Date.now() - qd.getTime()) / 6e4)
  const days = Math.max(0, dayDiff(qd, today))
  const saved = (days * quit.cpd / 20) * quit.price
  const nextM = MILESTONES.find((m) => m.mins > mins)
  const prevM = [...MILESTONES].reverse().find((m) => m.mins <= mins)
  const frac = nextM ? (mins - (prevM?.mins ?? 0)) / (nextM.mins - (prevM?.mins ?? 0)) : 1
  const slips = Object.values(state.days).filter((d) => d.smoke === 'slip').length

  return (
    <>
      <div className="big">{days}</div>
      <p className="mb-3.5 mt-1 text-muted-foreground">days since you quit{slips ? `, ${slips} slip${slips === 1 ? '' : 's'} logged` : ''}</p>
      <div className="grid2 mb-3.5">
        <div><b className="font-display text-2xl">{saved.toFixed(0)}</b> <span className="text-muted-foreground">money saved</span></div>
        <div><b className="font-display text-2xl">{Math.round(days * quit.cpd)}</b> <span className="text-muted-foreground">cigarettes not smoked</span></div>
      </div>
      {nextM && (
        <div>
          <b>Next: {nextM.label}</b><span className="text-muted-foreground">, {nextM.text.toLowerCase()}</span>
          <div className="progress"><i style={{ width: `${Math.min(100, frac * 100)}%` }} /></div>
        </div>
      )}
      <div className="mt-3">
        {MILESTONES.map((m) => (
          <div key={m.label} className={`mile${m.mins <= mins ? ' hit' : ''}`}><i /><div><b>{m.label}</b> <span className="text-muted-foreground">{m.text}</span></div></div>
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground">Timeline from the World Health Organization.</p>
      <div className="actions">
        <Button variant="outline" size="sm" onClick={() => {
          const k = keyOf(new Date())
          const d = state.days[k] ?? { done: [] }
          dispatch({ type: 'day', day: k, log: { ...d, smoke: 'slip', done: d.done.filter((x) => x !== 'smoke-free') } })
          toast("Logged. A slip isn't a relapse; keep going.")
        }}>Log a slip today</Button>
        <ConfirmButton label="Reset quit date" armed="Tap again to reset" onConfirm={() => dispatch({ type: 'settings', patch: { quit: null } })} />
      </div>
    </>
  )
}

function Gym({ state }: { state: State }) {
  const { dispatch } = useStore()
  const today = new Date()
  const k = keyOf(today)
  const [weight, setWeight] = useState(String(state.days[k]?.weight ?? ''))

  if (!state.settings.gym_start)
    return (
      <>
        <p className="lead mb-3.5 mt-0">Not started. When you start, Today shows a workout every Monday, Wednesday and Friday (alternating A and B), and this page tracks your weekly workouts and weight trend.</p>
        <Button onClick={() => { dispatch({ type: 'settings', patch: { gym_start: k } }); toast('Gym plan started.') }}>Start the gym plan</Button>
      </>
    )

  const wkStart = addDays(today, -((today.getDay() + 6) % 7))
  const thisWeek = [0, 1, 2, 3, 4, 5, 6].filter((i) => state.days[keyOf(addDays(wkStart, i))]?.done.includes('gym')).length
  const weights = Object.entries(state.days)
    .filter(([, d]) => d.weight)
    .map(([day, d]) => ({ day, w: Number(d.weight) }))
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .slice(-30)

  return (
    <>
      <div className="grid2">
        <div>
          <div className="big" style={{ fontSize: 56 }}>{thisWeek}<span className="text-[28px] text-muted-foreground">/3</span></div>
          <p className="mt-1 text-muted-foreground">workouts this week, {gymCount(state)} in total</p>
          <div className="week">{['A', 'B', 'A'].map((l, i) => <span key={i} className={i < thisWeek ? 'on' : ''}>{l}</span>)}</div>
        </div>
        <div>
          <div className="field"><Label htmlFor="weight">Today's weight (kg)</Label><Input type="number" id="weight" step={0.1} min={0} className="bg-background" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          <div className="actions">
            <Button size="sm" onClick={() => {
              if (!weight) return toast('Enter a weight first.')
              dispatch({ type: 'day', day: k, log: { ...(state.days[k] ?? { done: [] }), weight: Number(weight) } })
              toast('Weight logged.')
            }}>Log weight</Button>
          </div>
        </div>
      </div>
      {weights.length > 1 ? <Sparkline pts={weights} /> : <p className="text-muted-foreground">Log your weight on a few mornings to see the trend here.</p>}
      <p className="text-[13px] text-muted-foreground">Workouts appear on Today every Monday, Wednesday and Friday, alternating A and B.</p>
    </>
  )
}

export function Health() {
  const { state } = useStore()
  return (
    <>
      <Header title="Health" lead="Two plans for later. Start each one whenever you're ready." />
      <Section title="Quit smoking" style={cvar('smoke')}><div className="panel"><Smoking state={state} /></div></Section>
      <Section title="Gym and diet" style={cvar('gym')}><div className="panel"><Gym state={state} /></div></Section>
    </>
  )
}
