// Fit check: plays through every screen at phone, tablet, laptop and projector sizes, in English and
// Arabic, with long category and team names, and reports any text that spills out of its box or off
// the screen, and any page that scrolls sideways.
//
//   npm run build && node e2e/fit.mjs            (Chromium)
//   BROWSER=webkit node e2e/fit.mjs              (Safari's engine, where installed)
//   BROWSER=firefox node e2e/fit.mjs
//   SIZES=iphone-se,ipad node e2e/fit.mjs        (only some sizes)   LANGS=ar   THEMES=neon
//
// Exits 1 when anything spills, so it can run in CI.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const pw = createRequire(import.meta.url)('playwright')
import { scan } from './fit-scan.mjs'

const BROWSER = process.env.BROWSER || 'chromium'
const PORT = +(process.env.PORT || 4183)
const URL = `http://localhost:${PORT}/`
const SHOTS = process.env.SHOTS || 'e2e/fit-shots'
mkdirSync(SHOTS, { recursive: true })

const SIZES = {
  'galaxy-s': { viewport: { width: 360, height: 740 }, mobile: true },
  'iphone-se': { viewport: { width: 375, height: 553 }, mobile: true }, // Safari's visible area with its bars
  'iphone-15': { viewport: { width: 393, height: 659 }, mobile: true },
  'iphone-pro-max': { viewport: { width: 430, height: 739 }, mobile: true },
  'iphone-landscape': { viewport: { width: 852, height: 320 }, mobile: true },
  'ipad': { viewport: { width: 820, height: 1106 }, mobile: true },
  'ipad-landscape': { viewport: { width: 1180, height: 746 }, mobile: true },
  'laptop': { viewport: { width: 1366, height: 768 } },
  'projector-4x3': { viewport: { width: 1024, height: 768 } },
  'full-hd': { viewport: { width: 1920, height: 1080 } },
}
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all)
const sizes = pick('SIZES', Object.keys(SIZES))
const langs = pick('LANGS', ['en', 'ar'])
const themes = pick('THEMES', ['amethyst', 'neon'])

// Long names the board and setup must cope with.
const LONG_EN = 'Thermodynamics, Fluid Mechanics & Heat Transfer Fundamentals'
const LONG_AR = 'أساسيات الهندسة الكهربائية والإلكترونيات والاتصالات المتقدمة'
const ONE_WORD = 'Electroencephalography'
const q = (i, l, text) => ({ id: `${i}-${l}`, q: text, a: 'An answer that is also rather long, to see that it wraps neatly', qAr: 'سؤال طويل جدًا لنرى أن النص العربي يلتف داخل البطاقة ولا يخرج من حدودها أبدًا', aAr: 'جواب طويل' })
const longQ = 'This clue is deliberately long, with a long unbroken word like Pneumonoultramicroscopicsilicovolcanoconiosis and a URL-like token electrical_engineering_department_building_23, to check that it wraps inside the card on every screen.'
const cat = (id, name, nameAr) => ({ id, name, nameAr, builtIn: false, levels: [0, 1, 2, 3, 4].map((l) => [0, 1, 2].map((i) => q(`${id}${i}`, l, longQ))) })
const CUSTOM = [cat('c-long', LONG_EN, LONG_AR), cat('c-word', ONE_WORD, 'تخطيط_كهربية_الدماغ'), cat('c-ar', LONG_AR, LONG_AR)]
const TEAMS = ['The Unstoppable Thermodynamicists', 'Team Supercalifragilisticexpialidocious', 'فريق المهندسين المبدعين الأقوياء']

// A server left over from an earlier run would answer instead of this build (and this one would fail to
// start on the taken port), so the tests would quietly check old code: refuse to run then.
if (await fetch(`http://localhost:${PORT}/`).then(() => true, () => false)) throw new Error(`Port ${PORT} is already in use (an old preview server?). Stop it and run again.`)
// vite is started with node itself (not through npx), so server.kill() really stops it at the end.
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await pw[BROWSER].launch()
const report = []
const errors = []

