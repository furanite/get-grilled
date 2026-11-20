// Checks the Pi updater end to end against a stand-in for GitHub's releases on this computer.
// Run after `npm run build:pi`:  node e2e/pi-update.mjs
import http from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { makeManifest, newKeyPair, packBundle, signManifest, unpackBundle, safePath } from '../pi/bundle.mjs'

const results = []
async function test(name, fn) {
  try {
    await fn()
    results.push(true)
    console.log('PASS', name)
  } catch (e) {
    results.push(false)
    console.log('FAIL', name, '\n   ', String(e.message || e).split('\n').slice(0, 4).join('\n    '))
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m)
}

// The built game, as the release workflow packs it.
const base = {}
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) walk(p)
    else base[relative('.', p).split(sep).join('/')] = readFileSync(p)
  }
}
walk('site')
for (const f of ['pi/server.mjs', 'pi/update.mjs', 'pi/bundle.mjs', 'security-headers.mjs']) base[f] = readFileSync(f)

const key = newKeyPair()
const otherKey = newKeyPair()
/** A release whose version.json says `version`, built at `built`. */
function release(version, built, { signWith = key.privatePem, tamper = false, files = base } = {}) {
  const f = { ...files }
  const v = JSON.parse(f['site/version.json'].toString('utf8'))
  f['site/version.json'] = Buffer.from(JSON.stringify({ ...v, version, built }))
  let bundle = packBundle(f)
  const name = `gg-pi-${version}.ggpkg`
  const manifest = makeManifest({ version, built, commit: 'test', bundleName: name, bundle })
  // Same size, one byte changed: a size check alone can't catch it, only the signed hash
  if (tamper) (bundle = Buffer.from(bundle))[bundle.length >> 1] ^= 1
  return { tag: `pi-${version}`, files: { 'manifest.json': manifest, 'manifest.sig': Buffer.from(signManifest(manifest, signWith)), [name]: bundle } }
}

// Stand-in for api.github.com and its file store.
let published = []
let up = true
const gh = http.createServer((req, res) => {
  if (!up) return req.socket.destroy()
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/releases') {
    const list = published.map((r) => ({ tag_name: r.tag, draft: false, assets: Object.keys(r.files).map((n) => ({ name: n, browser_download_url: `http://127.0.0.1:${port}/dl/${r.tag}/${n}` })) }))
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify(list))
  }
  const [, , tag, name] = url.pathname.split('/')
  const f = published.find((r) => r.tag === tag)?.files[name]
  if (!f) return res.writeHead(404).end()
  res.writeHead(200, { 'content-length': f.length })
  res.end(f)
})
await new Promise((r) => gh.listen(0, '127.0.0.1', r))
const port = gh.address().port

const home = mkdtempSync(join(tmpdir(), 'gg-update-'))
const keyFile = join(home, 'release-key.pem')
writeFileSync(keyFile, key.publicPem)
const env = { ...process.env, GG_HOME: join(home, 'opt'), GG_KEY: keyFile, GG_RELEASES: `http://127.0.0.1:${port}/releases` }
mkdirSync(env.GG_HOME)
// Runs the updater as its own process (async, so the stand-in server above keeps answering).
const update = (...args) =>
  new Promise((done) => {
    const p = spawn(process.execPath, ['pi/update.mjs', ...args], { env })
    let out = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (out += d))
    p.on('close', (code) => done({ code, out: out.trim() }))
  })
const current = () => {
  try {
    return JSON.parse(readFileSync(join(env.GG_HOME, 'current', 'site', 'version.json'), 'utf8')).version
  } catch {
    return null
  }
}
const kept = () => readdirSync(join(env.GG_HOME, 'releases')).sort()

await test('bundles refuse unsafe paths and damaged contents', async () => {
  for (const p of ['../x', '/etc/passwd', 'a/../../b', 'a//b', 'a/', '', 'a\\b', 'site/%2e%2e/x']) assert(!safePath(p), `accepted ${p}`)
  for (const p of ['site/index.html', 'pi/server.mjs', 'site/packs/a-b_c.1.json']) assert(safePath(p), `refused ${p}`)
  let threw = false
  try {
    packBundle({ '../evil': Buffer.from('x') })
  } catch {
    threw = true
  }
  assert(threw, 'packed an unsafe path')
  const good = packBundle({ 'a.txt': Buffer.from('hi') })
  assert(unpackBundle(good)['a.txt'].toString() === 'hi', 'round trip failed')
})

await test('first start with no internet and nothing installed: says so and stops', async () => {
  up = false
  const r = await update()
  assert(r.code === 1 && /No internet/.test(r.out), r.out)
  up = true
})

await test('installs the newest signed release, and the server starts from it', async () => {
  published = [release('2026-11-18-aaa', '2026-11-18T08:00:00Z')]
  const r = await update()
  assert(r.code === 0 && /Installed 2026-11-18-aaa/.test(r.out), r.out)
  assert(current() === '2026-11-18-aaa', `current is ${current()}`)
  const state = join(home, 'state')
  const srv = spawn(process.execPath, [join(env.GG_HOME, 'current', 'pi', 'server.mjs')], { env: { ...process.env, GG_PORT: '4197', GG_STATE: state, GG_PIN: '123456' }, stdio: process.env.DEBUG ? 'inherit' : 'ignore' })
  try {
    let hello
    for (let i = 0; i < 40 && !hello; i++) {
      await new Promise((r) => setTimeout(r, 150))
      hello = await fetch('http://127.0.0.1:4197/api/hello').then((x) => x.json(), () => null)
    }
    assert(hello?.version === '2026-11-18-aaa', `server says ${JSON.stringify(hello)}`)
    const page = await fetch('http://127.0.0.1:4197/host/').then((x) => x.status)
    assert(page === 200, `host page ${page}`)
  } finally {
    srv.kill()
  }
})

