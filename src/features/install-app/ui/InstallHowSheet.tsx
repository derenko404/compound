import { Check, Share, SquarePlus, type LucideIcon } from 'lucide-react'
import { FormSheet } from '@/shared/ui'
import { t } from '@/shared/i18n'

// iPhone and iPad have no install button a page can show, so this walks through Safari's own steps.
export function InstallHowSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const tx = t.onboarding.install
  const steps: [LucideIcon, string][] = [[Share, tx.step1], [SquarePlus, tx.step2], [Check, tx.step3]]
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={tx.howTitle} description={tx.howSub} submit={t.common.done} onSubmit={() => {}}>
      <ol className="howto span-all">
        {steps.map(([Icon, text]) => (
          <li key={text}><span className="howto-icon"><Icon aria-hidden="true" /></span><p>{text}</p></li>
        ))}
      </ol>
    </FormSheet>
  )
}
