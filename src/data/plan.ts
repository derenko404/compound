// Seed only (see seed.ts): the original plan content from the Engineer Skills Roadmap doc. The bot falls back to CH until chapters are seeded.
import type { ChapterId } from '../lib/types'

export const DOC_URL = 'https://claude.ai/code/artifact/61482468-7024-4621-a941-2a770a3df94d'

export interface Chapter {
  name: string
  short: string
  color: string
}

export const CH: Record<ChapterId, Chapter> = {
  tech: { name: 'Deep technical', short: 'Technical', color: '--c-tech' },
  product: { name: 'Product and UX', short: 'Product', color: '--c-product' },
  mgmt: { name: 'Management and leadership', short: 'Management', color: '--c-mgmt' },
  biz: { name: 'Business and companies', short: 'Business', color: '--c-biz' },
  eng: { name: 'English and communication', short: 'English', color: '--c-eng' },
  money: { name: 'Money and finances', short: 'Money', color: '--c-money' },
  smoke: { name: 'Quit smoking', short: 'Smoking', color: '--c-smoke' },
  gym: { name: 'Gym and diet', short: 'Gym', color: '--c-gym' },
  own: { name: 'My own', short: 'Personal', color: '--c-own' },
}
export const CH_ORDER: ChapterId[] = ['tech', 'product', 'mgmt', 'biz', 'eng', 'money']
export const ALL_CHAPTERS: ChapterId[] = [...CH_ORDER, 'own']

export interface Quarter {
  q: number
  months: string
  focus: ChapterId
  project: string
}

export const QUARTERS: Quarter[] = [
  { q: 1, months: 'Nov–Jan', focus: 'tech', project: 'T1: URL shortener on AWS' },
  { q: 2, months: 'Feb–Apr', focus: 'product', project: 'P2: redesign one screen' },
  { q: 3, months: 'May–Jul', focus: 'tech', project: 'T2: distributed rate limiter' },
  { q: 4, months: 'Aug–Oct', focus: 'mgmt', project: 'M1: lead a feature end to end' },
  { q: 5, months: 'Nov–Jan', focus: 'biz', project: 'B2 and B3: validate and launch a product' },
  { q: 6, months: 'Feb–Apr', focus: 'tech', project: 'T4: ticket to merge request pipeline' },
]

export interface PlanTask {
  id: string
  ch: ChapterId
  q: number
  // month within the quarter (0, 1, 2), or null for the whole quarter
  m: number | null
  text: string
}

const T = (id: string, ch: ChapterId, q: number, m: number | null, text: string): PlanTask => ({ id, ch, q, m, text })

