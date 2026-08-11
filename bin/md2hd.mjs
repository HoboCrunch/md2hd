#!/usr/bin/env node
/**
 * md2hd — open a markdown map in the local visualizer.
 *
 * Serves the prebuilt app from ../dist and answers /__files.json with the
 * markdown it was pointed at, so the app boots straight into the map. Files
 * are re-read on every request: edit, refresh the tab, see the change.
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join, resolve, sep } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const usage = 'usage: md2hd <file.md | folder> ... [--port N] [--no-open]'

const args = process.argv.slice(2)
const noOpen = args.includes('--no-open')
const portAt = args.indexOf('--port')
const port = portAt === -1 ? 4173 : Number(args[portAt + 1])
const inputs = args.filter((a, i) => !a.startsWith('--') && (portAt === -1 || i !== portAt + 1))

if (!inputs.length) die(usage)
if (!Number.isInteger(port) || port < 0 || port > 65535) die(`--port needs a number\n${usage}`)

// Matches what the app's own folder import accepts.
const MD = /\.(md|markdown|txt)$/i

function collect() {
  const files = []
  for (const input of inputs) {
    const full = resolve(input)
    if (!existsSync(full)) throw new Error(`no such file or folder: ${input}`)
    if (statSync(full).isDirectory()) walk(full, basename(full), files)
    else files.push({ path: basename(full), text: readFileSync(full, 'utf8') })
  }
  return files
}

// Paths keep the folder-name prefix, mirroring the browser's folder import.
function walk(dir, prefix, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}/${entry.name}`, out)
    else if (MD.test(entry.name))
      out.push({ path: `${prefix}/${entry.name}`, text: readFileSync(join(dir, entry.name), 'utf8') })
  }
}

let boot
try {
  boot = collect()
} catch (err) {
  die(`md2hd: ${err.message}`)
}
if (!boot.length) die(`md2hd: no markdown files in ${inputs.join(', ')}`)

const firstInput = resolve(inputs[0])
const name = statSync(firstInput).isDirectory()
  ? basename(firstInput)
  : basename(firstInput).replace(/\.\w+$/, '')

const appDir = fileURLToPath(new URL('../dist', import.meta.url))
if (!existsSync(join(appDir, 'app', 'index.html')))
  die('md2hd: the bundled app is missing — reinstall md2hd (or run `npm run build` in a dev checkout)')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

const server = createServer((req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)

    if (path === '/__files.json') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ name, files: collect() }))
      return
    }

    if (path === '/') {
      res.writeHead(302, { location: '/app/' })
      res.end()
      return
    }

    let file = resolve(join(appDir, path))
    if (file !== appDir && !file.startsWith(appDir + sep)) {
      res.writeHead(403)
      res.end()
      return
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) {
      const fallback = join(appDir, '404.html')
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
      res.end(existsSync(fallback) ? readFileSync(fallback) : 'not found')
      return
    }
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream' })
    res.end(readFileSync(file))
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`md2hd: ${err.message}`)
  }
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') server.listen(0, '127.0.0.1')
  else die(`md2hd: ${err.message}`)
})

// 127.0.0.1 only — these are your notes; nothing is offered to the network.
server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${server.address().port}/app/`
  console.log(`md2hd · ${boot.length} file${boot.length === 1 ? '' : 's'} from ${inputs.join(', ')}`)
  console.log(`${url}  — edit your markdown, refresh the tab. ctrl-c stops.`)
  if (!noOpen) openBrowser(url)
})

function openBrowser(url) {
  const [cmd, cargs] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]
  spawn(cmd, cargs, { stdio: 'ignore', detached: true }).unref()
}

function die(msg) {
  console.error(msg)
  process.exit(1)
}
