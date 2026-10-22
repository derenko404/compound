import { t } from '@/shared/i18n'
import { toast } from './toast'

// Actions that only work with a connection (sharing, AI tokens, backup) check first and say so when offline.
export const network = {
  required(): boolean {
    if (navigator.onLine) return true
    toast.error(t.common.needsConnection)
    return false
  },
}
