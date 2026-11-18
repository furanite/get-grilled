#!/usr/bin/env node
// Keeps the Raspberry Pi's copy of Munaafasatul Ilm up to date.
//
//   node pi/update.mjs                 check GitHub for a newer signed release and install it (runs at every start-up)
//   node pi/update.mjs --file <dir>    install a release from a folder (a USB stick) holding manifest.json, manifest.sig and the .ggpkg
//   node pi/update.mjs --use-previous  go back to the version before this one (and stay on it: start-up checks
//                                      are paused until "--resume", so the newer version isn't put straight back)
//   node pi/update.mjs --resume        start checking for updates again after --use-previous
//   node pi/update.mjs --status        show which versions are installed
//   node pi/update.mjs --new-key       make a signing key pair: saves the public key on this Pi, prints the private key once
//
// Nothing is installed unless its signature checks out against the public key saved at set-up, its
// SHA-256 matches, and every file matches the site's own list. Only newer builds are installed, so an
// old release can't be replayed. With no internet the Pi keeps the version it has. The two latest
// versions are kept on the card, so "--use-previous" works offline too.
//
// Settings (environment): GG_HOME (default /opt/ilm), GG_KEY (default /etc/ilm/release-key.pem),
// GG_REPO (default furanite/ilm-munaafasah), GG_RELEASES (the releases API address, for tests).
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { MAX_BUNDLE, checkBundle, newKeyPair, openManifest } from './bundle.mjs'

const HOME = process.env.GG_HOME || '/opt/ilm'
const KEY = process.env.GG_KEY || '/etc/ilm/release-key.pem'
const REPO = process.env.GG_REPO || 'furanite/ilm-munaafasah'
const RELEASES = process.env.GG_RELEASES || `https://api.github.com/repos/${REPO}/releases?per_page=15`
const REL_DIR = join(HOME, 'releases')
// Present after --use-previous: start-up checks leave the chosen version alone until --resume.
const HOLD = join(HOME, 'hold')
const log = (...a) => console.log('[update]', ...a)

const linkTarget = (name) => {
  try {
    return readlinkSync(join(HOME, name))
  } catch {
    return null
  }
}
const versionAt = (rel) => {
  try {
    return JSON.parse(readFileSync(join(HOME, rel, 'site', 'version.json'), 'utf8'))
  } catch {
    return null
  }
}
/** Points HOME/<name> at <target> in one step (a new link renamed over the old one). */
function pointLink(name, target) {
  const tmp = join(HOME, `.${name}.${randomBytes(4).toString('hex')}`)
  symlinkSync(target, tmp)
  renameSync(tmp, join(HOME, name))
}

