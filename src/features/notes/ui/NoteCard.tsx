import { ExternalLink, Lightbulb } from 'lucide-react'
import { topicOf } from '@core/domain/content'
import { dates } from '@/shared/lib/dates'
import { links } from '@core/domain/links'
import type { Note } from '@core/domain/types'
import { useStore } from '@/shared/store/StoreProvider'
import { Linkify } from '@/features/topics'
import { RemoveButton, Dot, Entry } from '@/shared/ui'
import { t } from '@/shared/i18n'

// One entry: a link shows its page, an idea its title and details, a note its text. Tapping the card (not a link) edits it.
// removable: edit mode, with the ⊖ to delete it.
export function NoteCard({ n, onOpen, onTag, showTopic = true, removable }: { n: Note; onOpen: () => void; onTag?: (t: string) => void; showTopic?: boolean; removable?: boolean }) {
  const { state, dispatch } = useStore()
  const yt = n.url ? links.youtubeId(n.url) : null
  return (
    <Entry ch={n.topic} onEdit={onOpen} editLabel={t.common.editNamed(n.body.slice(0, 40) || (n.url ? links.hostOf(n.url) : t.notebook.card.entry))}
      remove={removable && <RemoveButton label={t.notebook.card.deleteEntry} title={t.notebook.card.deleteAsk} description={t.notebook.card.deleteText} onConfirm={() => dispatch({ type: 'deleteNote', id: n.id })} />}>
      <div className="nb-card">
        {n.type === 'link' && n.url && (
          <div className="nb-link">
            {yt && <img className="nb-thumb" src={`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`} alt="" loading="lazy" />}
            <div className="min-w-0">
              <a href={n.url} target="_blank" rel="noreferrer" className="res-title nb-title">{links.hostOf(n.url)}<ExternalLink className="res-ext" aria-label={t.notebook.card.opensNewTab} /></a>
              {n.kind && <div className="nb-sub">{t.notebook.kinds[n.kind]}</div>}
            </div>
          </div>
        )}
        {n.context && <div className="nb-context"><div className="line-clamp-3">{n.context}</div></div>}
        {n.body && (n.type === 'idea'
          ? <div className="note-text nb-idea"><Lightbulb aria-hidden="true" /><span><Linkify text={n.body} /></span></div>
          : <div className={`note-text${n.type === 'link' ? ' nb-quote' : ''}`}><Linkify text={n.body} /></div>)}
        <div className="note-meta nb-meta">
          {showTopic && n.topic && <span className="inline-flex items-center gap-1"><Dot />{topicOf(state, n.topic)?.name ?? t.common.noTopic}</span>}
          {n.tags.map((tag) => onTag
            ? <button key={tag} type="button" className="nb-tag" onClick={() => onTag(tag)}>#{tag}</button>
            : <span key={tag} className="nb-tag">#{tag}</span>)}
          <span>{dates.fmtStamp(n.created_at)}</span>
          {n.source === 'telegram' && <span>{t.notebook.card.viaTelegram}</span>}
        </div>
      </div>
    </Entry>
  )
}
