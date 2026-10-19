/**
 * Comment style (run by `npm run lint`): a comment over more than one line is a JSDoc block, `/** … *\/`, and a
 * single-line comment stays `//`. Tool directives (oxlint, @ts-, i18n-ok, layers-ok) are line comments and don't count.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

// Tracked and new files, minus ones deleted but not yet staged.
const files = execSync("git ls-files -co --exclude-standard 'src/**/*.ts' 'src/**/*.tsx' 'core/**/*.ts' 'adapters/**/*.ts' 'worker/**/*.ts' 'scripts/**/*.mjs'", { encoding: 'utf8' })
  .trim().split('\n').filter((f) => f && existsSync(f))
const directive = /^\/\/\s*(oxlint|eslint|@ts-|i18n-ok|layers-ok|\/)/
const comment = (line) => line.match(/^(\s*)\/\/(?! ?(oxlint|eslint|@ts-|i18n-ok|layers-ok|\/))/)?.[1]

const problems = []
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    const a = comment(lines[i])
    if (a === undefined || directive.test(lines[i].trim())) continue
    if (comment(lines[i + 1]) === a && (i === 0 || comment(lines[i - 1]) !== a)) problems.push(`${file}:${i + 1}`)
  }
}

if (problems.length) {
  console.error(`Comments over more than one line should be /** … */ blocks:\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}
console.log('comments: multi-line comments are JSDoc blocks.')
