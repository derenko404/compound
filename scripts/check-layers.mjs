/**
 * Enforces Feature-Sliced Design's import rules in src/ (run by `npm run lint`):
 * - layers only import from layers below them: core < shared < entities < features < widgets < pages < app;
 * - a slice never imports another slice of the same layer (pages/today can't import pages/topics);
 * - from another slice, import its public API (`@/entities/topic`), not a file inside it;
 * - adapters (storage, AI, HTTP clients) are wired in shared/api and app only;
 * - entities of the same layer may share through FSD's cross-import, `@/entities/topic/@x/note` (topic's API for note).
 * A line that must break a rule ends with `// layers-ok` and says why.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const LAYERS = ['core', 'adapters', 'shared', 'entities', 'features', 'widgets', 'pages', 'app']
const SLICED = new Set(['entities', 'features', 'widgets', 'pages'])

// Where a file sits: its layer and (for sliced layers) its slice.
const place = (file) => {
  const [layer, slice] = relative(join(ROOT, 'src'), file).split('/')
  return { layer, slice: SLICED.has(layer) ? slice : null }
}

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.tsx?$/.test(name)) files.push(path)
  }
}
walk(join(ROOT, 'src'))

const problems = []
for (const file of files) {
  const from = place(file)
  if (!LAYERS.includes(from.layer)) continue
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('layers-ok')) return
    for (const m of line.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)) {
      const spec = m[1]
      const target = spec.startsWith('@/') ? join(ROOT, 'src', spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(file), spec) : null
      if (!target) continue
      const to = place(target)
      if (!LAYERS.includes(to.layer)) continue
      const where = `${relative(ROOT, file)}:${i + 1}`
      // FSD cross-import: a slice may use what another slice of its layer exposes for it in @x/<slice>.
      if (to.layer === from.layer && from.slice && relative(join(ROOT, 'src', to.layer, to.slice), target) === join('@x', from.slice)) continue
      const below = LAYERS.indexOf(to.layer) < LAYERS.indexOf(from.layer)
      const same = to.layer === from.layer && (!SLICED.has(to.layer) || to.slice === from.slice)
      if (to.layer === 'adapters' && !['adapters', 'app'].includes(from.layer) && !(from.layer === 'shared' && relative(join(ROOT, 'src/shared'), file).startsWith('api/')))
        problems.push(`${where}  ${from.layer} uses an adapter (${spec}): go through shared/api`)
      else if (!below && !same) problems.push(`${where}  ${from.layer}${from.slice ? `/${from.slice}` : ''} imports ${to.layer}${to.slice ? `/${to.slice}` : ''} (${spec})`)
      else if (below && SLICED.has(to.layer) && relative(join(ROOT, 'src', to.layer, to.slice), target).length)
        problems.push(`${where}  import ${to.layer}/${to.slice} through its public API (@/${to.layer}/${to.slice}), not ${spec}`)
    }
  })
}

if (problems.length) {
  console.error(`Layer rules broken (${problems.length}):\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}
console.log('layers: imports follow shared → entities → features → widgets → pages → app.')
