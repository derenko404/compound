import { useState } from 'react'
import { Button } from '@/shared/ui/primitives/button'
import { Input } from '@/shared/ui/primitives/input'
import { Label } from '@/shared/ui/primitives/label'
import { supabase } from '@/shared/api/backends'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'

type Mode = 'signin' | 'signup'

const explain = (msg: string) =>
  /rate limit/i.test(msg)
    ? t.settings.signIn.rateLimit
    : /invalid login/i.test(msg)
      ? t.settings.signIn.wrong
      : /provider is not enabled/i.test(msg)
        ? t.settings.signIn.noGoogle
        : /not confirmed/i.test(msg)
          ? t.settings.signIn.notConfirmed
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
    if (mode === 'signup' && !data.session) setInfo(t.settings.signIn.checkEmail(creds.email))
  }

  const google = async () => {
    if (!supabase) return
    setError('')
    // Land on a real route so the router doesn't redirect away the ?code= Supabase reads.
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/today` } })
    if (error) setError(explain(error.message))
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="brand mb-6"><span className="brand-mark" aria-hidden="true" />Compound</div>
      <h1 className="day-date mb-3">{mode === 'signin' ? t.settings.signIn.title : t.settings.signIn.titleSignUp}</h1>
      <p className="lead">{t.settings.signIn.lead}</p>
      <div className="mt-6 grid gap-4">
        <form className="panel grid gap-3" onSubmit={submit}>
          <div className="field">
            <Label htmlFor="email">{t.settings.signIn.email}</Label>
            <Input id="email" type="email" autoComplete="email" required className="bg-background" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <Label htmlFor="password">{t.settings.signIn.password}</Label>
            <Input id="password" type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="bg-background" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-small text-destructive" role="alert">{error}</p>}
          {info && <p className="text-small text-muted-foreground" role="status">{info}</p>}
          <Button type="submit" disabled={busy}>{busy ? t.settings.signIn.busy : mode === 'signin' ? t.settings.signIn.submit : t.settings.signIn.submitSignUp}</Button>
          <Button type="button" variant="link" className="px-0" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}>
            {mode === 'signin' ? t.settings.signIn.toSignUp : t.settings.signIn.toSignIn}
          </Button>
        </form>
        <div className="flex items-center gap-3 text-small text-muted-foreground"><span className="h-px flex-1 bg-border" />{t.settings.signIn.or}<span className="h-px flex-1 bg-border" /></div>
        <Button variant="outline" className="w-full bg-card" onClick={google}>
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
          </svg>
          {t.settings.signIn.google}
        </Button>
      </div>
      <Button variant="link" className="mt-4 px-0" onClick={useLocal}>{t.settings.signIn.local}</Button>
    </div>
  )
}
