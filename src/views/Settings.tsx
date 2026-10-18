import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CloudUpload, Download, KeyRound, LogIn, LogOut, RefreshCw, Send, Trash2, Unlink, Upload } from 'lucide-react'
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
  telegramCode, telegramLink, apiTokens, createApiToken, revokeApiToken, myShares, deleteShare, SHARE_DAYS, type ApiToken, type Share,
} from '@/store/backends'
import { useStore } from '@/store/StoreProvider'
import type { State } from '@/lib/types'
import { keyOf } from '@/lib/dates'
import { CopyButton, Header, Panel, Section, SettingRow, SettingSelect } from '@/components/kit'
import { ConfirmSheet, FormSheet, TextField, fail } from '@/components/edit'
import { t, currentLocale, getLangPref, setLangPref, type LangPref } from '@/i18n'

const BOT = import.meta.env.VITE_TELEGRAM_BOT as string | undefined

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' })

// What to paste into an AI: where to connect, the token, and where the guide is.
const aiPrompt = (token: string) => t.settings.ai.aiPrompt(location.origin, token)

// "works 5 more days", "works until tonight"
const expiresIn = (created: string) => {
  const days = Math.ceil((new Date(created).getTime() + SHARE_DAYS * 86_400_000 - Date.now()) / 86_400_000)
  return days <= 1 ? t.settings.shares.worksUntilTomorrow : t.settings.shares.worksMore(days)
}

// Links you've shared (topics and lists): copy one again, or delete it so the link stops working.
function SharedLinksRows() {
  const qc = useQueryClient()
  const shares = useQuery({ queryKey: ['shares'], queryFn: () => myShares(supabase!) })
  const [removing, setRemoving] = useState<Share | null>(null)
  if (!shares.data?.length) return <SettingRow title={t.settings.shares.none} sub={t.settings.shares.noneSub} />
  return (
    <>
      {shares.data.map((s) => (
        <SettingRow key={s.id} title={s.name} sub={`${s.kind === 'topic' ? t.settings.shares.topic : t.settings.shares.list} · ${expiresIn(s.created_at)}`}>
          <div className="flex gap-2">
            <CopyButton text={`${location.origin}/share/${s.id}`} />
            <Button variant="outline" size="icon" aria-label={t.settings.shares.deleteLink(s.name)} onClick={() => setRemoving(s)}><Trash2 aria-hidden="true" /></Button>
          </div>
        </SettingRow>
      ))}
      <ConfirmSheet open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}
        title={t.settings.shares.deleteAsk(removing?.name ?? null)} description={t.settings.shares.deleteSub}
        onConfirm={async () => {
          if (!removing) return
          await deleteShare(supabase!, removing.id)
          await qc.invalidateQueries({ queryKey: ['shares'] })
        }} />
    </>
  )
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
      <SettingRow title={t.settings.ai.title} sub={t.settings.ai.sub}>
        <Button onClick={() => { setName(''); setNaming(true) }}><KeyRound aria-hidden="true" />{t.settings.ai.newToken}</Button>
      </SettingRow>
      {(tokens.data ?? []).map((tk) => (
        <SettingRow key={tk.id} title={tk.name} sub={t.settings.ai.tokenMeta(tk.prefix, fmtDay(tk.created_at), tk.last_used_at ? fmtDay(tk.last_used_at) : null)}>
          <Button variant="outline" onClick={() => setRevoking(tk)}><Trash2 aria-hidden="true" />{t.settings.ai.revoke}</Button>
        </SettingRow>
      ))}
      <FormSheet open={naming} onOpenChange={setNaming} title={t.settings.ai.newToken} submit={t.settings.ai.makeToken}
        onSubmit={() => {
          if (!name.trim()) return fail(t.settings.ai.nameFirst)
          void createApiToken(supabase!, name.trim()).then((tk) => {
            setMade(tk)
            void qc.invalidateQueries({ queryKey: ['api-tokens'] })
          }).catch(() => toast.error(t.settings.ai.makeFailed))
        }}>
        <TextField label={t.settings.ai.name} value={name} onChange={setName} placeholder={t.settings.ai.namePlaceholder} hint={t.settings.ai.nameHint} required full />
      </FormSheet>
      <FormSheet open={!!made} onOpenChange={(o) => !o && setMade(null)} title={t.settings.ai.yourToken} submit={t.common.done} onSubmit={() => {}}
        description={t.settings.ai.yourTokenSub}>
        {made && <>
          <div className="field span-all">
            <Label htmlFor="new-token">{t.settings.ai.token}</Label>
            <div className="flex gap-2">
              <Input id="new-token" readOnly value={made} className="font-mono" onFocus={(e) => e.target.select()} />
              <CopyButton text={made} />
            </div>
          </div>
          <div className="field span-all">
            <Label htmlFor="ai-prompt">{t.settings.ai.prompt}</Label>
            <Textarea id="ai-prompt" readOnly rows={6} value={aiPrompt(made)} onFocus={(e) => e.target.select()} />
            <CopyButton text={aiPrompt(made)} label={t.settings.ai.copyPrompt} className="justify-self-start" />
          </div>
        </>}
      </FormSheet>
      <ConfirmSheet open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)} confirm={t.settings.ai.revoke}
        title={t.settings.ai.revokeAsk(revoking?.name ?? null)} description={t.settings.ai.revokeSub}
        onConfirm={async () => {
          if (!revoking) return
          await revokeApiToken(supabase!, revoking.id)
          await qc.invalidateQueries({ queryKey: ['api-tokens'] })
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
    <SettingRow title={link.data.username ? t.settings.telegram.connectedAs(link.data.username) : t.settings.telegram.connected} sub={t.settings.telegram.connectedSub}>
      <Button variant="outline" onClick={async () => {
        await disconnectTelegram(supabase!)
        await qc.invalidateQueries({ queryKey: ['telegram'] })
      }}><Unlink aria-hidden="true" />{t.settings.telegram.disconnect}</Button>
    </SettingRow>
  )
  return (
    <SettingRow title={t.settings.telegram.connectTitle} sub={t.settings.telegram.connectSub(BOT ?? '')}>
      {code.data
        ? <Button asChild><a href={`https://t.me/${BOT}?start=${code.data}`} target="_blank" rel="noopener"><Send aria-hidden="true" />{t.settings.telegram.connect}</a></Button>
        : <Button disabled><Send aria-hidden="true" />{t.settings.telegram.connect}</Button>}
    </SettingRow>
  )
}

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

