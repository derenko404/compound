/**
 * Hover styles (run by `npm run lint`): every `:hover` rule in the app's CSS sits inside `@media (hover: hover)`.
 * Touch screens keep a tapped element in its hover state, so ungated hover rules stay stuck on phones.
 * Tailwind's `hover:` classes are gated already.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

// Tracked and new files, minus ones deleted but not yet staged.
const files = execSync("git ls-files -co --exclude-standard 'src/**/*.css'", { encoding: 'utf8' }).trim().split('\n').filter((f) => f && existsSync(f))
const gate = /^@media[^{]*\(\s*hover\s*:\s*hover\s*\)/

const problems = []
for (const file of files) {
  // Blank out comments, keeping newlines so line numbers stay right.
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
  const stack = []
  let start = 0
  let line = 1
  let preludeLine = 1
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '\n') line++
    else if (ch === '{') {
      const prelude = css.slice(start, i).trim()
      if (prelude.includes(':hover') && !stack.some((p) => gate.test(p))) problems.push(`${file}:${preludeLine}  ${prelude.replace(/\s+/g, ' ')}`)
      stack.push(prelude)
      start = i + 1
    } else if (ch === '}') {
      stack.pop()
      start = i + 1
    } else if (ch === ';') start = i + 1
    if (/\S/.test(ch) && !css.slice(start, i).trim()) preludeLine = line
  }
}

if (problems.length) {
  console.error(`Hover styles belong inside @media (hover: hover), or they stick on touch screens:\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}
console.log('hover: every :hover rule is gated by @media (hover: hover).')
