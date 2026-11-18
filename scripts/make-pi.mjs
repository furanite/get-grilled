// Stamps the built site/ folder for the Raspberry Pi with its version and the files it holds,
// so the Pi can show which version it runs and check a download before using it.
// Run after build:site:  node scripts/make-pi.mjs [sitedir]
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { execSync } from 'node:child_process'

const dir = process.argv[2] || 'site'
const files = {}
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (name !== 'version.json') files[relative(dir, p).split(sep).join('/')] = createHash('sha256').update(readFileSync(p)).digest('hex')
  }
}
walk(dir)
let commit = 'local'
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
} catch {
  /* not a git checkout */
}
const built = new Date().toISOString()
writeFileSync(join(dir, 'version.json'), JSON.stringify({ version: `${built.slice(0, 10)}-${commit}`, commit, built, files }, null, 1))
console.log(`Stamped ${dir}/version.json: ${Object.keys(files).length} files, version ${built.slice(0, 10)}-${commit}`)
