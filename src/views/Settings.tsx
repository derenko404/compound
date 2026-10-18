import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CloudUpload, Download, LogIn, LogOut, RefreshCw, Send, Unlink, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { getReminder, requestPermission, setReminder, supported } from '@/fx/notify'
import { playTick, setSoundOn, soundOn } from '@/fx/sound'
import { getTheme, setTheme, type Theme } from '@/fx/theme'
import { toast } from '@/fx/fx'
import {
  clearLocalSnapshot, disconnectTelegram, exportAll, importFile, importLocal, loadLocalSnapshot, parseExport, supabase,
  telegramCode, telegramLink,
} from '@/store/backends'
import { useStore } from '@/store/StoreProvider'
import type { State } from '@/lib/types'
import { keyOf } from '@/lib/dates'
import { Header, Panel, Section, Segmented, SettingRow } from '@/components/kit'
import { ConfirmSheet } from '@/components/edit'

const BOT = import.meta.env.VITE_TELEGRAM_BOT as string | undefined

// Connect Telegram: a one-time code goes into the t.me link; the bot checks it and links this chat to the account.
// While not linked, the link status is checked every few seconds so the page updates once the bot has done it.
function TelegramRows() {
  const qc = useQueryClient()
  const link = useQuery({
    queryKey: ['telegram'],
    queryFn: () => telegramLink(supabase!),
    refetchInterval: (q) => (q.state.data ? false : 4000),
  })
  const code = useQuery({
    queryKey: ['telegram-code'],
    queryFn: () => telegramCode(supabase!),
    enabled: link.isSuccess && !link.data,
    staleTime: 10 * 60 * 1000,
  })
  if (link.data) return (
    <SettingRow title={link.data.username ? `Connected as @${link.data.username}` : 'Connected'} sub="Send links and notes to the bot. They land in your Notebook.">
      <Button variant="outline" onClick={async () => {
        await disconnectTelegram(supabase!)
        await qc.invalidateQueries({ queryKey: ['telegram'] })
        toast('Telegram disconnected.')
      }}><Unlink aria-hidden="true" />Disconnect</Button>
    </SettingRow>
  )
  return (
    <SettingRow title="Connect Telegram" sub={`Send links and notes to @${BOT} from any chat, and they land in your Notebook.`}>
      {code.data
        ? <Button asChild><a href={`https://t.me/${BOT}?start=${code.data}`} target="_blank" rel="noopener"><Send aria-hidden="true" />Connect</a></Button>
        : <Button disabled><Send aria-hidden="true" />Connect</Button>}
    </SettingRow>
  )
}

