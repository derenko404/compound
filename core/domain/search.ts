/**
 * Searching the loaded state: topics with their skills, steps, tasks, resources and projects, lists with their items,
 * routines and habits. Notes aren't in the state and are searched by the note repository. Matching ignores
 * case and accents. Every word of the query must appear, in the item or in where it lives, and at least one in the
 * item itself: "films" finds the Films list, not each of its films, while "films godfather" finds the film.
 */
import type { State } from './types'

export type SearchKind = 'topic' | 'skill' | 'step' | 'task' | 'resource' | 'project' | 'list' | 'listItem' | 'routine' | 'habit'

/** One match: what it is, its text, and where it lives (a topic's or list's name, for display and opening it). */
export interface SearchHit {
  kind: SearchKind
  id: string
  title: string
  detail?: string
  topicId?: string
  listId?: string
  // A project's code, to open the topic at that project.
  code?: string
}

// Lower case without accents, so "cafe" finds "Café" and "ї" stays "ї" (only combining marks go).
const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const words = (query: string) => normalize(query).split(/\s+/).filter(Boolean)

type Text = string | null | undefined

// Every query word appears somewhere in the given texts.
const matches = (ws: string[], ...texts: Text[]) => {
  const hay = normalize(texts.filter(Boolean).join(' '))
  return ws.length > 0 && ws.every((w) => hay.includes(w))
}

// An item inside a topic or list: every word in its own text or its parents', at least one in its own.
const within = (ws: string[], own: Text[], parents: Text[]) =>
  matches(ws, ...own, ...parents) && ws.some((w) => matches([w], ...own))

function inState(s: State, query: string, kinds?: SearchKind[]): SearchHit[] {
  const ws = words(query)
  if (!ws.length) return []
  const want = (k: SearchKind) => !kinds || kinds.includes(k)
  const hits: SearchHit[] = []
  for (const c of s.topics.filter((x) => !x.archived)) {
    if (want('topic') && matches(ws, c.name, c.description, c.outcomes.join(' ')))
      hits.push({ kind: 'topic', id: c.id, title: c.name, topicId: c.id })
    for (const k of c.skills) {
      if (want('skill') && within(ws, [k.name, k.intro], [c.name])) hits.push({ kind: 'skill', id: k.id, title: k.name, detail: c.name, topicId: c.id })
      for (const step of k.steps)
        if (want('step') && within(ws, [step.text], [k.name, c.name])) hits.push({ kind: 'step', id: step.id, title: step.text, detail: `${c.name} · ${k.name}`, topicId: c.id })
    }
    for (const x of c.tasks)
      if (want('task') && within(ws, [x.title, x.sub], [c.name])) hits.push({ kind: 'task', id: x.id, title: x.title, detail: c.name, topicId: c.id })
    for (const r of c.resources)
      if (want('resource') && within(ws, [r.title, r.note, r.url], [c.name])) hits.push({ kind: 'resource', id: r.id, title: r.title, detail: c.name, topicId: c.id })
    for (const p of c.projects)
      if (want('project') && within(ws, [p.code, p.name, p.goal], [c.name])) hits.push({ kind: 'project', id: p.id, title: `${p.code} ${p.name}`, detail: c.name, topicId: c.id, code: p.code })
  }
  for (const l of s.lists) {
    if (want('list') && matches(ws, l.name, l.title)) hits.push({ kind: 'list', id: l.id, title: l.name, detail: l.title, listId: l.id })
    for (const it of l.items) {
      if (want('listItem') && within(ws, [it.title, it.sub], [l.name])) hits.push({ kind: 'listItem', id: it.id, title: it.title, detail: [l.name, it.sub].filter(Boolean).join(' · '), listId: l.id })
    }
  }
  for (const r of s.routines)
    if (want('routine') && matches(ws, r.title, r.sub)) hits.push({ kind: 'routine', id: r.id, title: r.title, detail: r.sub })
  for (const h of s.habits)
    if (want('habit') && matches(ws, h.name, h.why)) hits.push({ kind: 'habit', id: h.id, title: h.name, detail: h.why ?? undefined })
  return hits
}

export const search = { normalize, words, matches, inState }
