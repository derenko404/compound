import { cvar } from '@/shared/ui'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/primitives/dialog'
import { monthName, targetFinish } from '@/features/today'
import type { Topic } from '@core/domain/types'
import { t } from '@/shared/i18n'
import { Bullets, Linkify } from '@/features/topics'

// Read-only: what the topic is about, where it leads, and the skills it builds.
export function AboutSheet({ c, open, onOpenChange }: { c: Topic; open: boolean; onOpenChange: (o: boolean) => void }) {
  const target = targetFinish(c)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sheet-wide" style={cvar(c.id)}>
        <DialogTitle>{c.name}</DialogTitle>
        <DialogDescription className="sr-only">{t.topics.page.about(c.name)}</DialogDescription>
        <div className="grid gap-5 pb-2">
          {c.description && <div className="about-text"><Linkify text={c.description} /></div>}
          {c.outcomes.length > 0 && (
            <div className="grid gap-2">
              <h3 className="text-title font-bold">{target ? t.topics.goalsBy(monthName(target)) : t.topics.goals}</h3>
              <Bullets items={c.outcomes} />
            </div>
          )}
          {!c.description && !c.outcomes.length && <p className="muted">{t.topics.page.aboutEmpty}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
