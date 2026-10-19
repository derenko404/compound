// /share/<id>: someone's shared topic or list. Readable without an account; adding a copy needs one (or this device).
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { getShare, supabase } from '@/shared/api/backends'
import { useStore } from '@/shared/store/StoreProvider'
import { listFromShare, topicFromShare } from '@core/domain/content'
import type { Topic, ListDef } from '@core/domain/types'
import { Brand, Header, List } from '@/shared/ui'
import { PENDING_SHARE, SignIn } from '@/features/auth'
import { t } from '@/shared/i18n'
import { TopicPreview } from './TopicPreview'
import { ListPreview } from './ListPreview'

const route = getRouteApi('/share/$id')


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
      {/* Visitors see no top bar, so the page says whose app this is. */}
      {mode === 'signin' && <Link to="/" className="page-brand"><Brand /></Link>}
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
