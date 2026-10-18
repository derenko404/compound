import { useEffect, useRef } from 'react'

/**
 * Lazy loading for a paged query: put the returned ref on an element after the list, and the next page loads as it
 * scrolls into view.
 */
export function useLoadMore(q: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown }) {
  const ref = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q
  useEffect(() => {
    const el = ref.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !isFetchingNextPage) void fetchNextPage() }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])
  return ref
}