export function Settings() {
  const { mode, session, signOut, state, backend } = useStore()
  const qc = useQueryClient()
  const [sound, setSound] = useState(soundOn)
  const [rem, setRem] = useState(getReminder)
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [langPref, setLang] = useState<LangPref>(getLangPref)
  const [importing, setImporting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState<string | null>(null)
  const [incoming, setIncoming] = useState<State | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const updateRem = async (r: typeof rem) => {
    if (r.enabled && (await requestPermission()) !== 'granted') {
      toast.error(t.settings.notify.blocked)
      return
    }
    setRem(r)
    setReminder(r)
  }

  const download = async () => {
    const data = await exportAll(backend!, state)
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `compound-${keyOf(new Date())}.json` })
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

  const count = (s: State) => s.topics.length + s.routines.length + s.lists.length + s.habits.length + s.notes.length

  return (
    <>
      <Header title={t.settings.title} />
      <Section title={t.settings.account.section}>
        <Panel>
          {mode === 'cloud' ? (
            <>
              <SettingRow title={session?.user.email ?? t.settings.account.signedIn} sub={t.settings.account.syncs}>
                <Button variant="outline" onClick={signOut}><LogOut aria-hidden="true" />{t.settings.account.signOut}</Button>
              </SettingRow>
              <SettingRow title={t.settings.account.importLocal} sub={t.settings.account.importLocalSub}>
                <Button variant="outline" disabled={importing} onClick={async () => {
                  const local = await loadLocalSnapshot()
                  setImporting(true)
                  try {
                    await importLocal(supabase!, local)
                    clearLocalSnapshot()
                    await qc.invalidateQueries({ queryKey: ['state'] })
                  } catch (e) {
                    console.error(e)
                    toast.error(t.settings.account.importFailed)
                  } finally {
                    setImporting(false)
                  }
                }}><CloudUpload aria-hidden="true" />{importing ? t.settings.account.importing : t.settings.account.import}</Button>
              </SettingRow>
            </>
          ) : (
            <SettingRow title={t.settings.account.deviceOnly} sub={supabase ? t.settings.account.signInToSync : t.settings.account.noSupabase}>
              {supabase && <Button onClick={signOut}><LogIn aria-hidden="true" />{t.settings.account.signIn}</Button>}
            </SettingRow>
          )}
        </Panel>
      </Section>

      <Section title={t.settings.ai.section}>
        <Panel>
          {mode === 'cloud' && supabase
            ? <AiAccessRows />
            : <SettingRow title={t.settings.ai.title} sub={t.settings.ai.signInFirst} />}
        </Panel>
      </Section>

      {mode === 'cloud' && supabase && (
        <Section title={t.settings.shares.section}>
          <Panel><SharedLinksRows /></Panel>
        </Section>
      )}

      {BOT && (
        <Section title={t.settings.telegram.section}>
          <Panel>
            {mode === 'cloud' && supabase
              ? <TelegramRows />
              : <SettingRow title={t.settings.telegram.connectTitle} sub={t.settings.telegram.signInFirst(BOT)} />}
          </Panel>
        </Section>
      )}

      <Section title={t.settings.notify.section}>
        <Panel>
          <SettingRow title={t.settings.notify.sounds} sub={t.settings.notify.soundsSub}>
            <Switch checked={sound} onCheckedChange={(v) => { setSound(v); setSoundOn(v); if (v) playTick(0.5) }} />
          </SettingRow>
          {supported() ? (
            <SettingRow title={t.settings.notify.notifications} sub={t.settings.notify.notificationsSub}>
              <Switch checked={rem.enabled} onCheckedChange={(v) => updateRem({ ...rem, enabled: v })} />
            </SettingRow>
          ) : (
            <SettingRow title={t.settings.notify.notifications} sub={t.settings.notify.unsupported} />
          )}
        </Panel>
      </Section>

      <Section title={t.settings.appearance.section}>
        <Panel>
          <SettingRow title={t.settings.appearance.theme}>
            <SettingSelect label={t.settings.appearance.theme} value={theme} onChange={(v) => { setThemeState(v); setTheme(v) }}
              options={[{ value: 'system', label: t.settings.appearance.system }, { value: 'light', label: t.settings.appearance.light }, { value: 'dark', label: t.settings.appearance.dark }]} />
          </SettingRow>
          <SettingRow title={t.settings.appearance.language} sub={t.settings.appearance.languageSub}>
            <SettingSelect<LangPref> label={t.settings.appearance.language} value={langPref} onChange={(v) => { setLang(v); setLangPref(v) }}
              options={[{ value: 'auto', label: t.settings.appearance.auto }, { value: 'en', label: t.settings.appearance.english }, { value: 'uk', label: t.settings.appearance.ukrainian }]} />
          </SettingRow>
        </Panel>
      </Section>

      <Section title={t.settings.backup.section}>
        <Panel>
          <SettingRow title={t.settings.backup.title} sub={t.settings.backup.sub}>
            <div className="flex gap-2">
              <Button variant="outline" disabled={!backend} onClick={() => void download().catch(() => toast.error(t.settings.backup.exportFailed))}><Download aria-hidden="true" />{t.settings.backup.export}</Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload aria-hidden="true" />{t.settings.backup.import}</Button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void readFile(e.target.files?.[0])} />
          </SettingRow>
        </Panel>
      </Section>

      <Section title={t.settings.about.section}>
        <Panel>
          <SettingRow title={t.settings.about.version} sub={`${fmtBuild()} · ${BUILD.commit}${checked ? `. ${checked}` : ''}`}>
            <Button variant="outline" size="icon" aria-label={t.settings.about.checkUpdates} title={t.settings.about.checkUpdates} disabled={checking}
              onClick={() => { setChecking(true); void checkForUpdates().then(setChecked).finally(() => setChecking(false)) }}>
              <RefreshCw className={checking ? 'motion-safe:animate-spin' : undefined} aria-hidden="true" />
            </Button>
          </SettingRow>
        </Panel>
      </Section>

      <ConfirmSheet open={!!incoming} onOpenChange={(o) => !o && setIncoming(null)} confirm={t.settings.backup.import}
        title={t.settings.backup.importAsk} description={incoming ? t.settings.backup.importSub(count(incoming)) : ''}
        onConfirm={async () => {
          if (!incoming || !backend) return
          try {
            await importFile(backend, state, incoming)
            await qc.invalidateQueries({ queryKey: ['state'] })
            await qc.invalidateQueries({ queryKey: ['notes'] })
          } catch (e) {
            console.error(e)
            toast.error(t.settings.account.importFailed)
          }
        }} />
    </>
  )
}
