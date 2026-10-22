import { IconBadge, tone } from '@/shared/ui'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/primitives/dialog'
import { dates } from '@/shared/lib/dates'
import type { Habit } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'
import { CRAVING_TIPS, started } from '../model/habits'
import { HABIT_UI } from './habit-ui'
import { skinOf } from './habit-skin'
import { GymWeek, HabitDone, SlipButton, WaterCount } from './habit-log'
import { AmountControl } from './amount-controls'

/**
 * Logging a habit beyond a tick, opened from its row's › (My day) or the row itself (Wellbeing): today's control,
 * then the week and the rest of its details. Changes apply at once, so there's no Save: a tap outside closes it.
 */
export function HabitLogSheet({ habit: h, open, onOpenChange }: { habit: Habit; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state } = useStore()
  const today = new Date()
  const ui = HABIT_UI[h.type]
  const skin = started(h, today) ? skinOf(state, h, today) : null
  const tip = h.type === 'smoking' && h.start_date ? CRAVING_TIPS[dates.dayDiff(dates.parseKey(h.start_date), today) % CRAVING_TIPS.length] : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="log-sheet" style={tone(ui.color)}>
        <DialogTitle className="title-row"><IconBadge icon={ui.icon} label={ui.label} color={ui.color} />{h.name}</DialogTitle>
        <DialogDescription className="sr-only">{ui.label}</DialogDescription>
        {skin && <div className="log-sheet-value">{skin.value}</div>}
        {skin && <TodayControl h={h} />}
        {skin?.line && <div className="widget-sub">{skin.line}</div>}
        {tip && <div className="widget-sub">{tip}</div>}
        {skin?.details}
        {h.why && <div className="widget-sub">{h.why}</div>}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Today's control for each type. Wellbeing's rows have no tick, so the sheet is where it opens from: build and the
 * clean-day habits get their own done button here, beside the slip.
 */
function TodayControl({ h }: { h: Habit }) {
  const W = t.wellbeing
  switch (h.type) {
    case 'water': return <WaterCount h={h} />
    case 'sleep': case 'meditation': case 'reading': return <AmountControl h={{ ...h, type: h.type }} />
    case 'gym': return <GymWeek h={h} />
    case 'smoking': return <><HabitDone h={h} label={W.smoking.mark} done={W.smoking.today} /><SlipButton h={h} /></>
    case 'break': return <><HabitDone h={h} label={W.clean.mark} done={W.clean.today} /><SlipButton h={h} /></>
    case 'build': return <HabitDone h={h} label={W.build.mark} />
  }
}
