import { useState } from 'react'
import { Button } from '@/shared/ui/primitives/button'
import { Banner } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { useTourSeen } from '@/features/tour'
import { install, useInstallWay } from '../model/install'
import { InstallHowSheet } from './InstallHowSheet'

// Top of Today, in the browser only, once the tour is done: install the app, or on iPhone how to add it.
export function InstallBanner() {
  const tourSeen = useTourSeen()
  const way = useInstallWay()
  const [how, setHow] = useState(false)
  if (!tourSeen || !way) return null
  const tx = t.onboarding.install
  return (
    <>
      <Banner title={tx.title} actions={<>
        {way === 'prompt'
          ? <Button onClick={() => void install.prompt()}>{tx.install}</Button>
          : <Button onClick={() => setHow(true)}>{tx.how}</Button>}
        <Button variant="outline" onClick={install.dismiss}>{tx.notNow}</Button>
      </>}>
        {way === 'ios' ? tx.ios : tx.sub}
      </Banner>
      <InstallHowSheet open={how} onOpenChange={setHow} />
    </>
  )
}
