// First-run content for a new account: the original roadmap (plan.ts, guides.ts, lists.ts) as editable tracks, habits, lists and routines.
import type { Chapter, ChapterId, ListDef, Op, Program, Project, Resource, Routine, Skill, State } from '@/lib/types'
import { PALETTE, codePrefix } from '@/lib/content'
import { CH, CH_ORDER, DAILY, LIST_META, PROJECTS, QUARTERS } from './plan'
import { GUIDES, PROJECT_DETAILS } from './guides'
import { LISTS } from './lists'

// Bump when the shape of the starting content changes: accounts on an older version get the starting tracks,
// lists and routines replaced (no old data is kept compatible while the app is being reworked).
export const SEED_VERSION = 8

const COLOR: Record<string, (typeof PALETTE)[number]> = {
  tech: 'blue', product: 'orange', mgmt: 'purple', biz: 'green', eng: 'pink', money: 'amber', own: 'gray',
}

// Doc topic lists named differently from the section they belong to: list name → skill name.
const MERGE: Record<string, Record<string, string>> = {
  tech: { Backend: 'System design and highload backend' },
  money: {
    'Saving: the order most guides agree on': 'Saving and budgeting',
    'Paths to income beyond salary': 'Making money beyond salary',
    'Salary: rules that work': 'Earning more',
  },
}

const HINTS: Record<string, string> = {
  tech: 'system design, backend, cloud, databases, code, AI engineering',
  product: 'product sense, UI/UX design, metrics, A/B tests',
  mgmt: 'teams, 1:1s, hiring, project management',
  biz: 'startups, adtech, how companies work, strategy',
  eng: 'pronunciation, speaking, writing, public speaking',
  money: 'budget, savings, investing',
  own: 'anything personal that fits nothing above',
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)

function project(id: string, name: string): Project {
  const d = PROJECT_DETAILS[id]
  const [trains, size] = (d?.stack ?? '').split(' · ').map((s) => s.replace(/^(Trains|Size): /, ''))
  return { id, code: id, name, goal: d?.goal, steps: d?.steps, done: d?.done, trains: trains ? trains.split(', ') : undefined, size: size ? (size.split(' ')[0].toLowerCase() as Project['size']) : undefined }
}

function seedChapter(id: ChapterId, position: number): Chapter {
  const g = GUIDES[id]
  const kind = id === 'own' ? 'general' : 'learn'
  // "Leadership and influence: videos", "Product sense: YouTube and podcasts" → the topic alone.
  const cleanTitle = (t: string) => t.replace(/:\s*(?:free\s+)?(?:(?:YouTube|videos?|books?|articles?|podcasts?|channels?|courses?|guides?|resources)(?:\s*(?:,|and)\s*)?)+$/i, '').trim()
  const cap = (x: string) => x.trim().replace(/^./, (c) => c.toUpperCase())

  // Skills: every "topics in order" in the doc (section intros and tips with an a → b → c chain) and every checklist.
  // Plain advice becomes a paragraph of About.
  const notes = [
    ...(g?.groups ?? []).filter((x) => x.intro).map((x) => ({ title: cleanTitle(x.title), text: x.intro! })),
    ...(g?.tips ?? []).map((t) => {
      const i = t.indexOf(': ')
      return i > 0 && i <= 60 ? { title: t.slice(0, i), text: t.slice(i + 2) } : { title: '', text: t }
    }),
  ]
  const skills: Skill[] = []
  const about: string[] = []
  for (const n of notes) {
    const m = /(?:Topics(?:,? in order)?:\s*)?([^.:]*?(?:\s→\s[^.→]+){2,})\.?$/.exec(n.text)
    const sid = `skill-${slug(n.title)}`
    if (m && n.title)
      skills.push({
        id: sid, name: n.title, intro: n.text.slice(0, m.index).trim() || undefined,
        topics: m[1].split(/\s→\s/).map((x, i) => ({ id: `chk:${id}:${sid}:${i}`, text: cap(x) })),
      })
    else about.push(n.title ? `${n.title}: ${n.text}` : n.text)
  }
  for (const l of (g?.checklists ?? []).filter((l) => !l.title.startsWith('Plan'))) { // "Plan: 18 months" repeats the plan tasks
    const name = cleanTitle(l.title.replace(/[:,]?\s*(topics)?,?\s*in order$/i, '').replace(/:\s*topics$/i, ''))
    // Some doc lists are named after their section elsewhere ("Backend" belongs to "System design and highload backend").
    const named = MERGE[id]?.[name] ?? name
    const sid = `skill-${slug(named)}`
    const host = skills.find((k) => k.id === sid)
    const topics = l.items.map((text, i) => ({ id: `chk:${id}:${sid}:${(host?.topics.length ?? 0) + i}`, text }))
    if (host) host.topics.push(...topics) // a second list for the same skill adds to it
    else skills.push({ id: sid, name: named, topics })
  }
  // Skills follow the doc's section order (the order you learn them in); ones without a section keep their place after.
  const sections = (g?.groups ?? []).map((x) => cleanTitle(x.title).toLowerCase())
  const first = (x: string) => x.toLowerCase().split(/[\s,:]+/)[0]
  const rank = (k: Skill) => {
    const n = k.name.toLowerCase()
    const i = sections.findIndex((t) => t === n || t.startsWith(n) || n.startsWith(t) || first(t) === first(n))
    return i < 0 ? sections.length : i
  }
  skills.sort((a, b) => rank(a) - rank(b))
  const resources: Resource[] = (g?.groups ?? []).flatMap((grp) =>
    grp.items.map((r) => ({
      id: `res:${id}:${slug(r.url ?? r.title)}`, title: r.title, url: r.url, kind: r.kind ?? 'other', note: r.note, free: r.free,
    })),
  )

  return {
    id, kind, position, name: CH[id].short, color: COLOR[id],
    description: [g?.why, ...about].filter(Boolean).join('\n\n') || undefined,
    outcomes: g?.outcomes ?? [],
    projects: PROJECTS.filter((p) => p.ch === id).map((p) => project(p.id, p.name)),
    resources, skills,
    hint: HINTS[id],
  }
}

