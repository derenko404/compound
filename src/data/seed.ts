// First-run content for a new account: Personal (built in), one example track and one example list,
// so the app isn't empty on day one. Everything here is the user's to edit or delete.
import type { Chapter, ListDef, Op, State } from '@/lib/types'
import { FILMS } from './films'

// Bump when the starting content changes shape. An account on an older version gets these items written again
// (by id; other content stays).
export const SEED_VERSION = 8

const now = () => new Date().toISOString()

// Built in: the default track for notes and routines. Added back on load if it's ever missing.
const personal = (): Chapter => ({
  id: 'own', kind: 'general', position: 1, name: 'Personal', color: 'gray', created_at: now(),
  description: 'Anything that fits no other track: personal notes, tasks and routines.',
  outcomes: [], skills: [], resources: [], projects: [],
  hint: 'anything personal that fits no other track',
})

// An example learning track: one skill, one resource, one project.
const english = (): Chapter => ({
  id: 'english', kind: 'learn', position: 0, name: 'English', color: 'pink', created_at: now(), months: 6,
  description: 'An example track. Edit it to fit your goals, or delete it and add your own on Tracks.',
  outcomes: ['Speak clearly enough that people rarely ask you to repeat yourself'],
  skills: [{
    id: 'english-pronunciation', name: 'Pronunciation',
    intro: 'Clear sounds and rhythm, so people understand you the first time.',
    topics: [
      { id: 'english-sounds', text: 'The sounds that differ from your own language' },
      { id: 'english-stress', text: 'Word stress' },
      { id: 'english-rhythm', text: 'Sentence rhythm and intonation' },
    ],
  }],
  resources: [{
    id: 'english-youglish', title: 'YouGlish', url: 'https://youglish.com', kind: 'tool', free: true,
    note: 'Hear any word said by native speakers in real videos.',
  }],
  projects: [{
    id: 'english-record', code: 'EN1', name: 'Record yourself before and after', size: 'small', trains: ['Pronunciation'],
    goal: 'Record the same 2-minute text today and again in 3 months.',
    steps: ['Pick a 2-minute text', 'Record it today', 'Record it again in 3 months and compare'],
    done: 'Two recordings, and you can hear the difference.',
  }],
  hint: 'pronunciation, speaking, listening, writing',
})

const films = (): ListDef => ({
  id: 'films', position: 0, name: '🎬 Films', title: '100 films everyone should watch', sub_label: 'Year',
  items: FILMS.map(([title, sub], i) => ({ id: String(i), title, sub })),
})

// Everything a new account starts with. Empty once seeded.
export function seedOps(s: State): Op[] {
  if ((s.settings.program?.seeded ?? 0) >= SEED_VERSION) {
    return s.chapters.some((c) => c.id === 'own') ? [] : [{ type: 'putChapter', chapter: personal() }]
  }
  return [
    { type: 'putChapter', chapter: english() },
    { type: 'putChapter', chapter: personal() },
    { type: 'putList', list: films() },
    { type: 'settings', patch: { program: { seeded: SEED_VERSION, focus: 'english' } } },
  ]
}
