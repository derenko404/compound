// /share/<id>: someone's shared topic or list. Readable without an account; adding a copy needs one (or this device).
import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { getShare, supabase } from '@/shared/api/backends'
import { useStore } from '@/shared/store/StoreProvider'
import { listFromShare, topicFromShare } from '@/core/domain/content'
import type { Topic, ListDef } from '@/core/domain/types'
import { Header, List, MoreText, Row, Section } from '@/shared/ui'
import { Bullets, Linkify, ProjectCard, ResourceGroups, SkillFolds } from '@/entities/topic'
import { SignIn } from '@/features/auth'
import { t } from '@/shared/i18n'

const route = getRouteApi('/share/$id')

// After signing in (Google comes back on /today), the app returns here to finish adding.
export const PENDING_SHARE = 'roadmap-pending-share'

// The shared topic's own colour, since it isn't one of the visitor's topics.
function TopicPreview({ c }: { c: Topic }) {
  return (
    <div style={{ '--c': `var(--p-${c.color})` } as CSSProperties}>
      {c.description && <div className="mb-6"><div className="lead"><MoreText lines={6}><Linkify text={c.description} /></MoreText></div></div>}
      {c.outcomes.length > 0 && <Section title={t.topics.goals}><Bullets items={c.outcomes} /></Section>}
      {c.skills.length > 0 && <Section title={t.topics.tabs.skills}><SkillFolds skills={c.skills} readOnly /></Section>}
      {c.resources.length > 0 && <Section title={t.topics.tabs.resources}><ResourceGroups resources={c.resources} readOnly /></Section>}
      {c.projects.length > 0 && (
        <Section title={t.topics.tabs.projects}>
          <List>{c.projects.map((p) => <ProjectCard key={p.id} p={p} readOnly />)}</List>
        </Section>
      )}
    </div>
  )
}

function ListPreview({ l }: { l: ListDef }) {
  return (
    <Section title={t.topics.shared.items(l.items.length)}>
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
  if (!supabase) return <List empty={t.topics.shared.needsOnline} />
  if (share.isPending) return <List empty={t.common.loading} />
  if (!share.data) return <List empty={t.topics.shared.expired} />

  const s = share.data
  const isTopic = s.kind === 'topic'
  const add = () => {
    if (mode === 'signin') {
      localStorage.setItem(PENDING_SHARE, id)
      setSigningIn(true)
      return
    }
    if (isTopic) {
      const c = topicFromShare(s.data as Topic, state.topics)
      dispatch({ type: 'putTopic', topic: c })
      void nav({ to: '/topics/$ch', params: { ch: c.id } })
    } else {
      const l = listFromShare(s.data as ListDef, state.lists)
      dispatch({ type: 'putList', list: l })
      void nav({ to: '/lists/$id', params: { id: l.id } })
    }
  }

  // Your own link: nothing to add, just a way back to the original (if it's still there).
  const original = s.mine ? (isTopic ? state.topics.some((c) => c.id === s.data.id) : state.lists.some((l) => l.id === s.data.id)) : false
  return (
    <>
      <Header title={s.name} lead={s.mine ? t.topics.shared.yours : isTopic ? t.topics.shared.aTopic : (s.data as ListDef).title}>
        {s.mine
          ? original && <Button variant="outline" onClick={() => void (isTopic ? nav({ to: '/topics/$ch', params: { ch: s.data.id } }) : nav({ to: '/lists/$id', params: { id: s.data.id } }))}>
              {isTopic ? t.topics.shared.openTopic : t.topics.shared.openList}
            </Button>
          : <Button onClick={add}><Plus aria-hidden="true" />{mode === 'signin' ? t.topics.shared.signInToAdd : isTopic ? t.topics.shared.addTopic : t.topics.shared.addList}</Button>}
      </Header>
      {isTopic ? <TopicPreview c={s.data as Topic} /> : <ListPreview l={s.data as ListDef} />}
    </>
  )
}
