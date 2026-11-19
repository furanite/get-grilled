// Works offline: after the build, writes sw.js (from scripts/sw-template.js) with the list of files to store:
// the app, fonts, sounds and question packs. Pictures are stored when first shown. The version is a hash of
// the files, so any change makes a new copy. Used by vite.config.ts.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'

export const APP_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

export default function offlinePlugin() {
  let outDir = 'dist'
  return {
    name: 'offline-copy',
    apply: 'build',
    configResolved(c) {
      outDir = join(c.root, c.build.outDir)
    },
    closeBundle() {
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
      const keep = files.filter((f) => f !== 'sw.js' && f !== 'og.png' && !f.endsWith('.woff') && !f.startsWith('_') && f !== 'version.json').sort()
      const hash = createHash('sha256')
      for (const f of keep) hash.update(f).update(readFileSync(join(outDir, f)))
      const list = ['./', ...keep.map((f) => './' + f)]
      const tpl = readFileSync(new URL('./scripts/sw-template.js', import.meta.url), 'utf8')
      writeFileSync(join(outDir, 'sw.js'), tpl.replace('__VERSION__', hash.digest('hex').slice(0, 12)).replace('__FILES__', JSON.stringify(list)))
    },
  }
}
