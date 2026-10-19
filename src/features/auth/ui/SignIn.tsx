import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/shared/ui/primitives/button'
import { supabase } from '@/shared/api/backends'
import { useStore } from '@/shared/store/StoreProvider'
import { t } from '@/shared/i18n'

const explain = (msg: string) => /provider is not enabled/i.test(msg) ? t.settings.signIn.noGoogle : msg

// Google only: it works inside the installed app on a phone, with no password or email to confirm.
export function SignIn() {
  const { useLocal } = useStore()
  const [error, setError] = useState('')

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
      <h1 className="day-date mb-3">{t.settings.signIn.title}</h1>
      <p className="lead">{t.settings.signIn.lead}</p>
      <div className="mt-6 grid gap-4">
        <Button variant="outline" className="google-btn w-full" onClick={google}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
          </svg>
          {t.settings.signIn.google}
        </Button>
        {error && <p className="text-small text-destructive" role="alert">{error}</p>}
        <div className="flex items-center gap-3 text-small text-muted-foreground"><span className="h-px flex-1 bg-border" />{t.settings.signIn.or}<span className="h-px flex-1 bg-border" /></div>
        <div className="grid gap-2">
          <Button variant="secondary" className="w-full" onClick={useLocal}>{t.settings.signIn.local}</Button>
          <p className="text-center text-small text-muted-foreground">{t.settings.signIn.localNote}</p>
        </div>
      </div>
      <footer className="landing-foot">
        <Link to="/privacy">{t.landing.privacy}</Link>
        <Link to="/terms">{t.landing.terms}</Link>
      </footer>
    </div>
  )
}
