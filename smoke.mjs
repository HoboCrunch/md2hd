// The one runnable check: the packaged CLI serves the app, the files, a 404,
// and refuses path traversal. Run with `npm test` after `npm run build`.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert'

const dir = mkdtempSync(join(tmpdir(), 'md2hd-'))
writeFileSync(join(dir, 'a.md'), '---\nid: a\ntype: note\ntitle: Alpha\n---\n\nLinks to [[b]].\n')
mkdirSync(join(dir, 'sub'))
writeFileSync(join(dir, 'sub', 'b.md'), '---\nid: b\ntype: note\ntitle: Beta\n---\n')

const exe = fileURLToPath(new URL('bin/md2hd.mjs', import.meta.url))
const child = spawn(process.execPath, [exe, dir, '--no-open', '--port', '0'], {
  stdio: ['ignore', 'pipe', 'inherit'],
})
const timer = setTimeout(() => {
  child.kill()
  console.error('smoke: timed out waiting for the server')
  process.exit(1)
}, 10_000)

let out = ''
child.stdout.on('data', (chunk) => {
  out += chunk
  const m = out.match(/http:\/\/localhost:(\d+)/)
  if (m) {
    child.stdout.removeAllListeners('data')
    void run(`http://localhost:${m[1]}`)
  }
})

async function run(base) {
  try {
    const map = await (await fetch(`${base}/__files.json`)).json()
    assert.equal(map.name, basename(dir))
    assert.equal(map.files.length, 2)
    assert.ok(map.files.every((f) => f.path.startsWith(`${basename(dir)}/`)))
    assert.ok(map.files.some((f) => f.text.includes('Alpha')))

    const app = await fetch(`${base}/app/`)
    assert.ok(app.ok, '/app/ serves')
    assert.ok((await app.text()).includes('md2hd'), '/app/ is the visualizer')

    assert.equal((await fetch(`${base}/definitely-not-here`)).status, 404)
    // %2f survives client-side URL normalization, so this reaches the server
    // as an escape attempt instead of being collapsed before it is sent.
    assert.equal((await fetch(`${base}/..%2f..%2fpackage.json`)).status, 403, 'traversal refused')

    console.log('smoke ok')
  } catch (err) {
    console.error('smoke failed:', err.message)
    process.exitCode = 1
  } finally {
    clearTimeout(timer)
    child.kill()
  }
}