export const TASKS: PlanTask[] = [
  T('tech-1a', 'tech', 1, 0, "Watch System Design for Beginners and 10 ByteByteGo videos; draw your company's architecture"),
  T('tech-1b', 'tech', 1, 1, 'AWS Cloud Practitioner course; AWS account with MFA and a budget alarm; Docker Get Started'),
  T('tech-1c', 'tech', 1, 2, 'Go Tour and Learn Go with Tests ch. 1–8; start T1 URL shortener'),
  T('tech-2a', 'tech', 2, null, 'Finish T1; read Use the Index, Luke and the PostgreSQL tutorial'),
  T('tech-2b', 'tech', 2, null, 'Read DDIA chapters 1–3'),
  T('tech-3a', 'tech', 3, 0, "Replication and partitioning: DDIA 5–6 and Hussein Nasser's database videos"),
  T('tech-3b', 'tech', 3, 1, 'Caching, queues and rate limiting; build T2 rate limiter'),
  T('tech-3c', 'tech', 3, 2, 'DDIA 7–9 and Kleppmann lectures 1–4; load-test T1 with k6'),
  T('tech-4a', 'tech', 4, null, 'Terraform tutorials; rebuild T1 with Terraform and deploy from CI/CD'),
  T('tech-5a', 'tech', 5, null, 'OpenTelemetry and SRE book ch. 1–6; add tracing and an alert to T1 (T6)'),
  T('tech-5b', 'tech', 5, null, 'OWASP Top 10 and 10 PortSwigger labs; security review of T1'),
  T('tech-6a', 'tech', 6, 0, "Read Anthropic's agent guides; build T3, your own MCP server"),
  T('tech-6b', 'tech', 6, 1, 'Evals, RAG and LLM cost; one DeepLearning.AI short course'),
  T('tech-6c', 'tech', 6, 2, 'Capstone T4 pipeline; 2 mock system design interviews'),
  T('prod-1a', 'product', 1, null, "Lenny's product sense post and 5 SVPG articles; note user and problem for every ticket"),
  T('prod-2a', 'product', 2, 0, 'Read Inspired and Continuous Discovery Habits; interview 5 users'),
  T('prod-2b', 'product', 2, 1, "Google UX course 1, Don't Make Me Think, Laws of UX, Figma basics"),
  T('prod-2c', 'product', 2, 2, 'Refactoring UI; redesign one screen and test it with 3 people (P2)'),
  T('prod-3a', 'product', 3, null, 'Udacity A/B Testing and the North Star Playbook; project P5'),
  T('prod-4a', 'product', 4, null, 'Technical Writing One; PRD for a real feature (P1); usability test with 5 users'),
  T('prod-5a', 'product', 5, null, 'Landing page, onboarding and pricing UX for your product (P3)'),
  T('prod-6a', 'product', 6, null, 'The Ad Tech Book plus VAST and OpenRTB specs; adtech explainer (P4)'),
  T('mgmt-1a', 'mgmt', 1, null, 'Read How to Win Friends and Influence People; study one meeting a week'),
  T('mgmt-2a', 'mgmt', 2, null, "Read The Manager's Path; run a retro, planning or demo (M4)"),
  T('mgmt-3a', 'mgmt', 3, null, 'Read Shape Up and the Scrum Guide; plan your next big task with milestones'),
  T('mgmt-4a', 'mgmt', 4, 0, 'Google PM Foundations; lead one feature end to end (M1)'),
  T('mgmt-4b', 'mgmt', 4, 1, 'Radical Candor and High Output Management; start mentoring weekly (M2)'),
  T('mgmt-4c', 'mgmt', 4, 2, 'Influence by Cialdini and the Influencing People course'),
  T('mgmt-5a', 'mgmt', 5, null, 'Drive one cross-team decision with an RFC (M3)'),
  T('mgmt-6a', 'mgmt', 6, null, "The Staff Engineer's Path or An Elegant Puzzle; agree 2 tech lead steps with your manager"),
  T('biz-1a', 'biz', 1, null, 'Read The Personal MBA; map how each department makes or saves money'),
  T('biz-2a', 'biz', 2, null, "Learn financial statements; explain one adtech company's P&L"),
  T('biz-3a', 'biz', 3, null, 'Good Strategy Bad Strategy; Business Model Canvas (B1); interview a local owner (B4)'),
  T('biz-4a', 'biz', 4, null, 'How to Start a Startup lectures 1–6, The Mom Test, The Lean Startup; interview 10 people'),
  T('biz-5a', 'biz', 5, 0, 'Pick one idea; landing page; 50 sign-ups or 5 pre-orders (B2)'),
  T('biz-5b', 'biz', 5, 1, 'Build the MVP in 4 weekends and charge from day one'),
  T('biz-5c', 'biz', 5, 2, 'Launch publicly (B3)'),
  T('biz-6a', 'biz', 6, null, 'Get 10 paying customers; write a public post; read The E-Myth and Profit First'),
  T('eng-1a', 'eng', 1, null, 'Sounds and vowels: checklist rows 2–7, one sound a week; record your day 1 text (E1)'),
  T('eng-2a', 'eng', 2, null, "Stress and intonation: rows 1 and 8–12; shadow Rachel's English daily"),
  T('eng-3a', 'eng', 3, null, 'Two conversations a week on italki or Tandem; start 100 days of speaking (E2)'),
  T('eng-4a', 'eng', 4, null, 'Audit a Coursera business English course; make the work phrases automatic'),
  T('eng-5a', 'eng', 5, null, 'Lead one meeting a week in English; join a Toastmasters club'),
  T('eng-6a', 'eng', 6, null, 'Give a 10-minute talk in English (E3); re-record your day 1 text'),
  T('money-1a', 'money', 1, null, 'Track spending for 30 days; build your finance dashboard (F1); Khan personal finance'),
  T('money-2a', 'money', 2, null, 'Automate accounts on payday; read The Psychology of Money; learn your tax rules'),
  T('money-3a', 'money', 3, null, 'Research your market rate, write a brag doc, negotiate a raise (F2)'),
  T('money-4a', 'money', 4, null, 'How the Economic Machine Works; index investing; The Simple Path to Wealth'),
  T('money-5a', 'money', 5, null, 'Write your investment policy and start automatic investing (F3)'),
  T('money-6a', 'money', 6, null, 'Earn your first side income (F4); review net worth and savings rate'),
]

