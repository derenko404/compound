import { useEffect, useRef, useState } from 'react'

// Text that saves itself shortly after typing stops.
export function useDebounced<T>(fn: (v: T) => void, ms = 800) {
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  const f = useRef(fn)
  f.current = fn
  useEffect(() => () => clearTimeout(t.current), [])
  return (v: T) => {
    clearTimeout(t.current)
    t.current = setTimeout(() => f.current(v), ms)
  }
}

// A value that follows `v` once it stops changing for `ms`: search boxes query after typing pauses.
export function useDebouncedValue<T>(v: T, ms = 300) {
  const [out, setOut] = useState(v)
  useEffect(() => {
    const t = setTimeout(() => setOut(v), ms)
    return () => clearTimeout(t)
  }, [v, ms])
  return out
}
