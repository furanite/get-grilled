// Works offline: after the build, writes sw.js (from scripts/sw-template.js) with the list of files to store:
// the app, fonts and sounds. Question packs are stored when first used (or all together when the host asks),
// and pictures when first shown. The version is a hash of
// the files, so any change makes a new copy. Used by vite.config.ts.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'

export const APP_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

export default function offlinePlugin() {
  let outDir = 'dist'
  let env = {}
  return {
    name: 'offline-copy',
    apply: 'build',
    configResolved(c) {
      outDir = join(c.root, c.build.outDir)
      env = c.env || {}
    },
    closeBundle() {
      // The install details (name and icons), with the edition's own name.
      const name = env.VITE_TITLE || env.VITE_APP_NAME || 'Get Grilled'
      const manifest = {
        name,
        short_name: name,
        description: env.VITE_DESCRIPTION || '',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: env.VITE_BG || '#110920',
        theme_color: env.VITE_BG || '#110920',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      }
      writeFileSync(join(outDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2))
      const files = []
      const walk = (dir) => {
        for (const n of readdirSync(dir)) {
          const p = join(dir, n)
          if (statSync(p).isDirectory()) {
            // The host edition has its own copy; pictures are stored as they are shown.
            if (n === 'host' || n === 'img') continue
            walk(p)
          } else files.push(relative(outDir, p).split('\\').join('/'))
        }
      }
      walk(outDir)
      const keep = files.filter((f) => f !== 'sw.js' && !/^og(-.*)?\.png$/.test(f) && !f.endsWith('.woff') && !f.startsWith('_') && f !== 'version.json').sort()
      const hash = createHash('sha256')
      for (const f of keep) hash.update(f).update(readFileSync(join(outDir, f)))
      // Question packs are stored the first time each is used (or all at once when the host asks), so a
      // first visit doesn't download every category. The list of categories (packs/index.json) is always stored.
      // Only the categories themselves wait; the list of themed nights and anything else in packs/ is stored at once.
      let ids = []
      try {
        ids = JSON.parse(readFileSync(join(outDir, 'packs', 'index.json'), 'utf8')).map((c) => c.id)
      } catch {
        /* no packs in this build */
      }
      const packFiles = new Set(ids.map((id) => `packs/${id}.json`))
      const isPack = (f) => packFiles.has(f)
      const list = ['./', ...keep.filter((f) => !isPack(f)).map((f) => './' + f)]
      const packs = keep.filter(isPack).map((f) => './' + f)
      const tpl = readFileSync(new URL('./scripts/sw-template.js', import.meta.url), 'utf8')
      writeFileSync(join(outDir, 'sw.js'), tpl.replace('__VERSION__', hash.digest('hex').slice(0, 12)).replace('__FILES__', JSON.stringify(list)).replace('__PACKS__', JSON.stringify(packs)))
    },
  }
}