function seedRoutines(): Routine[] {
  const at = new Date(0).toISOString()
  const base = DAILY.map((d, i): Routine => ({
    id: d.id, position: i, title: d.title, sub: d.sub, chapter: d.ch, when: { kind: 'daily' }, core: true, created_at: at,
  }))
  const n = base.length
  return [
    ...base,
    { id: 'review', position: n, title: 'Weekly review: 20 minutes', sub: "Tick finished tasks, note what worked, pick next week's 3 tasks", chapter: 'own', when: { kind: 'weekly', days: [0] }, created_at: at },
    { id: 'money-check', position: n + 1, title: 'Monthly money check-in', sub: 'Update spending, savings rate and net worth', chapter: 'money', when: { kind: 'monthly', day: 1 }, created_at: at },
    { id: 'matrix', position: n + 2, title: 'Re-score your skill matrix', sub: '1 to 5 for each skill in your chapters', chapter: 'own', when: { kind: 'monthly', day: -1 }, created_at: at },
  ]
}

const seedLists = (): ListDef[] =>
  (Object.keys(LIST_META) as (keyof typeof LIST_META)[]).map((k, i) => ({
    id: k, position: i, name: LIST_META[k].name, title: LIST_META[k].title, sub_label: LIST_META[k].sub,
    items: LISTS[k].map(([title, sub], idx) => ({ id: String(idx), title, sub })),
  }))

// The doc's one-letter project codes (T1, P2…) become the track's prefix plus the same number (TE1, PR2…),
// in the codes and in every text that mentions them.
function withTrackCodes(chapters: Chapter[], routines: Routine[], program: Program) {
  const map = new Map<string, string>()
  for (const c of chapters) {
    const prefix = codePrefix(c, chapters)
    for (const p of c.projects) map.set(p.code, prefix + p.code.slice(1))
  }
  const re = new RegExp(`\\b(${[...map.keys()].join('|')})\\b`, 'g')
  const keep = new Set(['id', 'check_id', 'chapter', 'url'])
  const fix = <T,>(x: T): T => JSON.parse(JSON.stringify(x), (k, v) => (typeof v === 'string' && !keep.has(k) ? v.replace(re, (c) => map.get(c) ?? c) : v))
  return { chapters: chapters.map(fix), routines: routines.map(fix), program: fix(program) }
}

// Everything a new account starts with. Empty once seeded.
export function seedOps(s: State): Op[] {
  // Personal is built in for every account: if it's ever missing, it's added back on load.
  if ((s.settings.program?.seeded ?? 0) >= SEED_VERSION) {
    return s.chapters.some((c) => c.id === 'own') ? [] : [{ type: 'putChapter', chapter: { ...seedChapter('own', 0), created_at: new Date().toISOString() } }]
  }
  const raw = [...CH_ORDER, 'own'].map((id, i) => seedChapter(id, i))
  // The roadmap's first quarter's focus is the starting focus; each roadmap track gets 18 months.
  const program: Program = { seeded: SEED_VERSION, focus: QUARTERS[0]?.focus ?? null }
  for (const c of raw) {
    c.created_at = new Date().toISOString()
    if (c.kind === 'learn') c.months = 18
  }
  const content = withTrackCodes(raw, seedRoutines(), program)
  return [
    ...content.chapters.map((chapter): Op => ({ type: 'putChapter', chapter })),
    ...seedLists().map((list): Op => ({ type: 'putList', list })),
    ...content.routines.map((routine): Op => ({ type: 'putRoutine', routine })),
    { type: 'settings', patch: { program: content.program } },
  ]
}
