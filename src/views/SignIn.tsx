import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/store/backends'
import { useStore } from '@/store/StoreProvider'

export function SignIn() {
  const { useLocal } = useStore()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !supabase) return
    setState('sending')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.origin } })
    setState(error ? 'error' : 'sent')
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="brand mb-6"><span className="brand-mark" aria-hidden="true" />Roadmap Log</div>
      <h1 className="day-date mb-3">Sign in to sync</h1>
      <p className="lead mb-6">Your progress, notes and ideas are saved to your account and follow you to every device.</p>
      {state === 'sent' ? (
        <div className="panel">Check <b>{email}</b> for a sign-in link. Open it on this device.</div>
      ) : (
        <form className="panel grid gap-3" onSubmit={send}>
          <div className="field">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required className="bg-background" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {state === 'error' && <p className="text-sm text-destructive">Couldn't send the link. Check the address and try again.</p>}
          <Button type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</Button>
        </form>
      )}
      <Button variant="link" className="mt-4 px-0" onClick={useLocal}>Use without an account, on this device only</Button>
    </div>
  )
}