const fmtBuild = () => {
  const d = new Date(__BUILD__.time)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

async function checkForUpdates() {
  const reg = await navigator.serviceWorker?.getRegistration()
  if (!reg) return toast('Updates come with the installed app.')
  await reg.update()
  // A new version shows the "Updating" overlay and reloads by itself.
  if (!reg.installing && !reg.waiting) toast("You're on the latest version.")
}

export function Settings() {
  const { mode, session, signOut, state, backend } = useStore()
  const qc = useQueryClient()
  const [sound, setSound] = useState(soundOn)
  const [rem, setRem] = useState(getReminder)
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [importing, setImporting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [incoming, setIncoming] = useState<State | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const updateRem = async (r: typeof rem) => {
    if (r.enabled && (await requestPermission()) !== 'granted') {
      toast('Notifications are blocked. Allow them in your browser settings.')
      return
    }
    setRem(r)
    setReminder(r)
  }

  const download = async () => {
    const data = await exportAll(backend!, state)
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `roadmap-log-${keyOf(new Date())}.json` })
    a.click()
    URL.revokeObjectURL(url)
    toast('Exported.')
  }

  const readFile = async (f: File | undefined) => {
    if (!f) return
    try {
      setIncoming(parseExport(await f.text()))
    } catch {
      toast.error("That file isn't a Roadmap Log export.")
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const count = (s: State) => s.chapters.length + s.routines.length + s.lists.length + s.habits.length + s.notes.length

  return (
    <>
      <Header title="Settings" />
      <Section title="Account">
        <Panel>
          {mode === 'cloud' ? (
            <>
              <SettingRow title={session?.user.email ?? 'Signed in'} sub="Your data syncs to your account on every device.">
                <Button variant="outline" onClick={signOut}><LogOut aria-hidden="true" />Sign Out</Button>
              </SettingRow>
              <SettingRow title="Import from this device" sub="Copy anything you saved before signing in into your account.">
                <Button variant="outline" disabled={importing} onClick={async () => {
                  const local = await loadLocalSnapshot()
                  setImporting(true)
                  try {
                    await importLocal(supabase!, local)
                    clearLocalSnapshot()
                    await qc.invalidateQueries({ queryKey: ['state'] })
                    toast('Imported.')
                  } catch (e) {
                    console.error(e)
                    toast.error("Couldn't import. Try again.")
                  } finally {
                    setImporting(false)
                  }
                }}><CloudUpload aria-hidden="true" />{importing ? 'Importing…' : 'Import'}</Button>
              </SettingRow>
            </>
          ) : (
            <SettingRow title="This device only" sub={supabase ? 'Sign in to sync across devices.' : 'Supabase is not configured for this build.'}>
              {supabase && <Button onClick={signOut}><LogIn aria-hidden="true" />Sign In</Button>}
            </SettingRow>
          )}
        </Panel>
      </Section>

      {BOT && (
        <Section title="Telegram">
          <Panel>
            {mode === 'cloud' && supabase
              ? <TelegramRows />
              : <SettingRow title="Connect Telegram" sub={`Sign in first, then send links and notes to @${BOT} and they land in your Notebook.`} />}
          </Panel>
        </Section>
      )}

      <Section title="Notifications and sounds">
        <Panel>
          <SettingRow title="Sounds" sub="A pop on every tick, a chime when the day is done.">
            <Switch checked={sound} onCheckedChange={(v) => { setSound(v); setSoundOn(v); if (v) playTick(0.5) }} />
          </SettingRow>
          {supported() ? (
            <SettingRow title="Notifications" sub="Reminders about daily tasks.">
              <Switch checked={rem.enabled} onCheckedChange={(v) => updateRem({ ...rem, enabled: v })} />
            </SettingRow>
          ) : (
            <SettingRow title="Notifications" sub="This browser doesn't support notifications. On iPhone, add the app to your Home Screen first." />
          )}
        </Panel>
      </Section>

      <Section title="Appearance">
        <Panel>
          <SettingRow title="Theme">
            <Segmented label="Theme" value={theme} onChange={(t) => { setThemeState(t); setTheme(t) }}
              options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </SettingRow>
        </Panel>
      </Section>

      <Section title="Backup">
        <Panel>
          <SettingRow title="Your data" sub="Save it all to a file, or bring it back.">
            <div className="flex gap-2">
              <Button variant="outline" disabled={!backend} onClick={() => void download().catch(() => toast.error("Couldn't export. Try again."))}><Download aria-hidden="true" />Export</Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload aria-hidden="true" />Import</Button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void readFile(e.target.files?.[0])} />
          </SettingRow>
        </Panel>
      </Section>

      <Section title="About">
        <Panel>
          <SettingRow title="Version" sub={`${fmtBuild()} · ${__BUILD__.commit}`}>
            <Button variant="outline" size="icon" aria-label="Check for updates" title="Check for updates" disabled={checking}
              onClick={() => { setChecking(true); void checkForUpdates().finally(() => setChecking(false)) }}>
              <RefreshCw className={checking ? 'motion-safe:animate-spin' : undefined} aria-hidden="true" />
            </Button>
          </SettingRow>
        </Panel>
      </Section>

      <ConfirmSheet open={!!incoming} onOpenChange={(o) => !o && setIncoming(null)} confirm="Import"
        title="Import this file?" description={incoming ? `${count(incoming)} items will be added. Anything already here with the same name is updated.` : ''}
        onConfirm={async () => {
          if (!incoming || !backend) return
          try {
            await importFile(backend, state, incoming)
            await qc.invalidateQueries({ queryKey: ['state'] })
            await qc.invalidateQueries({ queryKey: ['notes'] })
            toast('Imported.')
          } catch (e) {
            console.error(e)
            toast.error("Couldn't import. Try again.")
          }
        }} />
    </>
  )
}
