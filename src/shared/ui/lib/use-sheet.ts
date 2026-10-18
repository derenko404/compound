import { useState } from 'react'

// Open state for a sheet that edits one value at a time (null = closed).
export function useSheet<T>() {
  const [value, setValue] = useState<T | null>(null)
  return { value, open: (v: T) => setValue(v), close: () => setValue(null), props: { open: value !== null, onOpenChange: (o: boolean) => !o && setValue(null) } }
}