await test('a release that is not newer is left alone', async () => {
  const r = await update()
  assert(r.code === 0 && /Up to date/.test(r.out), r.out)
})

await test('a release signed with another key is refused, and the Pi keeps its version', async () => {
  published = [release('2026-11-19-evil', '2026-11-19T08:00:00Z', { signWith: otherKey.privatePem })]
  const r = await update()
  assert(/Signature check failed/.test(r.out), r.out)
  assert(current() === '2026-11-18-aaa', `current is ${current()}`)
})

await test('a bundle changed after signing is refused', async () => {
  published = [release('2026-11-19-bbb', '2026-11-19T08:00:00Z', { tamper: true })]
  const r = await update()
  assert(/does not match/.test(r.out), r.out)
  assert(current() === '2026-11-18-aaa', `current is ${current()}`)
})

await test('a signed bundle whose files differ from its own list is refused', async () => {
  const files = { ...base, 'site/index.html': Buffer.from('<h1>swapped</h1>') }
  published = [release('2026-11-19-ccc', '2026-11-19T08:00:00Z', { files })]
  const r = await update()
  assert(/does not match version.json/.test(r.out), r.out)
  assert(current() === '2026-11-18-aaa', `current is ${current()}`)
})

await test('a newer good release installs; the last two versions are kept', async () => {
  published = [release('2026-11-20-ddd', '2026-11-20T08:00:00Z'), release('2026-11-19-ccc', '2026-11-19T08:00:00Z')]
  assert((await update()).code === 0, 'update failed')
  assert(current() === '2026-11-20-ddd', `current is ${current()}`)
  published = [release('2026-11-21-eee', '2026-11-21T08:00:00Z')]
  assert((await update()).code === 0, 'update failed')
  assert(current() === '2026-11-21-eee', `current is ${current()}`)
  assert(JSON.stringify(kept()) === JSON.stringify(['2026-11-20-ddd', '2026-11-21-eee']), `kept ${kept()}`)
  assert(readlinkSync(join(env.GG_HOME, 'previous')) === join('releases', '2026-11-20-ddd'), 'previous link wrong')
})

await test('offline at start-up: keeps the last version and still starts (exit 0)', async () => {
  up = false
  const r = await update()
  assert(r.code === 0 && /No internet/.test(r.out) && /Keeping 2026-11-21-eee/.test(r.out), r.out)
  up = true
})

await test('an old signed release cannot be replayed to go backwards', async () => {
  published = [release('2026-11-18-aaa', '2026-11-18T08:00:00Z')]
  const r = await update()
  assert(/Up to date/.test(r.out) && current() === '2026-11-21-eee', r.out)
})

await test('"use previous" goes back and forth without the internet', async () => {
  up = false
  assert((await update('--use-previous')).code === 0, 'use-previous failed')
  assert(current() === '2026-11-20-ddd', `current is ${current()}`)
  assert((await update('--use-previous')).code === 0, 'use-previous failed')
  assert(current() === '2026-11-21-eee', `current is ${current()}`)
  up = true
})

await test('after "use previous" the next start-up stays on it, until "--resume"', async () => {
  published = [release('2026-11-21-eee', '2026-11-21T08:00:00Z')]
  assert((await update('--use-previous')).code === 0, 'use-previous failed')
  assert(current() === '2026-11-20-ddd', `current is ${current()}`)
  let r = await update()
  assert(r.code === 0 && /Staying on 2026-11-20-ddd/.test(r.out) && current() === '2026-11-20-ddd', r.out)
  assert(/paused/.test((await update('--status')).out), 'status does not say updates are paused')
  assert((await update('--resume')).code === 0, 'resume failed')
  r = await update()
  assert(r.code === 0 && current() === '2026-11-21-eee', r.out)
})

await test('installing from a USB folder checks the same signature', async () => {
  const dir = join(home, 'usb')
  mkdirSync(dir)
  const good = release('2026-11-22-fff', '2026-11-22T08:00:00Z')
  for (const [n, b] of Object.entries(good.files)) writeFileSync(join(dir, n), b)
  writeFileSync(join(dir, 'manifest.sig'), signManifest(good.files['manifest.json'], otherKey.privatePem))
  assert((await update('--file', dir)).code === 1 && current() === '2026-11-21-eee', 'accepted a wrongly signed folder')
  writeFileSync(join(dir, 'manifest.sig'), good.files['manifest.sig'])
  assert((await update('--file', dir)).code === 0 && current() === '2026-11-22-fff', `current is ${current()}`)
  assert(!existsSync(join(env.GG_HOME, 'releases', '2026-11-20-ddd')), 'did not prune')
})

gh.close()
if (process.env.DEBUG) console.log('kept', home)
else rmSync(home, { recursive: true, force: true })
const ok = results.filter(Boolean).length
console.log(`\n${ok}/${results.length} updater tests passed`)
process.exit(ok === results.length ? 0 : 1)