async function run(size, lang, theme) {
  const s = SIZES[size]
  const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: 1, ...(s.mobile && BROWSER !== 'firefox' ? { isMobile: true, hasTouch: true } : {}) })
  await ctx.addInitScript(([custom, lang, theme]) => {
    if (sessionStorage.getItem('fit.seeded')) return
    sessionStorage.setItem('fit.seeded', '1')
    localStorage.setItem('gg.consent.ilm.v1', JSON.stringify({ version: '9', date: '2026-11-10T00:00:00Z' }))
    localStorage.setItem('gg.tipsSeen.ilm.v1', 'true') // the first-visit study tips would cover the screen
    localStorage.setItem('gg.settings.ilm.v1', JSON.stringify({ theme, lang, reduceFx: true, sound: false }))
    localStorage.setItem('gg.custom.ilm.v1', JSON.stringify(custom))
  }, [CUSTOM, lang, theme])
  const page = await ctx.newPage()
  // Heritage only opens on Friday afternoons in Riyadh.
  if (theme === 'heritage') await page.clock.setSystemTime(new Date('2026-11-13T10:00:00Z'))
  page.on('pageerror', (e) => errors.push(`${size}/${lang}/${theme}: ${e.message}`))
  // If the browser loses the page, say so: the error that follows only says "closed".
  page.on('crash', () => console.log('CRASH', size, lang, theme, 'the browser reported that the page crashed'))
  const tag = `${BROWSER} ${size} ${lang} ${theme}`
  const check = async (screen) => {
    await page.waitForTimeout(500)
    const found = await page.evaluate(scan)
    for (const f of found) report.push({ browser: BROWSER, size, lang, theme, screen, ...f })
    if (found.length || process.env.ALLSHOTS) await page.screenshot({ path: `${SHOTS}/${BROWSER}-${size}-${lang}-${theme}-${screen}.png`, fullPage: true })
    console.log(`${found.length ? 'SPILL' : 'ok   '} ${tag} ${screen}${found.length ? ` (${found.length})` : ''}`)
  }
  const tap = (sel) => page.locator(sel).first().click()
  const has = async (id) => (await page.getByTestId(id).count()) > 0
  const home = async () => { await tap('.brand'); await page.waitForSelector('.logo-card, [data-testid="study-files"]') }
  // The built-in categories with the longest names (playable ones only).
  const longest = async (n) => page.$$eval('.cat-pick[data-cat]:not([disabled])', (els, n) => els.map((e) => [e.dataset.cat, e.textContent.length]).filter(([id]) => !id.startsWith('c-')).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id), n)
  const newGame = async () => { await page.getByTestId('new-game').or(page.getByRole('button', { name: /new game|لعبة جديدة/i })).first().click(); await page.waitForSelector('.cat-pick') }

  try {
    await page.goto(URL)
    // The Terms pop-up shows because the saved consent is for another version.
    await page.waitForSelector('.legal-panel', { timeout: 5000 }).catch(() => {})
    if (await page.locator('.legal-panel').count()) {
      await check('terms pop-up')
      await page.getByTestId('consent-agree').check()
      await page.getByTestId('consent-accept').click()
    }
    await check('home')
    if (await has('study-files')) { await page.getByTestId('study-files').click(); await page.waitForSelector('[data-testid="study"]'); await check('question files'); await home() }
    await page.getByRole('button', { name: /category builder|منشئ الفئات|الفئات/i }).first().click(); await page.waitForTimeout(400); await check('builder'); await home()

    // Single game, with every long name and the fun extras on.
    await newGame()
    const builtins = await longest(4)
    for (const id of ['c-long', 'c-word', 'c-ar', ...builtins.slice(0, 3)]) await tap(`[data-cat="${id}"]`)
    await page.fill('#team-0', TEAMS[0]); await page.fill('#team-1', TEAMS[1])
    if (await page.locator('#team-2').count()) await page.fill('#team-2', TEAMS[2])
    await check('setup')
    if (await has('type-tour')) { await page.getByTestId('type-tour').click(); await check('setup tournament'); await page.getByTestId('type-single').click() }
    await page.getByTestId('start').click(); await page.waitForSelector('.tile'); await page.waitForTimeout(1500)
    await check('board')
    await tap('[data-tile="0-0"]'); await page.waitForSelector('.card.open'); await page.waitForTimeout(900)
    if (await page.getByTestId('intro-next').count()) await page.getByTestId('intro-next').click()
    await check('clue')
    await page.getByTestId('reveal').click(); await page.waitForTimeout(600); await check('clue answer')
    await page.getByTestId('back').click(); await page.waitForTimeout(800)
    const g = await page.evaluate(() => JSON.parse(localStorage.getItem('gg.game.ilm.v1')))
    const sp = g.clues.flatMap((col, c) => col.map((x, l) => (x.special || x.golden ? `${c}-${l}` : null))).find(Boolean)
    if (sp) {
      await tap(`[data-tile="${sp}"]`); await page.waitForSelector('.card.open'); await page.waitForTimeout(900)
      if (await page.getByTestId('intro-next').count()) await check('special tile intro')
      await page.keyboard.press('Escape'); await page.waitForTimeout(600)
      if (await page.getByTestId('back').count()) { await page.getByTestId('back').click(); await page.waitForTimeout(600) }
    }
    await page.getByTestId('end').click(); await page.getByTestId('end-confirm').click()
    // Closing rounds may come first; skip through them to the results.
    for (let i = 0; i < 6 && !(await page.getByTestId('winner').count()); i++) {
      await page.waitForTimeout(600)
      for (const id of ['lightning-skip', 'mode-skip']) if (await page.getByTestId(id).count()) { await check(id.split('-')[0] + ' round'); await page.getByTestId(id).click() }
      if (await page.getByTestId('final').count()) { await check('final question'); await page.evaluate(() => { const g = JSON.parse(localStorage.getItem('gg.game.ilm.v1')); g.finalState = { step: 'answer', marks: g.teams.map(() => null) }; localStorage.setItem('gg.game.ilm.v1', JSON.stringify(g)) }); await page.reload(); await page.getByRole('button', { name: /resume|متابعة|استئناف/i }).first().click(); await page.getByTestId('final-done').click() }
    }
    await page.waitForSelector('[data-testid="winner"]'); await page.waitForTimeout(1200)
    await check('results')

    await home(); await newGame()
    const hasVote = (await page.locator('#vote').count()) > 0
    const hasTour = await has('type-tour')
    if (!hasVote && !hasTour) return
    if (hasVote) {
    // Category vote.
    await page.check('#vote')
    for (const id of ['c-long', 'c-word', 'c-ar', ...builtins]) await tap(`[data-cat="${id}"]`)
    await page.fill('#team-0', TEAMS[0]); await page.fill('#team-1', TEAMS[1])
    await page.getByTestId('start').click(); await page.waitForSelector('[data-testid="vote"]')
    await check('category vote')
    await home(); await newGame()
    }
    if (hasTour) {

    // Tournament: title card and a picture round.
    await page.uncheck('#vote').catch(() => {})
    for (const id of ['c-long', 'c-word', 'c-ar', ...builtins.slice(0, 3)]) { const on = await page.locator(`[data-cat="${id}"]`).getAttribute('aria-pressed'); if (on !== 'true') await tap(`[data-cat="${id}"]`) }
    await page.getByTestId('type-tour').click()
    await page.getByTestId('start').click(); await page.waitForSelector('[data-testid="round-card"]'); await page.waitForTimeout(900)
    await check('tournament title card')
    await page.getByTestId('round-start').click(); await page.waitForSelector('.tile')
    await page.getByTestId('end').click(); await page.getByTestId('end-confirm').click()
    await page.waitForSelector('[data-testid="round-card"]'); await page.waitForTimeout(900)
    await check('tournament standings')
    await page.getByTestId('round-start').click(); await page.waitForTimeout(900)
    await check('picture round')
    }
  } catch (e) {
    await page.screenshot({ path: `${SHOTS}/${BROWSER}-${size}-${lang}-${theme}-error.png` }).catch(() => {})
    throw e
  } finally {
    await ctx.close()
  }
}

