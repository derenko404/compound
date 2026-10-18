import { uid } from '@/core/domain/content'

export const cleanLines = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean)

// Keeps ids of lines that didn't change (or were edited in place), so progress on them survives an edit.
export function linesToItems(lines: string[], old: { id: string; text: string }[]) {
  const texts = cleanLines(lines)
  const used = new Set<string>()
  const exact = texts.map((t) => {
    const o = old.find((x) => x.text === t && !used.has(x.id))
    if (o) used.add(o.id)
    return o?.id
  })
  return texts.map((text, i) => {
    let id = exact[i]
    if (!id && old[i] && !used.has(old[i].id) && !texts.includes(old[i].text)) {
      id = old[i].id
      used.add(id)
    }
    return { id: id ?? uid(), text }
  })
}
