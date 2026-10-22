/**
 * Joins class names: strings are kept, other plain values (false, null, 0, what `node && 'x'` gives) dropped, and an
 * object adds each key whose value is truthy. Nothing is merged or rewritten (unlike cn, whose tailwind-merge reads our own text-* tokens as colours),
 * so it's for the app's own classes: clx('row', done && 'is-done', { 'no-check': !check }).
 * One function, like cn, not a namespace object.
 */
export type ClassPart = string | number | bigint | boolean | null | undefined | Record<string, unknown>

export function clx(...parts: ClassPart[]): string {
  const out: string[] = []
  for (const part of parts) {
    if (typeof part === 'string') { if (part) out.push(part) }
    else if (part && typeof part === 'object') for (const [name, on] of Object.entries(part)) if (on) out.push(name)
  }
  return out.join(' ')
}
