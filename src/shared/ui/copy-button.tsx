import { useState } from 'react'
import { Check as CheckIcon, Copy } from 'lucide-react'
import { toast } from '@/shared/lib/toast'
import { t } from '@/shared/i18n'
import { Button } from './primitives/button'

// Copies text. The button itself says "Copied" for a moment instead of a toast. Failing to copy is an error toast.
export function CopyButton({ text, label = t.common.copy, className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      toast.error(t.common.copyFailed)
    }
  }
  return (
    <Button type="button" variant="outline" className={className} onClick={() => void copy()} aria-live="polite">
      {done ? <CheckIcon aria-hidden="true" /> : <Copy aria-hidden="true" />}{done ? t.common.copied : label}
    </Button>
  )
}
