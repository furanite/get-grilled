// Fit check for the host edition's audience window: the same spill scan as fit.mjs, on the big screen
// at common projector and TV sizes, in English and Arabic, with long category and team names.
//   npm run build:host && node e2e/fit-host.mjs      (BROWSER=webkit|firefox, LANGS=ar, THEMES=neon)
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { scan } from './fit-scan.mjs'
const pw = createRequire(import.meta.url)('playwright')

const BROWSER = process.env.BROWSER || 'chromium'
const PORT = +(process.env.PORT || 4193)
const URL = `http://localhost:${PORT}/`
const SHOTS = process.env.SHOTS || 'e2e/fit-shots'
mkdirSync(SHOTS, { recursive: true })
const SCREENS = {
  'svga-4x3': { width: 800, height: 600 },
  'xga-4x3': { width: 1024, height: 768 },
  'hd-720': { width: 1280, height: 720 },
  'wxga-16x10': { width: 1280, height: 800 },
  'full-hd': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
  'ultrawide': { width: 2560, height: 1080 },
}
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all)
const langs = pick('LANGS', ['en', 'ar'])
const themes = pick('THEMES', ['amethyst', 'neon'])
const screens = pick('SCREENS', Object.keys(SCREENS))

const longQ = 'This clue is deliberately long, with a long unbroken word like Pneumonoultramicroscopicsilicovolcanoconiosis, to check that it wraps inside the card on every screen and still leaves room for the timer and the scores.'
const q = (i, l) => ({ id: `${i}-${l}`, q: longQ, a: 'An answer that is also rather long, to see that it wraps neatly', qAr: 'سؤال طويل جدًا لنرى أن النص العربي يلتف داخل البطاقة ولا يخرج من حدودها أبدًا على الشاشة الكبيرة', aAr: 'جواب طويل' })
const cat = (id, name, nameAr) => ({ id, name, nameAr, builtIn: false, levels: [0, 1, 2, 3, 4].map((l) => [0, 1].map((i) => q(`${id}${i}`, l))) })
const CUSTOM = [
  cat('c-long', 'Thermodynamics, Fluid Mechanics & Heat Transfer Fundamentals', 'أساسيات الهندسة الكهربائية والإلكترونيات والاتصالات المتقدمة'),
  cat('c-word', 'Electroencephalography', 'تخطيط_كهربية_الدماغ'),
]
const TEAMS = ['The Unstoppable Thermodynamicists', 'Team Supercalifragilisticexpialidocious', 'فريق المهندسين المبدعين الأقوياء']

// A server left over from an earlier run would answer instead of this build (and this one would fail to
// start on the taken port), so the tests would quietly check old code: refuse to run then.
if (await fetch(`http://localhost:${PORT}/`).then(() => true, () => false)) throw new Error(`Port ${PORT} is already in use (an old preview server?). Stop it and run again.`)
// vite is started with node itself (not through npx), so server.kill() really stops it at the end.
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-host', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await pw[BROWSER].launch(BROWSER === 'chromium' ? { args: ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] } : {})
const report = []
const errors = []

