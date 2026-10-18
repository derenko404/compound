import { useEffect } from 'react'
import { tour } from './tour'

// Starts the tour once on a device's first visit to Today, after the page has settled.
export function useFirstRunTour(on: boolean, pathname: string) {
  useEffect(() => {
    if (!on || pathname !== '/today' || tour.seen()) return
    const id = setTimeout(() => void tour.start(), 800)
    return () => clearTimeout(id)
  }, [on, pathname])
}
