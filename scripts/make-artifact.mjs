// Turns dist/ into a folder that the Artifact publisher accepts: a page body without <html>/<head> wrappers plus its files.
import { readFileSync, writeFileSync, cpSync, rmSync, mkdirSync } from 'node:fs'
const out = process.argv[2] || 'artifact'
const dist = process.argv[3] || 'dist'
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(`${dist}/assets`, `${out}/assets`, { recursive: true })
cpSync(`${dist}/packs`, `${out}/packs`, { recursive: true })
const ICON_FILES = ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png']
for (const f of ICON_FILES) cpSync(`${dist}/${f}`, `${out}/${f}`)
const html = readFileSync(`${dist}/index.html`, 'utf8')
const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1]
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('<meta charset') && !l.startsWith('<meta name="viewport"'))
  // The Artifact host wraps the page and sets its own policy, so the site's CSP tag (which would block the host's scripts) stays out.
  .filter((l) => !l.startsWith('<meta http-equiv="Content-Security-Policy"'))
const page = [head[head.findIndex((l) => l.startsWith('<title'))], '<meta name="claude:viewport-fit-sides" content="cover">', ...head.filter((l) => !l.startsWith('<title')), '<div id="root"></div>'].join('\n')
writeFileSync(`${out}/index.html`, page + '\n')
console.log(page)
// files.json: the map of published paths to pass to the Artifact publisher.
import { readdirSync } from 'node:fs'
const files = {}
for (const dir of ['assets', 'packs']) for (const f of readdirSync(`${out}/${dir}`, { recursive: true, withFileTypes: true })) if (f.isFile()) { const rel = `${f.parentPath ?? f.path}/${f.name}`.slice(out.length + 1); files[rel] = rel }
for (const f of ICON_FILES) files[f] = f
writeFileSync(`${out}-files.json`, JSON.stringify(files))
