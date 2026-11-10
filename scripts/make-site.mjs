// Builds one folder ready to upload to any static host:
//   site/        the normal app
//   site/host/   the host edition (audience screen)
//   site/_headers  security headers for Netlify and Cloudflare Pages
// Run: npm run build && npm run build:host && node scripts/make-site.mjs [outdir]
import { cpSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { SECURITY_HEADERS } from '../security-headers.mjs'
const out = process.argv[2] || 'site'
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync('dist', out, { recursive: true })
cpSync('dist-host', `${out}/host`, { recursive: true })
writeFileSync(`${out}/_headers`, '/*\n' + Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`).join('\n') + '\n')
console.log(`Wrote ${out}/ (app at /, host edition at /host/)`)
