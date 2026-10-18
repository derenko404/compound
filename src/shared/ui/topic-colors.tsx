import type { Topic } from '@core/domain/types'

// Maps every topic id to its palette colour, for light and dark themes alike.
export function TopicColors({ topics }: { topics: Topic[] }) {
  const css = topics.filter((c) => /^[a-z0-9-]+$/.test(c.id)).map((c) => `--c-${c.id}: var(--p-${c.color});`).join(' ')
  return <style>{`:root { ${css} }`}</style>
}
