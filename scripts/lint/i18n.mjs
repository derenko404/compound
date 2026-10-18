/**
 * Fails when user-facing text is written straight into a component instead of coming from the dictionaries
 * (src/shared/i18n). oxlint's react/jsx-no-literals catches text between tags; this catches what it can't target alone:
 * string literals in user-facing props (aria-label, title, placeholder, label…) and in toast()/fail() calls.
 * Run by `npm run lint`. A line that must keep its literal can end with `// i18n-ok`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../..', import.meta.url).pathname
const SKIP = ['src/shared/ui/primitives', 'src/shared/i18n']
const PROPS = ['aria-label', 'title', 'placeholder', 'label', 'alt', 'lead', 'sub', 'description', 'hint', 'empty', 'confirm', 'submit', 'aside', 'done', 'note', 'data-tip']
// A word of two or more letters, in any script: punctuation and symbols alone are fine.
const WORDY = /\p{L}{2,}/u
// URLs and the brand name are the same in every language.
const SAME = /^(https?:\/\/\S*|Compound)$/
const prop = new RegExp(`\\s(${PROPS.join('|')})=(?:"([^"]*)"|\\{'([^']*)'\\}|\\{"([^"]*)"\\}|\\{\`([^\`$]*)\`\\})`, 'g')
const call = /\b(toast(?:\.error)?|fail)\(\s*(['"`])((?:(?!\2).)*)\2/g

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const rel = relative(ROOT, path)
    if (SKIP.some((s) => rel.startsWith(s))) continue
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.tsx?$/.test(name)) files.push(path)
  }
}
walk(join(ROOT, 'src'))

const problems = []
for (const file of files) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('i18n-ok') || /^\s*(\/\/|\*)/.test(line)) return
    for (const m of line.matchAll(prop)) {
      const text = m[2] ?? m[3] ?? m[4] ?? m[5] ?? ''
      if (WORDY.test(text) && !SAME.test(text)) problems.push(`${relative(ROOT, file)}:${i + 1}  ${m[1]}="${text}"`)
    }
    for (const m of line.matchAll(call)) {
      if (WORDY.test(m[3])) problems.push(`${relative(ROOT, file)}:${i + 1}  ${m[1]}('${m[3]}')`)
    }
  })
}

if (problems.length) {
  console.error(`Text that should come from src/shared/i18n (t.…):\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}

console.log('i18n: no raw text in props or toasts.')
