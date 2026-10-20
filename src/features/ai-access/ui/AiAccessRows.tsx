import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Trash2 } from 'lucide-react'
import { Input } from '@/shared/ui/primitives/input'
import { Label } from '@/shared/ui/primitives/label'
import { Textarea } from '@/shared/ui/primitives/textarea'
import { Button } from '@/shared/ui/primitives/button'
import { toast } from '@/shared/lib/toast'
import { supabase, apiTokens, createApiToken, revokeApiToken, type ApiToken } from '@/shared/api/backends'
import { ConfirmSheet, CopyButton, FormSheet, SettingRow, TextField, fail } from '@/shared/ui'
import { t, currentLocale } from '@/shared/i18n'

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' })

// What to paste into an AI: where to connect, the token, and where the guide is.
const aiPrompt = (token: string) => t.settings.ai.aiPrompt(location.origin, token)

// AI access: personal access tokens for the API and MCP server. A token is shown once, right after it's made.
export function AiAccessRows() {
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
        <TextField label={t.settings.ai.name} value={name} onChange={setName} placeholder={t.settings.ai.namePlaceholder} hint={t.settings.ai.nameHint} required full autoFocus />
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