async function run(lang, theme) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
  await ctx.addInitScript(([custom, lang, theme]) => {
    if (localStorage.getItem('fit.seeded')) return
    localStorage.setItem('fit.seeded', '1')
    localStorage.setItem('gg.consent.v1', JSON.stringify({ version: '1.1', date: '2026-11-10T00:00:00Z' }))
    localStorage.setItem('gg.settings.v1', JSON.stringify({ theme, lang, reduceFx: true, sound: false }))
    localStorage.setItem('gg.custom.v1', JSON.stringify(custom))
  }, [CUSTOM, lang, theme])
  const page = await ctx.newPage()
  if (theme === 'heritage') await page.clock.setSystemTime(new Date('2026-11-13T10:00:00Z'))
  try {
    await page.goto(URL)
    // Accept the Terms pop-up if this edition's Terms version is newer than the one we saved.
    if (await page.getByTestId('consent-agree').count()) { await page.getByTestId('consent-agree').check(); await page.getByTestId('consent-accept').click() }
    const [aud] = await Promise.all([ctx.waitForEvent('page'), page.getByTestId('audience-toggle').click()])
    await aud.waitForSelector('[data-testid="audience"]')
    aud.on('pageerror', (e) => errors.push(`audience ${lang}/${theme}: ${e.message}`))
    const check = async (stage) => {
      for (const size of screens) {
        await aud.setViewportSize(SCREENS[size])
        await aud.waitForTimeout(1600)
        const found = await aud.evaluate(scan)
        // The audience screen must fit without scrolling at all.
        const tall = await aud.evaluate(() => document.documentElement.scrollHeight - innerHeight)
        if (tall > 1) found.push({ kind: 'screen scrolls down', by: tall, where: 'html' })
        for (const f of found) report.push({ browser: BROWSER, size, lang, theme, screen: 'audience ' + stage, ...f })
        if (found.length || process.env.ALLSHOTS) await aud.screenshot({ path: `${SHOTS}/${BROWSER}-audience-${size}-${lang}-${theme}-${stage}.png` })
        console.log(`${found.length ? 'SPILL' : 'ok   '} ${BROWSER} audience ${size} ${lang} ${theme} ${stage}${found.length ? ` (${found.length})` : ''}`)
      }
    }
    await check('waiting')
    await page.getByRole('button', { name: /new game|لعبة جديدة/i }).click()
    await page.waitForSelector('.cat-pick')
    // Our two long custom categories and the four built-ins with the longest names.
    const builtins = await page.$$eval('.cat-pick[data-cat]:not([disabled])', (els) => els.map((e) => [e.dataset.cat, e.textContent.length]).filter(([id]) => !id.startsWith('c-')).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id))
    for (const id of ['c-long', 'c-word', ...builtins]) await page.click(`[data-cat="${id}"]`)
    for (let i = 0; i < 3; i++) if (await page.locator(`#team-${i}`).count()) await page.fill(`#team-${i}`, TEAMS[i])
    const extras = page.locator('#extras'); if (await extras.isChecked()) await extras.uncheck()
    await page.getByTestId('start').click(); await page.waitForSelector('.tile')
    await aud.waitForSelector('[data-aud-tile]'); await check('board')
    await page.click('[data-tile="0-4"]'); await page.waitForSelector('.card.open')
    // A golden tile says what it is first.
    await page.waitForTimeout(900); if (await page.getByTestId('intro-next').count()) await page.getByTestId('intro-next').click()
    await aud.waitForSelector('[data-testid="audience-clue"]'); await check('clue')
    await page.getByTestId('reveal').click(); await aud.waitForSelector('[data-testid="audience-answer"]'); await check('answer')
    await page.keyboard.press('Digit1'); await aud.waitForSelector('[data-testid="audience-clue"]', { state: 'detached' })
    await page.getByTestId('end').click(); await page.getByTestId('end-confirm').click()
    await page.waitForSelector('[data-testid="winner"]'); await aud.waitForTimeout(1500); await check('results')
  } catch (e) {
    await page.screenshot({ path: `${SHOTS}/${BROWSER}-host-error-${lang}-${theme}.png` }).catch(() => {})
    throw e
  } finally {
    await ctx.close()
  }
}

try {
  for (const lang of langs) for (const theme of themes) {
    try { await run(lang, theme) } catch (e) { errors.push(`${lang}/${theme}: ${String(e.message || e).split('\n')[0]}`); console.log('ERROR', lang, theme, String(e.message || e).split('\n')[0]) }
  }
} finally {
  await browser.close()
  server.kill()
}
writeFileSync(`${SHOTS}/${BROWSER}-audience-report.json`, JSON.stringify({ report, errors }, null, 1))
const groups = {}
for (const r of report) (groups[`${r.screen} | ${r.kind} | ${r.where}`] ||= []).push(r)
console.log(`\n${report.length} spills in ${Object.keys(groups).length} places, ${errors.length} errors`)
for (const [k, rs] of Object.entries(groups)) console.log(`- ${k}  [${[...new Set(rs.map((r) => r.size))].join(',')}] max ${Math.max(...rs.map((r) => r.by))}px  "${rs[0].text || ''}"`)
for (const e of errors) console.log('ERROR', e)
process.exit(report.length || errors.length ? 1 : 0)
