import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CloudUpload, Copy, Download, KeyRound, LogIn, LogOut, RefreshCw, Send, Trash2, Unlink, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { getReminder, requestPermission, setReminder, supported } from '@/fx/notify'
import { playTick, setSoundOn, soundOn } from '@/fx/sound'
import { getTheme, setTheme, type Theme } from '@/fx/theme'
import { toast } from '@/fx/fx'
import {
  clearLocalSnapshot, disconnectTelegram, exportAll, importFile, importLocal, loadLocalSnapshot, parseExport, supabase,
  telegramCode, telegramLink, apiTokens, createApiToken, revokeApiToken, type ApiToken,
} from '@/store/backends'
import { useStore } from '@/store/StoreProvider'
import type { State } from '@/lib/types'
import { keyOf } from '@/lib/dates'
import { Header, Panel, Section, Segmented, SettingRow } from '@/components/kit'
import { ConfirmSheet, FormSheet, TextField, fail } from '@/components/edit'

const BOT = import.meta.env.VITE_TELEGRAM_BOT as string | undefined

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast(`${what} copied.`)
  } catch {
    toast.error("Couldn't copy. Select it and copy by hand.")
  }
}

// What to paste into an AI: where to connect, the token, and where the guide is.
const aiPrompt = (token: string) => {
  const o = location.origin
  return [
    'Connect to my Roadmap Log, a self-development app.',
    `MCP server: ${o}/mcp with the header "Authorization: Bearer ${token}" (or the URL ${o}/mcp/${token} if you can't set headers).`,
    `Or the REST API: ${o}/api/v1 with the same header. Docs: ${o}/api/v1/openapi.json.`,
    `Read ${o}/llms.txt first, then build me a track for <topic>.`,
  ].join('\n')
}

// AI access: personal access tokens for the API and MCP server. A token is shown once, right after it's made.
function AiAccessRows() {
  const qc = useQueryClient()
  const tokens = useQuery({ queryKey: ['api-tokens'], queryFn: () => apiTokens(supabase!) })
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [made, setMade] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<ApiToken | null>(null)
  return (
    <>
      <SettingRow title="AI access" sub="Let an AI (Claude, ChatGPT…) build tracks and lists for you. Each token has full access to your data.">
        <Button onClick={() => { setName(''); setNaming(true) }}><KeyRound aria-hidden="true" />New token</Button>
      </SettingRow>
      {(tokens.data ?? []).map((t) => (
        <SettingRow key={t.id} title={t.name} sub={`${t.prefix}… · made ${fmtDay(t.created_at)} · ${t.last_used_at ? `last used ${fmtDay(t.last_used_at)}` : 'never used'}`}>
          <Button variant="outline" onClick={() => setRevoking(t)}><Trash2 aria-hidden="true" />Revoke</Button>
        </SettingRow>
      ))}
      <FormSheet open={naming} onOpenChange={setNaming} title="New token" submit="Make token"
        onSubmit={() => {
          if (!name.trim()) return fail('Name it first, e.g. "Claude".')
          void createApiToken(supabase!, name.trim()).then((t) => {
            setMade(t)
            void qc.invalidateQueries({ queryKey: ['api-tokens'] })
          }).catch(() => toast.error("Couldn't make the token. Try again."))
        }}>
        <TextField label="Name" value={name} onChange={setName} placeholder="Claude" hint="Which AI or app uses it, so you know what to revoke." required full />
      </FormSheet>
      <FormSheet open={!!made} onOpenChange={(o) => !o && setMade(null)} title="Your token" submit="Done" onSubmit={() => {}}
        description="Copy it now: it won't be shown again. Anyone with it can read and change your data.">
        {made && <>
          <div className="field span-all">
            <Label htmlFor="new-token">Token</Label>
            <div className="flex gap-2">
              <Input id="new-token" readOnly value={made} className="font-mono" onFocus={(e) => e.target.select()} />
              <Button type="button" variant="outline" onClick={() => void copy(made, 'Token')}><Copy aria-hidden="true" />Copy</Button>
            </div>
          </div>
          <div className="field span-all">
            <Label htmlFor="ai-prompt">Prompt for your AI</Label>
            <Textarea id="ai-prompt" readOnly rows={6} value={aiPrompt(made)} onFocus={(e) => e.target.select()} />
            <Button type="button" variant="outline" className="justify-self-start" onClick={() => void copy(aiPrompt(made), 'Prompt')}><Copy aria-hidden="true" />Copy prompt</Button>
          </div>
        </>}
      </FormSheet>
      <ConfirmSheet open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)} confirm="Revoke"
        title={`Revoke ${revoking?.name ?? 'this token'}?`} description="Anything using it stops working at once."
        onConfirm={async () => {
          if (!revoking) return
          await revokeApiToken(supabase!, revoking.id)
          await qc.invalidateQueries({ queryKey: ['api-tokens'] })
          toast('Token revoked.')
        }} />
    </>
  )
}

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

// Set by vite.config.ts at build time. A dev server started before that config change doesn't have it.
const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : { time: new Date().toISOString(), commit: 'dev' }

const fmtBuild = () => {
  const d = new Date(BUILD.time)
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

      <Section title="AI access">
        <Panel>
          {mode === 'cloud' && supabase
            ? <AiAccessRows />
            : <SettingRow title="AI access" sub="Sign in first, then make a token so an AI can build tracks and lists for you." />}
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
          <SettingRow title="Version" sub={`${fmtBuild()} · ${BUILD.commit}`}>
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
