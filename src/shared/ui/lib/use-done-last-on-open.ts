import { useState } from 'react'

/**
 * Items already done when the page opened sit at the bottom. Ticking during the visit moves nothing,
 * so a row never jumps away from under the finger; the next visit shows the new order.
 */
export function useDoneLastOnOpen<T>(items: T[], isDone: (t: T) => boolean, key: (t: T) => string) {
  const [sunk] = useState(() => new Set(items.filter(isDone).map(key)))
  return [...items].sort((a, b) => Number(sunk.has(key(a))) - Number(sunk.has(key(b))))
}
