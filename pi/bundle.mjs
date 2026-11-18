// Signed update bundles for the Raspberry Pi.
//
// A release is three files:
//   gg-pi-<version>.ggpkg   every file of the game, gzipped (a small format of our own, so nothing
//                           ever unpacks outside its folder: no links, no absolute paths, no "..")
//   manifest.json           the version, when it was built, and the bundle's size and SHA-256
//   manifest.sig            an Ed25519 signature over manifest.json, made in GitHub Actions with the
//                           private key that only the repository's secrets hold
//
// The Pi checks the signature with the public key installed on it at set-up, then the bundle's
// SHA-256 against the manifest, then every file against the site's version.json. A download that
// fails any check is thrown away and the Pi keeps the version it has.
import { createHash, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { gunzipSync, gzipSync } from 'node:zlib'

export const FORMAT = 1
/** Largest bundle the Pi will accept (the game is about 20 MB). */
export const MAX_BUNDLE = 200 * 1024 * 1024
const MAGIC = Buffer.from('GGPKG1\n')

/** A path inside a release: plain letters, digits, dot, dash, underscore and slashes, no "..", not absolute. */
export function safePath(p) {
  if (typeof p !== 'string' || !p || p.length > 300) return false
  if (!/^[A-Za-z0-9._\-/]+$/.test(p)) return false
  if (p.startsWith('/') || p.endsWith('/') || p.includes('//')) return false
  return p.split('/').every((part) => part !== '.' && part !== '..' && part !== '')
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

/**
 * Packs { path: Buffer } into one gzipped buffer.
 * Layout: MAGIC, then a JSON index line [[path, size], ...], then every file's bytes in index order.
 */
export function packBundle(files) {
  const paths = Object.keys(files).sort()
  for (const p of paths) if (!safePath(p)) throw new Error(`Unsafe path in bundle: ${p}`)
  const index = Buffer.from(JSON.stringify(paths.map((p) => [p, files[p].length])) + '\n')
  return gzipSync(Buffer.concat([MAGIC, index, ...paths.map((p) => files[p])]), { level: 9 })
}

/** Unpacks a bundle made by packBundle. Throws on anything unexpected. */
export function unpackBundle(gz) {
  const raw = gunzipSync(gz, { maxOutputLength: MAX_BUNDLE * 2 })
  if (!raw.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not a Munaafasatul Ilm bundle')
  const nl = raw.indexOf(10, MAGIC.length)
  if (nl < 0) throw new Error('Bundle index missing')
  const index = JSON.parse(raw.subarray(MAGIC.length, nl).toString('utf8'))
  if (!Array.isArray(index)) throw new Error('Bundle index is not a list')
  const out = {}
  let at = nl + 1
  for (const entry of index) {
    const [p, size] = Array.isArray(entry) ? entry : []
    if (!safePath(p) || !Number.isInteger(size) || size < 0) throw new Error(`Bad entry in bundle: ${String(p)}`)
    if (Object.hasOwn(out, p)) throw new Error(`File twice in bundle: ${p}`)
    if (at + size > raw.length) throw new Error('Bundle is cut short')
    out[p] = raw.subarray(at, at + size)
    at += size
  }
  if (at !== raw.length) throw new Error('Extra bytes after the last file')
  return out
}

/** Makes the manifest for a bundle. `built` is an ISO time; newer builds win. */
export function makeManifest({ version, built, commit, bundleName, bundle }) {
  return Buffer.from(
    JSON.stringify({ format: FORMAT, app: 'ilm-munaafasah-pi', version, built, commit, bundle: { name: bundleName, size: bundle.length, sha256: sha256(bundle) } }, null, 1) + '\n',
  )
}

export const signManifest = (manifest, privateKeyPem) => sign(null, manifest, privateKeyPem).toString('base64') + '\n'

/** Checks the signature and returns the parsed manifest, or throws. */
export function openManifest(manifest, sigText, publicKeyPem) {
  const key = createPublicKey(publicKeyPem)
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('The update key must be an Ed25519 key')
  const sig = Buffer.from(String(sigText).trim(), 'base64')
  if (sig.length !== 64 || !verify(null, manifest, key, sig)) throw new Error('Signature check failed: this update was not made by the game’s release process')
  const m = JSON.parse(manifest.toString('utf8'))
  if (m.format !== FORMAT || m.app !== 'ilm-munaafasah-pi') throw new Error('Manifest is for something else')
  if (typeof m.version !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(m.version)) throw new Error('Bad version name')
  if (typeof m.built !== 'string' || Number.isNaN(Date.parse(m.built))) throw new Error('Bad build time')
  const b = m.bundle
  if (!b || typeof b.name !== 'string' || !/^[A-Za-z0-9._-]+\.ggpkg$/.test(b.name) || !Number.isInteger(b.size) || b.size <= 0 || b.size > MAX_BUNDLE || !/^[0-9a-f]{64}$/.test(b.sha256))
    throw new Error('Bad bundle details in manifest')
  return m
}

/** Checks the bundle against the manifest and the site's own list of file hashes; returns the files. */
export function checkBundle(bundle, m) {
  if (bundle.length !== m.bundle.size) throw new Error('Bundle size does not match the manifest')
  if (sha256(bundle) !== m.bundle.sha256) throw new Error('Bundle does not match the manifest (changed after signing?)')
  const files = unpackBundle(bundle)
  for (const need of ['site/index.html', 'site/version.json', 'pi/server.mjs', 'pi/update.mjs', 'pi/bundle.mjs', 'security-headers.mjs'])
    if (!files[need]) throw new Error(`Bundle is missing ${need}`)
  const v = JSON.parse(files['site/version.json'].toString('utf8'))
  for (const [p, h] of Object.entries(v.files ?? {})) {
    const f = files[`site/${p}`]
    if (!f || sha256(f) !== h) throw new Error(`site/${p} does not match version.json`)
  }
  return files
}

/** A new Ed25519 key pair as PEM text. */
export function newKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return { publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(), privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() }
}
