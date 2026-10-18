// /share/<id>: someone's shared track or list. Readable without an account; adding a copy needs one (or this device).
import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getShare, supabase } from '@/store/backends'
import { useStore } from '@/store/StoreProvider'
import { listFromShare, trackFromShare } from '@/lib/content'
import type { Chapter, ListDef } from '@/lib/types'
import { toast } from '@/fx/fx'
import { Header, List, MoreText, Row, Section } from '@/components/kit'
import { Bullets, Linkify, ProjectCard, ResourceGroups, SkillFolds } from '@/components/guide'
import { SignIn } from './SignIn'

const route = getRouteApi('/share/$id')

// After signing in (Google comes back on /today), the app returns here to finish adding.
export const PENDING_SHARE = 'roadmap-pending-share'

// The shared track's own colour, since it isn't one of the visitor's tracks.
function TrackPreview({ c }: { c: Chapter }) {
  return (
    <div style={{ '--c': `var(--p-${c.color})` } as CSSProperties}>
      {c.description && <div className="mb-6"><div className="lead"><MoreText lines={6}><Linkify text={c.description} /></MoreText></div></div>}
      {c.outcomes.length > 0 && <Section title="Goals"><Bullets items={c.outcomes} /></Section>}
      {c.skills.length > 0 && <Section title="Skills"><SkillFolds skills={c.skills} readOnly /></Section>}
      {c.resources.length > 0 && <Section title="Resources"><ResourceGroups resources={c.resources} readOnly /></Section>}
      {c.projects.length > 0 && (
        <Section title="Projects">
          <List>{c.projects.map((p) => <ProjectCard key={p.id} p={p} readOnly />)}</List>
        </Section>
      )}
    </div>
  )
}

function ListPreview({ l }: { l: ListDef }) {
  return (
    <Section title={`${l.items.length} items`}>
      <List>{l.items.map((it, i) => <Row key={it.id} title={<><span className="font-normal tabular-nums text-muted-foreground">{i + 1}.</span> {it.title}</>} sub={it.sub} />)}</List>
    </Section>
  )
}

export function SharePage() {
  const { id } = route.useParams()
  const { mode, state, dispatch } = useStore()
  const nav = useNavigate()
  const [signingIn, setSigningIn] = useState(false)
  const share = useQuery({ queryKey: ['share', id], queryFn: () => getShare(supabase!, id), enabled: !!supabase })

  if (signingIn && mode === 'signin') return <SignIn />
  if (!supabase) return <List empty="Shared links need the online app." />
  if (share.isPending) return <List empty="Loading…" />
  if (!share.data) return <List empty="This link doesn't work any more. Links last 7 days, or its owner may have deleted it." />

  const s = share.data
  const isTrack = s.kind === 'track'
  const add = () => {
    if (mode === 'signin') {
      localStorage.setItem(PENDING_SHARE, id)
      setSigningIn(true)
      return
    }
    if (isTrack) {
      const c = trackFromShare(s.data as Chapter, state.chapters)
      dispatch({ type: 'putChapter', chapter: c })
      toast(`${c.name} added to your tracks.`)
      void nav({ to: '/tracks/$ch', params: { ch: c.id } })
    } else {
      const l = listFromShare(s.data as ListDef, state.lists)
      dispatch({ type: 'putList', list: l })
      toast(`${l.name} added to your lists.`)
      void nav({ to: '/lists/$id', params: { id: l.id } })
    }
  }

  // Your own link: nothing to add, just a way back to the original (if it's still there).
  const original = s.mine ? (isTrack ? state.chapters.some((c) => c.id === s.data.id) : state.lists.some((l) => l.id === s.data.id)) : false
  return (
    <>
      <Header title={s.name} lead={s.mine ? `Shared by you. This is what people see when they open the link.` : isTrack ? 'A shared track' : (s.data as ListDef).title}>
        {s.mine
          ? original && <Button variant="outline" onClick={() => void (isTrack ? nav({ to: '/tracks/$ch', params: { ch: s.data.id } }) : nav({ to: '/lists/$id', params: { id: s.data.id } }))}>
              {isTrack ? 'Open my track' : 'Open my list'}
            </Button>
          : <Button onClick={add}><Plus aria-hidden="true" />{mode === 'signin' ? 'Sign in to add' : isTrack ? 'Add to my tracks' : 'Add to my lists'}</Button>}
      </Header>
      {isTrack ? <TrackPreview c={s.data as Chapter} /> : <ListPreview l={s.data as ListDef} />}
    </>
  )
}
