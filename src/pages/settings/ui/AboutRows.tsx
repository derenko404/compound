import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { SettingRow } from '@/shared/ui'
import { t, currentLocale } from '@/shared/i18n'

// Set by vite.config.ts at build time. A dev server started before that config change doesn't have it.
const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : { time: new Date().toISOString(), commit: 'dev' }

const fmtBuild = () => {
  const d = new Date(BUILD.time)
  return `${d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' })}`
}

// What a check found, shown under the version. A new version shows the "Updating" overlay and reloads by itself.
async function checkForUpdates() {
  const reg = await navigator.serviceWorker?.getRegistration()
  if (!reg) return t.settings.about.installedOnly
  await reg.update()
  return reg.installing || reg.waiting ? t.settings.about.updating : t.settings.about.latest
}

// The build this app runs, and a button to check for a newer one. What the check found goes on its own line.
export function AboutRows() {
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState<string | null>(null)
  return (
    <SettingRow title={t.settings.about.version} sub={<>{`${fmtBuild()} · ${BUILD.commit}`}{checked && <span className="block">{checked}</span>}</>}>
      <Button variant="outline" size="icon" aria-label={t.settings.about.checkUpdates} title={t.settings.about.checkUpdates} disabled={checking}
        onClick={() => { setChecking(true); void checkForUpdates().then(setChecked).finally(() => setChecking(false)) }}>
        <RefreshCw className={checking ? 'motion-safe:animate-spin' : undefined} aria-hidden="true" />
      </Button>
    </SettingRow>
  )
}
