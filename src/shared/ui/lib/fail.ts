import { toast } from '@/shared/fx/fx'

// Shows why a form can't be saved and keeps its sheet open.
export const fail = (msg: string) => {
  toast(msg)
  return false as const
}
