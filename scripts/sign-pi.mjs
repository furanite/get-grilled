// Signs a packed Raspberry Pi release (made by scripts/pack-pi.mjs) with the PI_SIGNING_KEY secret.
// Runs in its own CI job with no npm packages installed: it uses only Node's built-in modules and
// pi/bundle.mjs, so nothing third-party ever runs next to the key.
// Before signing it checks that the bundle matches the manifest and unpacks cleanly.
// Run: node scripts/sign-pi.mjs <release folder>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkBundle, signManifest } from '../pi/bundle.mjs'

const dir = process.argv[2] || 'release'
const key = process.env.PI_SIGNING_KEY || ''
const manifestBuf = readFileSync(join(dir, 'manifest.json'))
const m = JSON.parse(manifestBuf.toString('utf8'))
const names = readdirSync(dir).filter((n) => n.endsWith('.ggpkg'))
if (names.length !== 1 || names[0] !== m.bundle?.name) throw new Error(`Expected exactly ${m.bundle?.name} in ${dir}, found ${names.join(', ') || 'nothing'}`)
// Throws if the size, SHA-256, required files or any file hash don't match.
checkBundle(readFileSync(join(dir, names[0])), m)
if (!key.trim()) {
  console.log(`Checked ${m.version}; no PI_SIGNING_KEY, so it is not signed.`)
} else {
  writeFileSync(join(dir, 'manifest.sig'), signManifest(manifestBuf, key))
  console.log(`Checked and signed ${m.version}.`)
}
