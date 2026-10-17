import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/store/backends'
import { useStore } from '@/store/StoreProvider'

type Mode = 'signin' | 'signup'

const explain = (msg: string) =>
  /rate limit/i.test(msg)
    ? 'Too many emails sent from this project. Wait an hour, or sign in with a password.'
    : /invalid login/i.test(msg)
      ? 'Wrong email or password.'
      : /not confirmed/i.test(msg)
        ? 'Confirm your email first, or turn off "Confirm email" in Supabase.'
        : msg

// Password sign-in works inside the installed app on a phone; an emailed link would
// open in the browser instead, which keeps a separate session on iOS.
export function SignIn() {
  const { useLocal } = useStore()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    setInfo('')
    const creds = { email: email.trim(), password }
    const { data, error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword(creds)
      : await supabase.auth.signUp({ ...creds, options: { emailRedirectTo: location.origin } })
    setBusy(false)
    if (error) return setError(explain(error.message))
    if (mode === 'signup' && !data.session) setInfo(`Check ${creds.email} to confirm your account, then sign in here.`)
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="brand mb-6"><span className="brand-mark" aria-hidden="true" />Roadmap Log</div>
      <h1 className="day-date mb-3">{mode === 'signin' ? 'Sign in to sync' : 'Create your account'}</h1>
      <p className="lead mb-6">Your progress, notes and ideas are saved to your account and follow you to every device.</p>
      <form className="panel grid gap-3" onSubmit={submit}>
        <div className="field">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required className="bg-background" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="bg-background" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {info && <p className="text-sm text-muted-foreground" role="status">{info}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
        <Button type="button" variant="link" className="px-0" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}>
          {mode === 'signin' ? 'No account yet? Create one' : 'Have an account? Sign in'}
        </Button>
      </form>
      <Button variant="link" className="mt-4 px-0" onClick={useLocal}>Use without an account, on this device only</Button>
    </div>
  )
}