try {
  for (const size of sizes) for (const lang of langs) for (const theme of themes) {
    // A page the browser itself lost (crashed or closed under the test) is played once more from the
    // start, and the loss is printed. A second loss, or any other error, fails the run.
    for (let attempt = 1; ; attempt++) {
      try { await run(size, lang, theme); break } catch (e) {
        const msg = String(e.message || e).split('\n')[0]
        if (attempt === 1 && /has been closed|crashed/i.test(msg) && browser.isConnected()) { console.log('RETRY', size, lang, theme, msg); continue }
        errors.push(`${size}/${lang}/${theme}: ${msg}`); console.log('ERROR', size, lang, theme, msg); break
      }
    }
  }
} finally {
  await browser.close()
  server.kill()
}
writeFileSync(`${SHOTS}/${BROWSER}-${process.env.SIZES || 'all'}-report.json`, JSON.stringify({ report, errors }, null, 1))
const key = (r) => `${r.screen} | ${r.kind} | ${r.where}`
const groups = {}
for (const r of report) (groups[key(r)] ||= []).push(r)
console.log(`\n${report.length} spills in ${Object.keys(groups).length} places, ${errors.length} errors`)
for (const [k, rs] of Object.entries(groups)) console.log(`- ${k}  [${[...new Set(rs.map((r) => r.size))].join(',')}] max ${Math.max(...rs.map((r) => r.by))}px  "${rs[0].text}"`)
for (const e of errors) console.log('ERROR', e)
process.exit(report.length || errors.length ? 1 : 0)
