import type { CSSProperties, ReactNode } from 'react'
import { Fold, Meter, Stats } from '@/shared/ui'
import { dates } from '@/shared/lib/dates'
import type { Habit, State } from '@core/domain/types'
import { t } from '@/shared/i18n'
import { DONE, chain, cleanStats, dueOn, gymMakeUp, gymStats, smokingStats, valueOn, waterStats, weekOf } from '../model/habits'
import { HabitDone, SlipButton, WaterCount } from './habit-log'

const W = t.wellbeing
const WEEKDAYS_SHORT = t.nav.weekdaysShort

/**
 * What a card shows folded (value, one line, today's action) and unfolded (details).
 * done: today's control at the bottom (a full-width tick, or water's row of glasses).
 */
export interface Skin { value: ReactNode; line?: ReactNode; done?: ReactNode; details?: ReactNode; actions?: ReactNode }

export function skinOf(s: State, h: Habit, today: Date): Skin {
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
                const done = valueOn(s, h, dates.keyOf(d)) === DONE
                return <i key={dates.keyOf(d)} className={done ? 'on' : gym ? 'due' : undefined} title={WEEKDAYS_SHORT[d.getDay()]}>{WEEKDAYS_SHORT[d.getDay()][0]}</i>
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
              <div key={dates.keyOf(d.day)} className={d.future ? 'future' : undefined}>
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
    const d = dates.addDays(today, i)
    if (h.days.includes(d.getDay())) return WEEKDAYS_SHORT[d.getDay()]
  }
  return ''
}
