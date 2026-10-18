import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/shared/ui/primitives/button'
import { SettingRow } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { tour } from '../model/tour'

// Settings: take the tour again. It runs on Today.
export function TourRow() {
  const nav = useNavigate()
  const start = () => void nav({ to: '/today' }).then(() => setTimeout(() => void tour.start(), 300))
  return (
    <SettingRow title={t.onboarding.tour.row} sub={t.onboarding.tour.rowSub}>
      <Button variant="outline" onClick={start}>{t.onboarding.tour.start}</Button>
    </SettingRow>
  )
}
