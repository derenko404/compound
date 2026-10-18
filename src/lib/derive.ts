// Pure functions that turn stored state into what the views show.
import type { Chapter, ChapterId, Habit, Routine, State } from './types'
import { habitRows } from './habits'
import { chapterOf, chapters, matchesWhen, program } from './content'
import { addDays, dayDiff, keyOf, parseKey } from './dates'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']

// "Aug 2027"
export const monthName = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`

// A track's target finish: its duration counted from when it was created.
export function targetFinish(c: Chapter, months = c.months) {
  if (!months) return null
  const from = c.created_at ? new Date(c.created_at) : new Date()
  return new Date(from.getFullYear(), from.getMonth() + months, from.getDate())
}

// The heavy track: study sessions and the weekend project work on it.
export const focusOf = (s: State): ChapterId | null => program(s).focus

// A track's progress is its topics ticked.
export const topicIds = (c: Chapter) => c.skills.flatMap((k) => k.topics.map((t) => t.id))

export function trackProgress(s: State, c: Chapter) {
  const ids = topicIds(c)
  return { done: ids.filter((id) => s.plan[id]).length, total: ids.length }
}

// What to study next on a track: the first skill with a topic left, and that topic.
export function nextUp(s: State, c: Chapter) {
  for (const [index, skill] of c.skills.entries()) {
    const topic = skill.topics.find((t) => !s.plan[t.id])
    if (topic) return { skill, index, topic }
  }
  return null
}

// The weekend slot's project: the first one not done.
export const currentProject = (s: State, c: Chapter) => c.projects.find((p) => (s.projects[p.id] ?? 'todo') !== 'done')

// Topics ticked per week over the last 4 weeks, and when the track would finish at that pace.
export function pace(s: State, c: Chapter, today: Date) {
  const ids = new Set(topicIds(c))
  const since = addDays(today, -28).getTime()
  const recent = Object.entries(s.plan).filter(([id, at]) => ids.has(id) && new Date(at).getTime() >= since).length
  const perWeek = recent / 4
  const { done, total } = trackProgress(s, c)
  const left = total - done
  return { perWeek, left, finish: perWeek > 0 && left > 0 ? addDays(today, Math.ceil((left / perWeek) * 7)) : null }
}

// A topic ticked exactly 7 or 30 days ago comes back for a recap. The first one found, across the learn tracks.
const REVIEW_AFTER = [7, 30]
function reviewTopic(s: State, today: Date) {
  const want = new Set(REVIEW_AFTER.map((n) => keyOf(addDays(today, -n))))
  for (const c of chapters(s, 'learn')) {
    for (const skill of c.skills) {
      for (const topic of skill.topics) {
        const at = s.plan[topic.id]
        if (at && want.has(keyOf(new Date(at)))) return { c, skill, topic, ago: dayDiff(new Date(at), today) }
      }
    }
  }
  return null
}

// When a track with a target would finish late at its pace: one more topic today, the one after the next.
// Pace looks back 4 weeks, so a younger track isn't judged yet.
function catchUp(s: State, c: Chapter, today: Date) {
  const target = targetFinish(c)
  if (!target || !c.created_at || dayDiff(new Date(c.created_at), today) < 28) return null
  const { finish, left } = pace(s, c, today)
  if (!left || (finish && finish <= target)) return null
  const open = c.skills.flatMap((skill) => skill.topics.filter((t) => !s.plan[t.id]).map((topic) => ({ skill, topic })))
  const extra = open[1]
  if (!extra) return null
  const why = finish ? `Behind pace: you'd finish ${monthName(finish)}, target ${monthName(target)}` : `Behind pace: nothing ticked in 4 weeks, target ${monthName(target)}`
  return { topic: extra.topic, why }
}

// Weeks since a fixed Monday, so the light track changes every Monday.
const weekIndex = (d: Date) => Math.floor(dayDiff(new Date(2024, 0, 1), d) / 7)

// Rotates weekly through the roadmap tracks that aren't the focus, have something left, and have no daily routine.
function lightTrackChapter(s: State, d: Date, focus: ChapterId | null): ChapterId | null {
  const daily = new Set(s.routines.filter((r) => r.core).map((r) => r.chapter))
  const pool = chapters(s, 'learn').filter((c) => c.id !== focus && !daily.has(c.id) && nextUp(s, c)).map((c) => c.id)
  if (!pool.length) return null
  const w = ((weekIndex(d) % pool.length) + pool.length) % pool.length
  return pool[w]
}

// A track's next topic as a Today row: the topic as the title, its skill below.
const nextRow = (s: State, c: Chapter) => {
  const n = nextUp(s, c)
  return n ? { title: n.topic.text, sub: n.skill.name } : { title: 'Everything on this track is done.', sub: '' }
}

