import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CH, CH_ORDER, DEFAULT_START, DOC_URL, QUARTERS, TASKS } from '@/data/plan'
import { programPos, quarterTasks } from '@/lib/derive'
import { useStore } from '@/store/StoreProvider'
import { celebrate, praise, toast } from '@/fx/fx'
import { Check, Header, Row, Section, cvar, empty } from '@/components/kit'

export function usePlanToggle() {
  const { state, dispatch } = useStore()
  return (id: string, on: boolean) => {
    dispatch({ type: 'plan', taskId: id, doneAt: on ? new Date().toISOString() : null })
    if (!on) return
    const t = TASKS.find((x) => x.id === id)!
    if (quarterTasks(t.q).every((x) => x.id === id || state.plan[x.id])) {
      setTimeout(celebrate, 200)
      toast(`Q${t.q} complete. Huge.`)
    } else toast('Plan task done. ' + praise())
  }
}

export function Plan() {
  const { state, dispatch } = useStore()
  const toggle = usePlanToggle()
  const pos = programPos(state, new Date())
  const [selQ, setSelQ] = useState<number | null>(null)
  const [start, setStart] = useState(state.settings.start_date || DEFAULT_START)
  const q = selQ ?? pos.q
  const Qs = QUARTERS[q - 1]
  const plan = state.plan

  const next = TASKS.filter((t) => !plan[t.id] && (t.q > pos.q || (t.q === pos.q && (t.m === null || t.m >= pos.mi))))
    .sort((a, b) => a.q - b.q || (a.m ?? 1) - (b.m ?? 1))
    .slice(0, 5)

  return (
    <>
      <Header title="The plan" lead={<>18 months in six quarters. Each quarter has one focus chapter; the others run as light tracks. <a href={DOC_URL} target="_blank" rel="noopener">Open the full roadmap doc</a>.</>} />
      <div className="strip">
        {QUARTERS.map((Q) => {
          const ts = quarterTasks(Q.q)
          const d = ts.filter((t) => plan[t.id]).length
          return (
            <button key={Q.q} className={`qbtn${Q.q === pos.q ? ' now' : ''}`} style={cvar(Q.focus)} aria-pressed={Q.q === q} onClick={() => setSelQ(Q.q)}>
              <b>Q{Q.q}</b><span>{Q.months}</span><span>{CH[Q.focus].short}</span>
              <div className="qbar"><i style={{ width: `${ts.length ? (d / ts.length) * 100 : 0}%` }} /></div>
            </button>
          )
        })}
      </div>

      <Section title="Next up" aside="Your closest open tasks">
        <div className="list">
          {next.length ? next.map((t) => (
            <Row key={t.id} ch={t.ch} title={t.text} sub={`Q${t.q}${t.m !== null ? `, month ${t.m + 1}` : ''}`} tag={CH[t.ch].short}
              check={<Check on={false} label={t.text} onToggle={(on) => toggle(t.id, on)} />} />
          )) : empty('Everything ahead is done.')}
        </div>
      </Section>

      <Section title={`Q${q}, ${Qs.months}`} aside={`Focus: ${CH[Qs.focus].name}. Weekend project: ${Qs.project}`}>
        <div className="list">
          {CH_ORDER.flatMap((ch) => quarterTasks(q, ch)).map((t) => (
            <Row key={t.id} ch={t.ch} done={!!plan[t.id]} title={t.text}
              sub={`${CH[t.ch].name}${t.m !== null ? `, month ${t.m + 1}` : ''}`} tag={t.ch === Qs.focus ? 'Focus' : 'Light'}
              check={<Check on={!!plan[t.id]} label={t.text} onToggle={(on) => toggle(t.id, on)} />} />
          ))}
        </div>
      </Section>

      <Section title="Program start">
        <div className="panel">
          <div className="grid2">
            <div className="field">
              <Label htmlFor="start-date">Start date</Label>
              <Input type="date" id="start-date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
          </div>
          <div className="actions">
            <Button size="sm" onClick={() => {
              if (!start) return toast('Pick a date first.')
              dispatch({ type: 'settings', patch: { start_date: start } })
              toast('Start date saved.')
            }}>Save start date</Button>
            <span className="muted">Quarters, months and day numbers follow this date.</span>
          </div>
        </div>
      </Section>
    </>
  )
}
