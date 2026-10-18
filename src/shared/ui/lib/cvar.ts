import type { CSSProperties } from 'react'
import type { TopicId } from '@/core/domain/types'

// Rows read their colour from --c; each topic's --c-<id> is set by <TopicColors>.
export const cvar = (ch: TopicId | null | undefined): CSSProperties =>
  ({ '--c': ch ? `var(--c-${ch}, var(--p-gray))` : 'var(--p-gray)' }) as CSSProperties
