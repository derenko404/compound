import { useEffect } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Header, SegBar } from '@/shared/ui'
import { t } from '@/shared/i18n'
import { rememberSection, sectionsAt } from './tabs'

// A grouped tab's header (Library and its lead), then its sections as a segmented control that sticks under the top bar.
export function SectionTabs() {
  const { pathname } = useLocation()
  const tab = sectionsAt(pathname)
  const current = tab?.sections?.find((s) => s.to === pathname)
  useEffect(() => {
    if (tab && current) rememberSection(tab, current.to)
  }, [tab, current])
  if (!tab?.sections) return null
  return (
    <>
      <Header title={tab.label} lead={tab.lead} />
      <SegBar label={t.nav.sectionsOf(tab.label)}>
        {tab.sections.map((s) => <Link key={s.to} to={s.to} role="tab" className="seg-control-item">{s.label}</Link>)}
      </SegBar>
    </>
  )
}