export interface Project {
  id: string
  ch: ChapterId
  name: string
}

const P = (id: string, ch: ChapterId, name: string): Project => ({ id, ch, name })

export const PROJECTS: Project[] = [
  P('T1', 'tech', 'URL shortener on AWS'), P('T2', 'tech', 'Distributed rate limiter'), P('T3', 'tech', 'Your own MCP server'),
  P('T4', 'tech', 'Ticket to merge request pipeline'), P('T5', 'tech', 'Ad event ingest at 10k events/s'), P('T6', 'tech', 'Observability and security pass'),
  P('P1', 'product', 'PRD for a real feature'), P('P2', 'product', 'Redesign one confusing screen'), P('P3', 'product', 'Landing, onboarding and pricing page'),
  P('P4', 'product', 'Adtech explainer'), P('P5', 'product', 'Measure and A/B test a feature'),
  P('M1', 'mgmt', 'Lead one feature end to end'), P('M2', 'mgmt', 'Mentor a teammate for 2 months'), P('M3', 'mgmt', 'RFC for a cross-team decision'), P('M4', 'mgmt', 'Run 3 team rituals'),
  P('B1', 'biz', 'Teardown of your company'), P('B2', 'biz', 'Validate a product idea'), P('B3', 'biz', 'Launch a small paid product'), P('B4', 'biz', 'Offline business case study'),
  P('E1', 'eng', 'Accent before and after'), P('E2', 'eng', '100 days of speaking'), P('E3', 'eng', 'Give a 10-minute talk'), P('E4', 'eng', '6 public posts in English'),
  P('F1', 'money', 'Personal finance dashboard'), P('F2', 'money', 'Raise or rate negotiation'), P('F3', 'money', 'Personal investment policy'), P('F4', 'money', 'First side income'),
]

export interface DailyItem {
  id: string
  ch: ChapterId
  title: string
  sub: string
  own?: boolean
}

export const DAILY: DailyItem[] = [
  { id: 'eng-listen', ch: 'eng', title: 'Listen for 7 minutes', sub: 'A podcast or video in English at 1× speed' },
  { id: 'eng-shadow', ch: 'eng', title: 'Shadow for 7 minutes', sub: 'Repeat 1 minute aloud right after the speaker, or follow Hadar: 15 Minute Morning Pronunciation Practice' },
  { id: 'eng-speak', ch: 'eng', title: 'Speak or write for 6 minutes', sub: 'Record your day, or write 5 sentences and check them' },
]

const DAY = 60 * 24
export const MILESTONES = [
  { mins: 20, label: '20 minutes', text: 'Heart rate and blood pressure drop' },
  { mins: 720, label: '12 hours', text: 'Carbon monoxide in your blood drops to normal' },
  { mins: DAY * 14, label: '2 weeks', text: 'Circulation improves and lung function increases (2–12 weeks)' },
  { mins: DAY * 30, label: '1 month', text: 'Coughing and shortness of breath start to decrease (1–9 months)' },
  { mins: DAY * 365, label: '1 year', text: "Coronary heart disease risk is about half a smoker's" },
  { mins: DAY * 365 * 5, label: '5 years', text: "Stroke risk falls toward a nonsmoker's (5–15 years)" },
  { mins: DAY * 365 * 10, label: '10 years', text: "Lung cancer risk falls to about half a smoker's" },
  { mins: DAY * 365 * 15, label: '15 years', text: "Coronary heart disease risk is a nonsmoker's" },
]

export const CRAVING_TIPS = [
  'Craving? Delay 10 minutes. It usually fades first.',
  'Breathe in for 4, out for 6, ten times.',
  'Drink a full glass of water, slowly.',
  'Walk, do push-ups or message a friend.',
  'Say "I don\'t smoke", not "I\'m trying to quit".',
]

export const LIST_META = {
  books: { name: 'Books', title: '100 books everyone should read', sub: 'Author' },
  films: { name: 'Films', title: '100 films everyone should watch', sub: 'Year' },
  songs: { name: 'Songs', title: '100 songs everyone should hear', sub: 'Artist' },
  places: { name: 'Places', title: '100 places everyone should visit', sub: 'Country' },
} as const

