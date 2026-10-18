import { t } from '@/shared/i18n'
import { Meter } from './meter'

// A Meter with its count beside it: "12 of 100 done".
export const Progress = ({ n, total, label = t.nav.kit.progressDone }: { n: number; total: number; label?: string }) => (
  <div className="progress-line">
    <Meter value={total ? n / total : 0} label={t.nav.kit.of(n, total, label)} />
    <span><b>{n}</b> {t.nav.kit.ofTotal(total, label)}</span>
  </div>
)