export const checkCount = (s: State, id: string) => Object.values(s.days).filter((d) => d.done.includes(id)).length

export type Slot = 'focus' | 'light' | 'project' | 'resource' | 'review' | 'catchup'

export interface DayItem {
  id: string
  ch: ChapterId | null
  title: string
  sub: string
  routine?: Routine // set when the item comes from an editable routine
  slot?: Slot // set on the rows from the tracks
  habit?: Habit // set on wellbeing habit rows
  done?: boolean // set when the tick isn't in the day's done list (habit rows)
}

export function todayItems(s: State, today: Date): DayItem[] {
  const focus = focusOf(s)
  const k = keyOf(today)
  const items: DayItem[] = []

  for (const r of [...s.routines].sort((a, b) => a.position - b.position)) {
    if (!matchesWhen(r.when, today, k)) continue
    items.push({ id: r.id, ch: r.chapter, title: r.title, sub: r.sub ?? '', routine: r })
  }

  // Rows from the tracks: the focus track's next topic, another track's (rotating weekly), the focus track's current project.
  const fc = chapterOf(s, focus)
  if (fc) items.push({ id: 'slot-focus', ch: fc.id, slot: 'focus', ...nextRow(s, fc) })
  const lc = chapterOf(s, lightTrackChapter(s, today, focus))
  if (lc) items.push({ id: 'slot-light', ch: lc.id, slot: 'light', ...nextRow(s, lc) })
  const p = fc ? currentProject(s, fc) : undefined
  if (fc && p) items.push({ id: 'slot-project', ch: fc.id, slot: 'project', title: `${p.code} ${p.name}`, sub: '' })
  const res = fc?.resources.find((r) => !s.plan[r.id])
  if (fc && res) items.push({ id: 'slot-resource', ch: fc.id, slot: 'resource', title: res.title, sub: res.note ?? '' })
  const rev = reviewTopic(s, today)
  if (rev) items.push({ id: 'slot-review', ch: rev.c.id, slot: 'review', title: rev.topic.text, sub: `${rev.skill.name}, ticked ${rev.ago} days ago` })
  const cu = fc ? catchUp(s, fc, today) : null
  if (fc && cu) items.push({ id: 'slot-catchup', ch: fc.id, slot: 'catchup', title: cu.topic.text, sub: cu.why })

  // Wellbeing habits due today. Their tick lives in the habit's log, so `done` comes with the row.
  for (const r of habitRows(s, today)) items.push({ id: `habit:${r.habit.id}`, ch: null, title: r.title, sub: r.sub, habit: r.habit, done: r.done })
  return items
}

// How much of a day's list was ticked. Past days are measured against today's routines.
export function dayProgress(s: State, d: Date) {
  const items = todayItems(s, d)
  const done = new Set(s.days[keyOf(d)]?.done ?? [])
  return { done: items.filter((i) => i.done ?? done.has(i.id)).length, total: items.length }
}

// Streak tasks due on a day: scheduled for it and created by then, so a new one doesn't break past streaks.
const coreDue = (s: State, d: Date, k: string) =>
  s.routines.filter((r) => r.core && keyOf(new Date(r.created_at)) <= k && matchesWhen(r.when, d, k)).map((r) => r.id)

// true when every streak task due that day was ticked, false when one was missed, null when none was due.
const coreDone = (s: State, d: Date): boolean | null => {
  const k = keyOf(d)
  const ids = coreDue(s, d, k)
  if (!ids.length) return null
  const done = s.days[k]?.done ?? []
  return ids.every((id) => done.includes(id))
}

// The first day any streak task existed; days before it can't count.
const coreStart = (s: State) => {
  const keys = s.routines.filter((r) => r.core).map((r) => keyOf(new Date(r.created_at))).sort()
  return keys[0] ? parseKey(keys[0]) : null
}

// Days with nothing due are skipped: they neither add to the streak nor break it. Today only counts once done.
export function streak(s: State, today: Date) {
  const start = coreStart(s)
  if (!start) return 0
  let n = 0
  let d = new Date(today)
  if (coreDone(s, d) !== true) d = addDays(d, -1)
  while (d >= start) {
    const ok = coreDone(s, d)
    if (ok === false) break
    if (ok) n++
    d = addDays(d, -1)
  }
  return n
}

export function bestStreak(s: State, today = new Date()) {
  const start = coreStart(s)
  let best = 0
  let run = 0
  for (let d = start; d && d <= today; d = addDays(d, 1)) {
    const ok = coreDone(s, d)
    if (ok === false) run = 0
    else if (ok) best = Math.max(best, ++run)
  }
  return best
}
