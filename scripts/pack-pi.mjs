// Packs the Raspberry Pi release after `npm run build:pi`:
//   release/gg-pi-<version>.ggpkg, release/manifest.json and, when a signing key is given, release/manifest.sig
// The key comes from the PI_SIGNING_KEY environment variable (a GitHub Actions secret) or --key <file>.
// Run: node scripts/pack-pi.mjs [--out release] [--key private.pem]
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { makeManifest, packBundle, signManifest } from '../pi/bundle.mjs'

const arg = (name) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}
const out = arg('--out') || 'release'
const keyFile = arg('--key')
const privateKey = keyFile ? readFileSync(keyFile, 'utf8') : process.env.PI_SIGNING_KEY || ''

const files = {}
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name)
    if (statSync(p).isDirectory()) walk(p)
    else files[relative('.', p).split(sep).join('/')] = readFileSync(p)
  }
}
walk('site')
for (const f of ['pi/server.mjs', 'pi/update.mjs', 'pi/bundle.mjs', 'security-headers.mjs']) files[f] = readFileSync(f)

const v = JSON.parse(files['site/version.json'].toString('utf8'))
const bundle = packBundle(files)
const bundleName = `gg-pi-${v.version}.ggpkg`
const manifest = makeManifest({ version: v.version, built: v.built, commit: v.commit, bundleName, bundle })

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
writeFileSync(join(out, bundleName), bundle)
writeFileSync(join(out, 'manifest.json'), manifest)
if (privateKey.trim()) {
  writeFileSync(join(out, 'manifest.sig'), signManifest(manifest, privateKey))
  console.log(`Signed release ${v.version}: ${Object.keys(files).length} files, ${(bundle.length / 1e6).toFixed(1)} MB in ${out}/`)
} else {
  console.log(`Unsigned release ${v.version} in ${out}/ (no PI_SIGNING_KEY): a Pi will not install it.`)
}
