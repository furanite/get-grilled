// Screenshots of the real app for the buzzer setup guide.
// Run from the repository after `npm run build:pi` (port 80 needs root; the Pi name is mapped to this computer):
// node scripts/buzzer-guide/shots.mjs . /tmp/shots gg.tipsSeen.v1 Falcons,Engineers,Titans 80 getgrilled.local
// Islamic site: tips key gg.tipsSeen.ilm.v1, teams Noor,Huda,Fajr, name ilm.local, and PICK set to
// 'Islamic Architecture|Akhlaq and Adab|Money and trade|Work and earning|Food and Drink|Hajj and Umrah' so no Qur'an text is pictured.
// Then convert the PNGs to .webp (quality 80) into public/buzzer-guide/.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const { chromium } = createRequire(import.meta.url)('playwright')

const [repo, out, tipsKey, teamsArg, portArg, lanHost] = process.argv.slice(2)
const PORT = Number(portArg)
const URL = `http://127.0.0.1:${PORT}/`
const LAN = `http://${lanHost}/`
const PIN = '246810'
mkdirSync(out, { recursive: true })
const state = mkdtempSync(join(tmpdir(), 'guide-pi-'))
const server = spawn('node', ['pi/server.mjs'], { cwd: repo, env: { ...process.env, GG_PORT: String(PORT), GG_PIN: PIN, GG_STATE: state, GG_WIFI_SSID: 'Quiz-Hall', GG_WIFI_PASS: 'example-pass-123' }, stdio: ['ignore', 'pipe', 'inherit'] })
await new Promise((ok) => server.stdout.on('data', (d) => String(d).includes('on port') && ok()))

const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${lanHost} 127.0.0.1`] })
async function newPage(viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await ctx.addInitScript(() => localStorage.setItem('gg.consent.v1', JSON.stringify({ version: '1.4', date: '2026-11-10T00:00:00Z' })))
  await ctx.addInitScript((k) => localStorage.setItem(k, 'true'), tipsKey)
  const page = await ctx.newPage()
  await page.addLocatorHandler(page.getByTestId('intro-next'), async (b) => b.click(), { noWaitAfter: true })
  return page
}
async function hostIn(page, base = URL, q = '') {
  await page.goto(base + 'host/' + q)
  await page.getByTestId('host-pin').fill(PIN)
  await page.getByTestId('host-signin').click()
  await page.waitForSelector('[data-testid="devices-open"]')
}
async function startGame(page) {
  await page.getByRole('button', { name: /new game|لعبة جديدة/i }).click()
  await page.waitForSelector('.cat-pick')
  if (process.env.PICK) for (const n of process.env.PICK.split('|')) await page.locator('.cat-pick', { hasText: n }).first().click()
  else for (let i = 0; i < 6; i++) await page.locator('.cat-pick:not([disabled])').nth(i).click()
  for (const [i, n] of teamsArg.split(',').entries()) await page.fill(`#team-${i}`, n)
  const box = page.locator('#extras')
  if ((await box.count()) && (await box.isChecked())) await box.uncheck()
  await page.getByTestId('start').click()
  await page.waitForSelector('.tile')
}
const shot = async (el, name) => {
  await el.page?.()?.waitForTimeout?.(500)
  await el.screenshot({ path: join(out, name), animations: 'disabled' })
  console.log('shot', name)
}

try {
  // 1. Buzzers panel, not connected (real box mode)
  const plain = await newPage()
  await hostIn(plain)
  await startGame(plain)
  await plain.waitForTimeout(800)
  await shot(plain.locator('header').first(), 'topbar.png')
  await plain.getByTestId('buzz-open').click()
  await plain.waitForSelector('[data-testid="buzz-panel"]')
  await plain.waitForTimeout(500)
  await shot(plain.getByTestId('buzz-panel'), 'buzz-connect.png')
  await plain.context().close()
  // 5. Practice box: test press lights a team
  const sim = await newPage()
  await hostIn(sim, URL, '?buzzsim=1')
  if (!(await sim.evaluate(() => !!window.ggBuzz))) { await sim.goto(URL + 'host/?buzzsim=1'); await sim.waitForSelector('[data-testid="devices-open"]') }
  await startGame(sim)
  await sim.getByTestId('buzz-open').click()
  await sim.evaluate(() => window.ggBuzz.press(1))
  await sim.waitForSelector('[data-testid="buzz-map-1"].hit')
  await shot(sim.getByTestId('buzz-panel'), 'buzz-test.png')
  await sim.getByTestId('buzz-done').click()
  // 6. Clue with buzzers locked, then the order
  await sim.click('[data-tile="0-1"]')
  await sim.waitForSelector('.card.open')
  await sim.waitForSelector('[data-testid="buzz-arm"]')
  await sim.waitForTimeout(1200)
  await shot(sim.locator('.card.open'), 'clue-locked.png')
  await sim.keyboard.press('b')
  await sim.waitForSelector('[data-testid="buzz-waiting"]')
  await sim.evaluate(() => { window.ggBuzz.press(1, 400000); window.ggBuzz.press(0, 484000); window.ggBuzz.press(2, 1210000) })
  await sim.waitForSelector('[data-testid="buzz-order"] li[data-buzz-team="2"]')
  await sim.waitForTimeout(800)
  await shot(sim.locator('.card.open'), 'clue-order.png')
  await sim.context().close()
  // LAN session at the Pi's name (not a secure address)
  const lan = await newPage()
  await hostIn(lan, LAN)
  await startGame(lan)
  // 2. Devices panel with the projector QR and the audience switches
  await lan.getByTestId('devices-open').click()
  await lan.waitForSelector('[data-testid="seat-team-2"]')
  await lan.getByTestId('seat-team-0').getByTestId('seat-qr').click()
  await lan.waitForTimeout(500)
  await shot(lan.getByTestId('devices'), 'devices.png')
  const projUrl = await (async () => {
    const row = lan.getByTestId('seat-screen-0')
    if (!(await row.getByTestId('seat-url').count())) await row.getByTestId('seat-qr').click()
    return row.getByTestId('seat-url').textContent()
  })()
  const teamUrl = await lan.getByTestId('seat-team-0').getByTestId('seat-url').textContent()
  await lan.getByTestId('aud-on').check()
  await lan.getByTestId('aud-join').check()
  await lan.getByTestId('devices-done').click()
  // 3. Projector with the audience join card
  const proj = await newPage({ width: 1280, height: 720 })
  await proj.goto(projUrl.trim())
  await proj.waitForSelector('[data-testid="join-card"]', { timeout: 15000 })
  await proj.waitForTimeout(800)
  await shot(proj, 'projector-join.png')
  await lan.getByTestId('devices-open').click()
  await lan.getByTestId('aud-join').uncheck()
  await lan.getByTestId('aud-on').uncheck()
  await lan.getByTestId('devices-done').click()
  // 4. Team tablet
  const tab = await newPage({ width: 1024, height: 700 })
  await tab.goto(teamUrl.trim())
  await tab.waitForTimeout(2500)
  await shot(tab, 'tablet.png')
  // 7. Pi address that is not "secure": the Buzzers panel explains the Chrome setting
  await lan.getByTestId('buzz-open').click()
  await lan.waitForSelector('[data-testid="buzz-panel"]')
  await lan.waitForTimeout(500)
  await shot(lan.getByTestId('buzz-panel'), 'buzz-insecure.png')
} finally {
  await browser.close()
  server.kill()
}
