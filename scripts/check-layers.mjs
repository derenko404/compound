/**
 * Enforces the app's Feature-Sliced Design (the lighter variant) in src/, run by `npm run lint`:
 * - layers only import from layers below them: core < adapters < shared < features < pages < app (core and
 *   adapters live next to src/ and are imported as @core/… and @adapters/…);
 * - a page never imports another page;
 * - from another slice, import its public API (`@/features/topics`), not a file inside it. Features may use
 *   each other this way;
 * - adapters (storage, AI, HTTP clients) are wired in shared/api and app only.
 * A line that must break a rule ends with `// layers-ok` and says why.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const LAYERS = ['core', 'adapters', 'shared', 'features', 'pages', 'app']
const SLICED = new Set(['features', 'pages'])

// Where a file sits: its layer and (for sliced layers) its slice. core/ and adapters/ live next to src/.
const place = (file) => {
  const parts = relative(ROOT, file).split('/')
  const [layer, slice] = parts[0] === 'src' ? parts.slice(1) : parts
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
for (const dir of ['src', 'core', 'adapters']) walk(join(ROOT, dir))

const problems = []
for (const file of files) {
  const from = place(file)
  if (!LAYERS.includes(from.layer)) continue
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('layers-ok')) return
    for (const m of line.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)) {
      const spec = m[1]
      const target = spec.startsWith('@/') ? join(ROOT, 'src', spec.slice(2))
        : /^@(core|adapters)\//.test(spec) ? join(ROOT, spec.slice(1))
          : spec.startsWith('.') ? resolve(dirname(file), spec) : null
      if (!target) continue
      const to = place(target)
      if (!LAYERS.includes(to.layer)) continue
      const where = `${relative(ROOT, file)}:${i + 1}`
      const sameSlice = to.layer === from.layer && (!SLICED.has(to.layer) || to.slice === from.slice)
      const below = LAYERS.indexOf(to.layer) < LAYERS.indexOf(from.layer)
      const otherFeature = from.layer === 'features' && to.layer === 'features' && !sameSlice
      const deep = SLICED.has(to.layer) && !sameSlice && relative(join(ROOT, 'src', to.layer, to.slice), target).length > 0
      if (to.layer === 'adapters' && !['adapters', 'app'].includes(from.layer) && !(from.layer === 'shared' && relative(join(ROOT, 'src/shared'), file).startsWith('api/')))
        problems.push(`${where}  ${from.layer} uses an adapter (${spec}): go through shared/api`)
      else if (!below && !sameSlice && !otherFeature)
        problems.push(`${where}  ${from.layer}${from.slice ? `/${from.slice}` : ''} imports ${to.layer}${to.slice ? `/${to.slice}` : ''} (${spec})`)
      else if (deep) problems.push(`${where}  import ${to.layer}/${to.slice} through its public API (@/${to.layer}/${to.slice}), not ${spec}`)
    }
  })
}

if (problems.length) {
  console.error(`Layer rules broken (${problems.length}):\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}
console.log('layers: imports follow shared → features → pages → app.')
