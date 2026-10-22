import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { toast } from '@/shared/lib/toast'
import { exportAll, importFile, parseExport } from '@/shared/api/backends'
import { useStore } from '@/shared/store/StoreProvider'
import type { State } from '@core/domain/types'
import { dates } from '@/shared/lib/dates'
import { ConfirmSheet, SettingRow } from '@/shared/ui'
import { network } from '@/shared/lib/network'
import { t } from '@/shared/i18n'

const count = (s: State) => s.topics.length + s.routines.length + s.lists.length + s.habits.length + s.notes.length

// Backup: export everything (state plus all notes) as JSON, or import a file (merged by id) after a confirm.
export function BackupRows() {
  const { state, backend } = useStore()
  const qc = useQueryClient()
  const [incoming, setIncoming] = useState<State | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const download = async () => {
    const data = await exportAll(backend!, state)
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `compound-${dates.keyOf(new Date())}.json` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const readFile = async (f: File | undefined) => {
    if (!f) return
    try {
      setIncoming(parseExport(await f.text()))
    } catch {
      toast.error(t.settings.backup.notExport)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <SettingRow title={t.settings.backup.title} sub={t.settings.backup.sub}>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!backend} onClick={() => (backend?.kind === 'cloud' && !network.required()) || void download().catch(() => toast.error(t.settings.backup.exportFailed))}><Download aria-hidden="true" />{t.settings.backup.export}</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload aria-hidden="true" />{t.settings.backup.import}</Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void readFile(e.target.files?.[0])} />
      </SettingRow>
      <ConfirmSheet open={!!incoming} onOpenChange={(o) => !o && setIncoming(null)} confirm={t.settings.backup.import}
        title={t.settings.backup.importAsk} description={incoming ? t.settings.backup.importSub(count(incoming)) : ''}
        onConfirm={async () => {
          if (!incoming || !backend || (backend.kind === 'cloud' && !network.required())) return
          try {
            await importFile(backend, state, incoming)
            await qc.invalidateQueries({ queryKey: ['state'] })
            await qc.invalidateQueries({ queryKey: ['notes'] })
          } catch (e) {
            console.error(e)
            toast.error(t.settings.backup.importFailed)
          }
        }} />
    </>
  )
}
