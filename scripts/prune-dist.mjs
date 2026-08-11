// Strip the marketing shell out of dist: keep /app and what that page reaches.
//
// The site build emits every public page; the CLI only ever serves /app/. Walk
// the asset graph from app/index.html — script/link tags, chunk imports, css
// urls, the root favicons and boot mark — and drop everything else.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const astroDir = join(dist, '_astro')
const astro = new Set(existsSync(astroDir) ? readdirSync(astroDir) : [])

const keep = new Set()
const queue = []
const add = (rel) => {
  if (!keep.has(rel)) {
    keep.add(rel)
    queue.push(rel)
  }
}
add('app/index.html')

// Root-level assets the page names outright (favicons, the boot mark).
const ROOT_REF = /(?:href|src)="\/([^"/][^"]*\.(?:svg|png|ico|webmanifest))"/g
// Any mention of a filename that exists in _astro is a dependency — covers
// <script src>, <link href>, import "./chunk-x.js", and css url(font.woff2).
const ASSET_NAME = /[A-Za-z0-9_.-]+\.(?:js|mjs|css|woff2?|svg|png|jpg|webp|avif)/g

while (queue.length) {
  const rel = queue.pop()
  const file = join(dist, rel)
  if (!existsSync(file) || !/\.(html|js|mjs|css)$/.test(rel)) continue
  const text = readFileSync(file, 'utf8')
  if (rel.endsWith('.html')) for (const m of text.matchAll(ROOT_REF)) add(m[1])
  for (const m of text.matchAll(ASSET_NAME)) if (astro.has(m[0])) add(`_astro/${m[0]}`)
}

const out = join(dist, '..', '.dist-pruned')
rmSync(out, { recursive: true, force: true })
let files = 0
for (const rel of keep) {
  const src = join(dist, rel)
  if (!existsSync(src)) continue
  mkdirSync(dirname(join(out, rel)), { recursive: true })
  cpSync(src, join(out, rel))
  files++
}
rmSync(dist, { recursive: true })
cpSync(out, dist, { recursive: true })
rmSync(out, { recursive: true })
console.log(`dist pruned to the app: ${files} files`)