/** Downloads up to `max` bytes, with a time limit; follows GitHub's redirect to its file store. */
async function download(url, max, accept = 'application/octet-stream', ms = 120000) {
  const res = await fetch(url, { headers: { accept, 'user-agent': 'ilm-munaafasah-pi-updater' }, redirect: 'follow', signal: AbortSignal.timeout(ms) })
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`)
  const len = Number(res.headers.get('content-length') || 0)
  if (len > max) throw new Error('Download is larger than allowed')
  const parts = []
  let got = 0
  for await (const chunk of res.body) {
    got += chunk.length
    if (got > max) throw new Error('Download is larger than allowed')
    parts.push(Buffer.from(chunk))
  }
  return Buffer.concat(parts)
}

function readKey() {
  if (!existsSync(KEY)) throw new Error(`No update key at ${KEY}. Run set-up again, or "--new-key".`)
  return readFileSync(KEY, 'utf8')
}

/** Checks and installs one release. Returns true if it is now the running version. */
function install(manifestBuf, sigText, getBundle) {
  const m = openManifest(manifestBuf, sigText, readKey())
  const now = versionAt('current')
  if (now && Date.parse(m.built) <= Date.parse(now.built)) {
    log(`Up to date: ${now.version}${m.version !== now.version ? ` (newest release ${m.version} is not newer)` : ''}`)
    return false
  }
  return getBundle(m).then((bundle) => {
    const files = checkBundle(bundle, m)
    mkdirSync(REL_DIR, { recursive: true })
    const dest = join(REL_DIR, m.version)
    if (linkTarget('current') === join('releases', m.version)) throw new Error(`${m.version} is already the running version`)
    const tmp = join(REL_DIR, `.incoming-${randomBytes(4).toString('hex')}`)
    for (const [p, data] of Object.entries(files)) {
      const f = join(tmp, p)
      mkdirSync(dirname(f), { recursive: true, mode: 0o755 })
      writeFileSync(f, data, { mode: 0o644 })
    }
    rmSync(dest, { recursive: true, force: true })
    renameSync(tmp, dest)
    const was = linkTarget('current')
    if (was && was !== join('releases', m.version)) pointLink('previous', was)
    pointLink('current', join('releases', m.version))
    prune()
    log(`Installed ${m.version}${now ? ` (was ${now.version})` : ''}`)
    return true
  })
}

/** Keeps only the current and previous versions (and clears half-finished downloads). */
function prune() {
  const keep = new Set([linkTarget('current'), linkTarget('previous')].filter(Boolean).map((t) => t.split('/').pop()))
  for (const name of readdirSync(REL_DIR)) if (!keep.has(name)) rmSync(join(REL_DIR, name), { recursive: true, force: true })
}

async function fromGitHub() {
  if (existsSync(HOLD)) return log(`Staying on ${versionAt('current')?.version ?? 'this version'} (chosen with use-previous). Run "update" to get the newest again.`)
  const list = JSON.parse((await download(RELEASES, 2_000_000, 'application/vnd.github+json', 20000)).toString('utf8'))
  const rel = (Array.isArray(list) ? list : []).find((r) => !r.draft && /^pi-/.test(r.tag_name ?? '') && r.assets?.some((a) => a.name === 'manifest.sig'))
  if (!rel) return log('No Pi release published yet; keeping this version.')
  const asset = (name) => rel.assets.find((a) => a.name === name)?.browser_download_url
  const manifest = await download(asset('manifest.json'), 64 * 1024, undefined, 20000)
  const sig = (await download(asset('manifest.sig'), 1024, undefined, 20000)).toString('utf8')
  await install(manifest, sig, (m) => {
    const url = asset(m.bundle.name)
    if (!url) throw new Error('Release has no bundle file')
    log(`Downloading ${m.version} (${(m.bundle.size / 1e6).toFixed(1)} MB)…`)
    return download(url, Math.min(MAX_BUNDLE, m.bundle.size))
  })
}

async function fromFolder(dir) {
  const name = readdirSync(dir).find((n) => n.endsWith('.ggpkg'))
  if (!name) throw new Error(`No .ggpkg file in ${dir}`)
  await install(readFileSync(join(dir, 'manifest.json')), readFileSync(join(dir, 'manifest.sig'), 'utf8'), async (m) => {
    if (m.bundle.name !== name) throw new Error(`Folder holds ${name}, but the manifest names ${m.bundle.name}`)
    return readFileSync(join(dir, name))
  })
}

function usePrevious() {
  const cur = linkTarget('current')
  const prev = linkTarget('previous')
  if (!prev || !versionAt('previous')) throw new Error('There is no previous version on this Pi.')
  pointLink('current', prev)
  if (cur) pointLink('previous', cur)
  writeFileSync(HOLD, `${new Date().toISOString()}\n`)
  log(`Now using ${versionAt('current')?.version}. Restart the game (or the Pi) to load it.`)
}

function status() {
  for (const name of ['current', 'previous']) {
    const v = versionAt(name)
    log(`${name}: ${v ? `${v.version} (built ${v.built})` : 'none'}`)
  }
  if (existsSync(HOLD)) log('Updates at start-up are paused (use-previous). "update" starts them again.')
}

function newKey() {
  if (existsSync(KEY) && !process.argv.includes('--replace')) throw new Error(`${KEY} already exists. Add --replace to make a new one (then update the GitHub secret too).`)
  const { publicPem, privatePem } = newKeyPair()
  mkdirSync(dirname(KEY), { recursive: true })
  writeFileSync(KEY, publicPem, { mode: 0o644 })
  chmodSync(KEY, 0o644)
  console.log(`Saved the public key to ${KEY}.

Now copy EVERYTHING between the lines below, including the BEGIN and END lines, into a GitHub
secret named PI_SIGNING_KEY (repository Settings > Secrets and variables > Actions > New repository
secret). It is shown only this once and is not saved on this Pi. Anyone holding it could sign
updates, so do not paste it anywhere else.
------------------------------------------------------------------------
${privatePem.trim()}
------------------------------------------------------------------------`)
}

const arg = process.argv[2]
try {
  if (arg === '--status') status()
  else if (arg === '--use-previous') usePrevious()
  else if (arg === '--resume') rmSync(HOLD, { force: true })
  else if (arg === '--new-key') newKey()
  else if (arg === '--file') {
    rmSync(HOLD, { force: true })
    await fromFolder(process.argv[3] || '.')
  }
  else if (!arg) await fromGitHub()
  else throw new Error(`Unknown option ${arg}`)
} catch (e) {
  const msg = e?.name === 'TimeoutError' || /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ENETUNREACH/.test(String(e?.message) + String(e?.cause?.code)) ? 'No internet connection' : String(e?.message || e)
  log(`${msg}. Keeping ${versionAt('current')?.version ?? 'nothing (no version installed yet)'}.`)
  // At start-up the game must still start, so a failed check is not an error; by hand it is.
  process.exitCode = arg ? 1 : versionAt('current') ? 0 : 1
}
