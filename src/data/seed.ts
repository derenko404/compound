// First-run content: the original roadmap (plan.ts, guides.ts, lists.ts) turned into editable chapters, lists and routines.
// Ids match what progress was stored under before content became editable, so old ticks still count.
import type { Chapter, ChapterId, Checklist, Components, ListDef, Op, Program, Project, Resource, Routine, State } from '@/lib/types'
import { emptyState } from '@/lib/types'
import { PALETTE } from '@/lib/content'
import { CH, CH_ORDER, CRAVING_TIPS, DAILY, LIST_META, MILESTONES, PROJECTS, QUARTERS, TASKS } from './plan'
import { GUIDES, OVERVIEW, PROJECT_DETAILS } from './guides'
import { LISTS } from './lists'

// 3: undoes 2, which had cut the Plan intro to its first sentence; the full text, now called motivation, is shown folded instead.
// 4: chapters have one name; the seeded ones take their short name ("Technical", not "Deep technical").
// 5: the catch-all chapter is "Personal", not "Mine".
// 6: the daily learning log routine is gone.
export const SEED_VERSION = 6
const CUT_INTRO = 'AI agents are taking over the step from a clear spec to working code; the skills around that step keep you valuable.'

const COLOR: Record<string, (typeof PALETTE)[number]> = {
  tech: 'blue', product: 'orange', mgmt: 'purple', biz: 'green', eng: 'pink', money: 'amber', smoke: 'slate', gym: 'teal', own: 'gray',
}

const HINTS: Record<string, string> = {
  tech: 'system design, backend, cloud, databases, code, AI engineering',
  product: 'product sense, UI/UX design, metrics, A/B tests',
  mgmt: 'teams, 1:1s, hiring, project management',
  biz: 'startups, adtech, how companies work, strategy',
  eng: 'pronunciation, speaking, writing, public speaking',
  money: 'budget, savings, investing',
  smoke: 'cravings, triggers',
  gym: 'workouts, food, weight, sleep',
  own: 'anything personal that fits nothing above',
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)

function project(id: string, name: string): Project {
  const d = PROJECT_DETAILS[id]
  const [trains, size] = (d?.stack ?? '').split(' · ').map((s) => s.replace(/^(Trains|Size): /, ''))
  return { id, code: id, name, goal: d?.goal, steps: d?.steps, done: d?.done, trains: trains || undefined, size: size || undefined }
}

function seedChapter(id: ChapterId, position: number, settings: State['settings']): Chapter {
  const g = GUIDES[id]
  const kind = CH_ORDER.includes(id) ? 'learn' : id === 'own' ? 'general' : 'health'
  const resources: Resource[] = (g?.groups ?? []).flatMap((grp) =>
    grp.items.map((r) => ({
      id: `res:${id}:${slug(r.url ?? r.title)}`, title: r.title, url: r.url, kind: r.kind ?? 'other', note: r.note, free: r.free, topic: grp.title,
    })),
  )
  const checklists: Checklist[] = (g?.checklists ?? [])
    .filter((l) => !l.title.startsWith('Plan')) // the "Plan: 18 months" lists repeat the plan tasks
    .map((l) => ({ id: slug(l.title), title: l.title, items: l.items.map((text, i) => ({ id: `chk:${id}:${slug(l.title)}:${i}`, text })) }))
  const intros = (g?.groups ?? []).filter((x) => x.intro).map((x) => `${x.title}: ${x.intro}`)

  let components: Components | undefined
  if (id === 'smoke')
    components = {
      quit: {
        date: settings.quit?.date ?? null, per_day: settings.quit?.cpd ?? 10, price: settings.quit?.price ?? 100, unit: 'cigarettes',
        milestones: MILESTONES, tips: CRAVING_TIPS, check_id: 'smoke-free', check_title: 'Smoke-free today',
      },
    }
  if (id === 'gym')
    components = {
      workout: {
        start: settings.gym_start ?? null, days: [1, 3, 5], check_id: 'gym',
        workouts: [
          { name: 'Workout A', text: 'Squat, bench press, barbell row: 3 × 5–8' },
          { name: 'Workout B', text: 'Deadlift, overhead press, pull-ups: 3 × 5–8' },
        ],
      },
      weight: { unit: 'kg' },
    }

  return {
    id, kind, position, name: CH[id].short, color: COLOR[id],
    description: g?.why, start: 0, months: 18,
    outcomes: g?.outcomes ?? [],
    skills: OVERVIEW.skills?.find((s) => s.chapter === id)?.skills ?? [],
    tasks: TASKS.filter((t) => t.ch === id).map((t) => {
      const q0 = (t.q - 1) * 3
      return { id: t.id, text: t.text, from: q0 + (t.m ?? 0), to: q0 + (t.m ?? 2) }
    }),
    projects: PROJECTS.filter((p) => p.ch === id).map((p) => project(p.id, p.name)),
    resources, checklists,
    tips: [...intros, ...(g?.tips ?? [])],
    hint: HINTS[id],
    components,
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
    { id: 'study', position: n, title: 'Study 45 minutes', chapter: '', when: { kind: 'weekly', days: [1, 3] }, fill: 'focus', created_at: at },
    { id: 'light', position: n + 1, title: 'Light track 30 minutes', chapter: '', when: { kind: 'weekly', days: [4] }, fill: 'light', created_at: at },
    { id: 'project', position: n + 2, title: 'Project block: 2 hours', chapter: '', when: { kind: 'weekly', days: [6] }, fill: 'project', created_at: at },
    { id: 'review', position: n + 3, title: 'Weekly review: 20 minutes', sub: "Tick finished tasks, note what worked, pick next week's 3 tasks", chapter: 'own', when: { kind: 'weekly', days: [0] }, created_at: at },
    { id: 'money-check', position: n + 4, title: 'Monthly money check-in', sub: 'Update spending, savings rate and net worth', chapter: 'money', when: { kind: 'monthly', day: 1 }, created_at: at },
    { id: 'matrix', position: n + 5, title: 'Re-score your skill matrix', sub: '1 to 5 for each skill in your chapters', chapter: 'own', when: { kind: 'monthly', day: -1 }, created_at: at },
  ]
}

