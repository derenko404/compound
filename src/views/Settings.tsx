import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getReminder, requestPermission, setReminder, show, supported } from '@/fx/notify'
import { playTick, setSoundOn, soundOn } from '@/fx/sound'
import { toast } from '@/fx/fx'
import { clearLocalSnapshot, importLocal, loadLocalSnapshot, supabase } from '@/store/backends'
import { useStore } from '@/store/StoreProvider'
import { Header, Section } from '@/components/kit'

function Line({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0"><div className="font-bold">{title}</div>{sub && <div className="text-sm text-muted-foreground">{sub}</div>}</div>
      {children}
    </div>
  )
}

export function Settings() {
  const { mode, session, signOut } = useStore()
  const qc = useQueryClient()
  const [sound, setSound] = useState(soundOn)
  const [rem, setRem] = useState(getReminder)
  const [importing, setImporting] = useState(false)

  const updateRem = async (r: typeof rem) => {
    if (r.enabled && (await requestPermission()) !== 'granted') {
      toast('Notifications are blocked. Allow them in your browser settings.')
      return
    }
    setRem(r)
    setReminder(r)
  }

  return (
    <>
      <Header title="Settings" />
      <Section title="Account">
        <div className="panel">
          {mode === 'cloud' ? (
            <>
              <Line title={session?.user.email ?? 'Signed in'} sub="Your data syncs to your account on every device.">
                <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
              </Line>
              <Line title="Import from this device" sub="Copy anything you saved before signing in into your account.">
                <Button variant="outline" size="sm" disabled={importing} onClick={async () => {
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
                }}>{importing ? 'Importing…' : 'Import'}</Button>
              </Line>
            </>
          ) : (
            <Line title="This device only" sub={supabase ? 'Sign in to sync across devices.' : 'Supabase is not configured for this build.'}>
              {supabase && <Button size="sm" onClick={signOut}>Sign in</Button>}
            </Line>
          )}
        </div>
      </Section>

      <Section title="Feedback">
        <div className="panel">
          <Line title="Sounds" sub="A pop on every tick, a chime when the day is done.">
            <Switch checked={sound} onCheckedChange={(v) => { setSound(v); setSoundOn(v); if (v) playTick(0.5) }} />
          </Line>
        </div>
      </Section>

      <Section title="Daily reminder">
        <div className="panel">
          {supported() ? (
            <>
              <Line title="Remind me" sub="If today's tasks aren't done by this time. Works while the app is open or installed and running.">
                <Switch checked={rem.enabled} onCheckedChange={(v) => updateRem({ ...rem, enabled: v })} />
              </Line>
              <Line title="Time">
                <div className="field"><Label htmlFor="rem-time" className="sr-only">Reminder time</Label>
                  <Input id="rem-time" type="time" className="w-32 bg-background" value={rem.time} onChange={(e) => updateRem({ ...rem, time: e.target.value })} />
                </div>
              </Line>
              <Line title="Test">
                <Button variant="outline" size="sm" onClick={async () => {
                  if ((await requestPermission()) !== 'granted') return toast('Notifications are blocked.')
                  await show('Roadmap Log', 'Notifications work.')
                }}>Send a test</Button>
              </Line>
            </>
          ) : (
            <p className="text-muted-foreground">This browser doesn't support notifications. On iPhone, add the app to your Home Screen first.</p>
          )}
        </div>
      </Section>
    </>
  )
}