const seedLists = (): ListDef[] =>
  (Object.keys(LIST_META) as (keyof typeof LIST_META)[]).map((k, i) => ({
    id: k, position: i, name: LIST_META[k].name, title: LIST_META[k].title, sub_label: LIST_META[k].sub,
    items: LISTS[k].map(([title, sub], idx) => ({ id: String(idx), title, sub })),
  }))

// What's missing from this account's content, by seed version. Empty once the latest seed has run.
export function seedOps(s: State): Op[] {
  const seeded = s.settings.program?.seeded ?? 0
  if (seeded >= SEED_VERSION) return []
  const ops: Op[] = []
  // Content only on the first run, so chapters, lists and routines deleted later stay deleted.
  if (seeded < 1) {
    const have = new Set(s.chapters.map((c) => c.id))
    ;[...CH_ORDER, 'smoke', 'gym', 'own'].forEach((id, i) => {
      if (!have.has(id)) ops.push({ type: 'putChapter', chapter: seedChapter(id, i, s.settings) })
    })
    const lists = new Set(s.lists.map((l) => l.id))
    for (const l of seedLists()) if (!lists.has(l.id)) ops.push({ type: 'putList', list: l })
    const routines = new Set(s.routines.map((r) => r.id))
    for (const r of seedRoutines()) if (!routines.has(r.id)) ops.push({ type: 'putRoutine', routine: r })
  }
  // Version 4: drop the second name. A seeded chapter still named as in the doc takes its short name; one the user renamed keeps it.
  if (seeded >= 1 && seeded < 4)
    for (const c of s.chapters as (Chapter & { short?: string })[]) {
      if (!('short' in c)) continue
      const { short, ...rest } = c
      const name = CH[c.id] && c.name === CH[c.id].name && short ? short : c.name
      ops.push({ type: 'putChapter', chapter: { ...rest, name } })
    }
  // Version 6: the learning log routine was dropped. Old log lines stay in the day logs.
  if (seeded >= 1 && seeded < 6 && s.routines.some((r) => r.id === 'log')) ops.push({ type: 'deleteRoutine', id: 'log' })
  // Version 5: an untouched catch-all chapter named "Mine" becomes "Personal".
  if (seeded === 4) {
    const own = s.chapters.find((c) => c.id === 'own' && c.name === 'Mine')
    if (own) ops.push({ type: 'putChapter', chapter: { ...own, name: 'Personal' } })
  }
  // Before version 3 the motivation was stored as `intro`.
  const { intro: oldIntro, ...prev } = (s.settings.program ?? {}) as Partial<Program> & { intro?: string }
  const had = prev.motivation ?? oldIntro
  ops.push({
    type: 'settings',
    patch: {
      program: {
        months: 18,
        quarters: QUARTERS.map((q) => ({ focus: q.focus, project: q.project })),
        ...prev,
        // Keep what the user wrote; restore only the text version 2 cut short.
        motivation: !had || had === CUT_INTRO ? OVERVIEW.intro : had,
        seeded: SEED_VERSION,
      },
    },
  })
  return ops
}

// Local data saved before content became editable: own tasks become routines, list ticks move to listProgress.
export function upgradeLocal(raw: Record<string, unknown>): State {
  const s = { ...emptyState(), ...raw } as State & { tasks?: { id: string; title: string; chapter: string; repeat: string; date: string | null; weekday: number | null; created_at: string }[] }
  if (s.tasks) {
    for (const t of s.tasks)
      s.routines.push({
        id: t.id, position: 1000, title: t.title, chapter: t.chapter, created_at: t.created_at,
        when: t.repeat === 'daily' ? { kind: 'daily' } : t.repeat === 'weekly' ? { kind: 'weekly', days: [t.weekday ?? 1] } : { kind: 'once', date: t.date ?? '' },
      })
    delete s.tasks
  }
  if (!Array.isArray(s.lists)) {
    const old = s.lists as unknown as Record<string, Record<string, { done_at?: string | null; note?: string | null }>>
    s.listProgress = { ...old }
    s.lists = []
  }
  return s
}
