// Browser and attack checks for Munaafasatul Ilm Live (the Raspberry Pi server).
// Run: npm run build:pi && node e2e/pi.mjs
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { spawn } from 'node:child_process'
import http from 'node:http'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 4192
const URL = `http://127.0.0.1:${PORT}/`
const PIN = '246810'
const SHOTS = process.env.SHOTS || 'e2e/shots'
mkdirSync(SHOTS, { recursive: true })
const state = mkdtempSync(join(tmpdir(), 'gg-pi-'))
const server = spawn('node', ['pi/server.mjs'], { env: { ...process.env, GG_PORT: String(PORT), GG_PIN: PIN, GG_STATE: state }, stdio: ['ignore', 'pipe', 'inherit'] })
await new Promise((ok) => server.stdout.on('data', (d) => String(d).includes('on port') && ok()))

const results = []
async function test(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return
  try {
    await fn()
    results.push(true)
    console.log('PASS', name)
  } catch (e) {
    results.push(false)
    console.log('FAIL', name, '\n   ', String(e.message || e).split('\n')[0], process.env.DEBUG ? (e.cause ?? e.stack) : '')
  }
}
function assert(c, msg) {
  if (!c) throw new Error(msg)
}

const browser = await chromium.launch()
async function newPage(viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport })
  await ctx.addInitScript(() => localStorage.setItem('gg.consent.ilm.v1', JSON.stringify({ version: '1.5', date: '2026-11-11T00:00:00Z' })))
  await ctx.addInitScript(() => localStorage.setItem('gg.tipsSeen.ilm.v1', 'true'))
  const page = await ctx.newPage()
  await page.addLocatorHandler(page.getByTestId('intro-next'), async (b) => b.click(), { noWaitAfter: true })
  page.errors = []
  page.on('pageerror', (e) => page.errors.push(e.message))
  return page
}
async function hostIn(page) {
  await page.goto(URL + 'host/')
  await page.getByTestId('host-pin').fill(PIN)
  await page.getByTestId('host-signin').click()
  await page.waitForSelector('[data-testid="devices-open"]')
}
async function startGame(page, { extras = false } = {}) {
  await page.getByRole('button', { name: /new game/i }).click()
  await page.waitForSelector('.cat-pick')
  for (let i = 0; i < 6; i++) await page.locator('.cat-pick:not([disabled])').nth(i).click()
  for (const [i, n] of ['Falcons', 'Engineers', 'Titans'].entries()) await page.fill(`#team-${i}`, n)
  const box = page.locator('#extras')
  if (!extras && (await box.count()) && (await box.isChecked())) await box.uncheck()
  await page.getByTestId('start').click()
  await page.waitForSelector('.tile')
}
async function linkOf(host, testid) {
  const row = host.getByTestId(testid)
  await row.waitFor()
  if (!(await row.getByTestId('seat-url').count())) await row.getByTestId('seat-qr').click()
  return row.getByTestId('seat-url').textContent()
}
// Plain HTTP requests, sent exactly as written (no path clean-up, any Host header), like an attacker would.
const raw = (path, { method = 'GET', headers = {}, body } = {}) =>
  new Promise((ok, fail) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path, method, headers }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString()
        ok({ status: res.statusCode, headers: { get: (k) => res.headers[k.toLowerCase()] ?? null }, text: async () => text })
      })
    })
    req.on('error', fail)
    if (body) req.write(body)
    req.end()
  })

try {
  await test('the plain app on the Pi is a landing page that points to the host screen', async () => {
    const page = await newPage()
    await page.goto(URL)
    await page.waitForSelector('[data-testid="device-landing"]')
    assert((await page.getByRole('button', { name: /new game/i }).count()) === 0, 'no game controls for a stranger')
    await page.context().close()
  })

  await test('host sign-in: wrong PIN is refused, the right PIN opens the game', async () => {
    const page = await newPage()
    await page.goto(URL + 'host/')
    await page.getByTestId('host-pin').fill('111111')
    await page.getByTestId('host-signin').click()
    await page.waitForSelector('[data-testid="host-login-msg"]')
    assert((await page.getByTestId('host-login-msg').textContent()).includes('Wrong PIN'), 'wrong pin message')
    await page.getByTestId('host-pin').fill(PIN)
    await page.getByTestId('host-signin').click()
    await page.waitForSelector('[data-testid="devices-open"]')
    await page.reload()
    await page.waitForSelector('[data-testid="devices-open"]')
    assert(!page.errors.length, page.errors.join(' | '))
    await page.context().close()
  })

  let host, tablet, projector
  await test('a team opens its link; the host sees it join; a second device is turned away', async () => {
    host = await newPage()
    await hostIn(host)
    await startGame(host)
    await host.getByTestId('devices-open').click()
    await host.waitForSelector('[data-testid="seat-team-2"]')
    assert((await host.getByTestId('devices-guide').getAttribute('href')) === 'buzzer-guide.html#pi', 'Devices links to the setup guide')
    assert((await host.locator('[data-testid^="seat-team-"]').count()) === 3, 'three team seats')
    assert((await host.getByTestId('seat-team-0').getAttribute('data-state')) === 'waiting', 'not joined yet')
    await host.getByTestId('seat-team-0').getByTestId('seat-qr').click()
    assert((await host.getByTestId('seat-team-0').locator('[data-testid="live-qr"] svg').count()) === 1, 'QR code')
    await host.screenshot({ path: `${SHOTS}/pi-devices.png` })
    const link = await linkOf(host, 'seat-team-0')
    tablet = await newPage({ width: 1024, height: 768 })
    await tablet.goto(link)
    await tablet.waitForSelector('[data-testid="device-team"]')
    assert((await tablet.getByTestId('team-name').textContent()) === 'Falcons', 'team name')
    assert(!(await tablet.evaluate(() => location.search)).includes(link.split('=')[1]), 'key left in the address bar')
    await host.waitForSelector('[data-testid="seat-team-0"][data-state="joined"][data-online]')
    // The same link on another device
    const other = await newPage()
    await other.goto(link)
    await other.waitForSelector('[data-testid="device-taken"]')
    await other.context().close()
    // The tablet keeps its seat after a reload
    await tablet.reload()
    await tablet.waitForSelector('[data-testid="device-team"]')
    assert(!tablet.errors.length, tablet.errors.join(' | '))
  })

  await test('the projector shows the question but never the answer until the host reveals it', async () => {
    projector = await newPage({ width: 1280, height: 720 })
    await projector.goto(await linkOf(host, 'seat-screen-0'))
    await projector.waitForSelector('[data-aud-tile="0-0"]')
    await host.getByTestId('devices-done').click()
    await host.click('[data-tile="2-3"]')
    await host.waitForSelector('.card.open')
    const q = await host.textContent('[data-testid="question"]')
    const a = await host.textContent('[data-testid="answer"]')
    await projector.waitForSelector('[data-testid="audience-question"]')
    assert((await projector.textContent('[data-testid="audience-question"]')) === q, 'question on projector')
    assert(!(await projector.content()).includes(a), 'answer reached the projector early')
    await tablet.waitForSelector('[data-testid="audience-question"]')
    assert(!(await tablet.content()).includes(a), 'answer reached the tablet early')
    await projector.screenshot({ path: `${SHOTS}/pi-projector-clue.png` })
    await host.getByTestId('reveal').click()
    await projector.waitForSelector('[data-testid="audience-answer"]')
    assert((await projector.textContent('[data-testid="audience-answer"]')) === a, 'answer after reveal')
    await host.click('[data-judge="0-ok"]')
    await tablet.waitForFunction(() => document.querySelector('.remote-score')?.textContent !== '0')
    await tablet.screenshot({ path: `${SHOTS}/pi-tablet.png` })
  })

  await test('reissuing a link disconnects the old device and the old link stops working', async () => {
    await host.getByTestId('devices-open').click()
    const old = await linkOf(host, 'seat-team-0').catch(() => null)
    await host.getByTestId('seat-team-0').getByTestId('seat-reissue').click()
    await tablet.waitForSelector('[data-testid="device-revoked"]')
    await host.waitForSelector('[data-testid="seat-team-0"][data-state="waiting"]')
    const fresh = await linkOf(host, 'seat-team-0')
    const late = await newPage()
    await late.goto(host.url().replace(/host\/.*/, '') + '?t=' + 'x'.repeat(32))
    await late.waitForSelector('[data-testid="device-invalid"]')
    await tablet.goto(fresh)
    await tablet.waitForSelector('[data-testid="device-team"]')
    await host.waitForSelector('[data-testid="seat-team-0"][data-state="joined"]')
    // Remove access: the device is cut off and no link works until a new one is issued.
    await host.getByTestId('seat-team-0').getByTestId('seat-remove').click()
    await tablet.waitForSelector('[data-testid="device-revoked"]')
    await host.waitForSelector('[data-testid="seat-team-0"][data-state="removed"]')
    await late.goto(fresh)
    await late.waitForSelector('[data-testid="device-invalid"]')
    await late.context().close()
    assert(old === null || old !== fresh, 'link changed')
  })

  await test('teams type the final answer on their tablet and only the host sees it', async () => {
    await host.getByTestId('seat-team-0').getByTestId('seat-reissue').click()
    await host.waitForSelector('[data-testid="seat-team-0"][data-state="waiting"]')
    await tablet.goto(await linkOf(host, 'seat-team-0'))
    await tablet.waitForSelector('[data-testid="device-team"]')
    await host.getByTestId('devices-done').click()
    await host.getByTestId('end').click()
    await host.getByTestId('end-confirm').click()
    // A classic game has no final; this one goes straight to results, so start a game with the extras on.
    await host.waitForSelector('[data-testid="results"], .crown', { timeout: 8000 }).catch(() => {})
    await host.goto(URL + 'host/')
    await host.waitForSelector('[data-testid="devices-open"]')
    await host.getByRole('button', { name: /new game/i }).click()
    await host.waitForSelector('.cat-pick')
    for (let i = 0; i < 6; i++) await host.locator('.cat-pick:not([disabled])').nth(i).click()
    for (const [i, n] of ['Falcons', 'Engineers', 'Titans'].entries()) await host.fill(`#team-${i}`, n)
    await host.getByTestId('start').click()
    await host.waitForSelector('.tile')
    await host.getByTestId('end').click()
    await host.getByTestId('end-confirm').click()
    if (await host.getByTestId('lightning-skip').count().catch(() => 0)) await host.getByTestId('lightning-skip').click()
    await host.waitForSelector('[data-testid="lightning-skip"], [data-testid="final-show"]')
    if (await host.getByTestId('lightning-skip').count()) await host.getByTestId('lightning-skip').click()
    await host.getByTestId('final-show').click()
    await tablet.waitForSelector('[data-testid="final-input"]')
    const answer = (await host.$eval('.answer.peek', (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''))).trim()
    assert(!(await tablet.content()).includes(answer), 'final answer reached the tablet')
    await tablet.getByTestId('final-input').fill('Our secret guess')
    await tablet.getByTestId('final-send').click()
    await tablet.waitForSelector('[data-testid="final-sent"]')
    await host.waitForFunction(() => document.querySelector('[data-testid="typed-count"]')?.textContent?.startsWith('1/3'))
    assert(!(await projector.content()).includes('Our secret guess'), 'typed answer on the projector')
    await host.getByTestId('final-reveal').click()
    await host.waitForSelector('[data-typed="0"]')
    assert((await host.textContent('[data-typed="0"]')).includes('Our secret guess'), 'host sees typed answer')
    assert(!host.errors.length && !tablet.errors.length && !projector.errors.length, [...host.errors, ...tablet.errors, ...projector.errors].join(' | '))
  })

  await test('audience phones: join by QR, answer once, see the result; the projector shows how the room answered', async () => {
    const h = await newPage()
    await hostIn(h)
    await startGame(h)
    await h.getByTestId('devices-open').click()
    await h.getByTestId('aud-on').check()
    await h.getByTestId('aud-join').check()
    await projector.waitForSelector('[data-testid="join-card"] [data-testid="join-qr"] svg')
    const joinText = await projector.textContent('[data-testid="join-card"]')
    assert(joinText.includes('?a=1'), 'join link on the projector: ' + joinText)
    await projector.screenshot({ path: `${SHOTS}/pi-projector-join.png` })
    const phones = []
    for (let i = 0; i < 3; i++) {
      const ph = await newPage({ width: 390, height: 844 })
      // The third phone's clock is two hours ahead of the Pi's (a Pi on an offline router often is behind): its countdown must still follow the Pi.
      if (i === 2) await ph.clock.install({ time: Date.now() + 2 * 3600_000 })
      await ph.goto(URL + '?a=1')
      await ph.waitForSelector('[data-testid="phone-wait"]')
      phones.push(ph)
    }
    await h.waitForFunction(() => document.querySelector('[data-testid="aud-joined"]')?.textContent?.startsWith('3'))
    await h.getByTestId('aud-join').uncheck()
    await projector.waitForSelector('[data-testid="join-card"]', { state: 'detached' })
    await h.getByTestId('devices-done').click()
    await h.click('[data-tile="1-2"]')
    await h.waitForSelector('.card.open')
    const answer = (await h.$eval('[data-testid="answer"]', (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''))).trim()
    for (const ph of phones) await ph.waitForSelector('[data-testid="phone-round"][data-open] .phone-choice')
    const choices = await phones[0].$$eval('.phone-choice', (els) => els.map((e) => e.textContent.trim()))
    assert(choices.length === 4 && new Set(choices).size === 4, 'four different choices: ' + choices.join(' | '))
    const right = choices.indexOf(answer)
    assert(right >= 0, `right answer among the choices (${answer}): ${choices.join(' | ')}`)
    const wrong = (right + 1) % 4
    await phones[0].click(`.phone-choice[data-choice="${right}"]`)
    await phones[1].click(`.phone-choice[data-choice="${right}"]`)
    await phones[2].click(`.phone-choice[data-choice="${wrong}"]`)
    await phones[0].waitForSelector('.phone-choice.mine')
    // A second answer from the same phone is refused by the server, not just hidden by the page.
    const roundId = await phones[2].getAttribute('[data-testid="phone-round"]', 'data-round')
    const again = await phones[2].evaluate(async (id) => { const r = await fetch('/api/aud/answer', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GG': '1' }, body: JSON.stringify({ id, choice: 0 }) }); return r.status + ' ' + (await r.json()).error }, roundId)
    assert(again === '409 already', 'second answer: ' + again)
    await projector.waitForFunction(() => document.querySelector('[data-testid="aud-count"]')?.textContent?.includes('3'))
    assert(!(await projector.content()).includes('data-testid="aud-result"'), 'result before the reveal')
    await phones[0].screenshot({ path: `${SHOTS}/pi-phone-question.png` })
    await h.getByTestId('reveal').click()
    await projector.waitForSelector('[data-testid="aud-result"] li.right')
    const head = await projector.textContent('.aud-result-head')
    assert(head.includes('67%'), 'share right: ' + head)
    await projector.screenshot({ path: `${SHOTS}/pi-projector-audience.png` })
    await phones[0].waitForFunction(() => document.querySelector('[data-testid="phone-status"]')?.textContent === 'Right!')
    await phones[2].waitForFunction(() => document.querySelector('[data-testid="phone-status"]')?.textContent === 'Not this time.')
    await phones[0].waitForFunction(() => document.querySelector('[data-testid="phone-score"]')?.textContent?.includes('1'))
    await phones[2].screenshot({ path: `${SHOTS}/pi-phone-result.png` })
    // Answering after the reveal is refused.
    const late = await phones[1].evaluate(async () => (await fetch('/api/aud/answer', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GG': '1' }, body: JSON.stringify({ id: 'x', choice: 0 }) })).status)
    assert(late === 409, 'late answer: ' + late)
    // Turning audience play off closes the phones.
    await h.click('[data-judge="0-ok"]')
    await h.getByTestId('devices-open').click()
    await h.getByTestId('aud-on').uncheck()
    await phones[0].waitForSelector('[data-testid="phone-closed"]')
    for (const ph of phones) assert(!ph.errors.length, ph.errors.join(' | '))
    for (const ph of phones) await ph.context().close()
    assert(!h.errors.length && !projector.errors.length, [...h.errors, ...projector.errors].join(' | '))
    await h.context().close()
  })

  await test('attack checks: no host access without the PIN, no cross-site posts, no file escapes', async () => {
    const r1 = await raw('/api/host/seats')
    assert(r1.status === 401, 'host api without sign-in: ' + r1.status)
    const r2 = await raw('/api/host/publish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GG': '1' }, body: JSON.stringify({ view: { screen: 'game' } }) })
    assert(r2.status === 401, 'publish without sign-in: ' + r2.status)
    const r3 = await raw('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    assert(r3.status === 403, 'post without the app header: ' + r3.status)
    const r4 = await raw('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GG': '1', Origin: 'http://evil.example' }, body: '{}' })
    assert(r4.status === 403, 'cross-site post: ' + r4.status)
    const r5 = await raw('/api/hello', { headers: { Host: 'evil.example' } })
    assert(r5.status === 421, 'foreign host name (DNS rebinding): ' + r5.status)
    for (const p of ['/../package.json', '/%2e%2e/package.json', '/..%2fpi/server.mjs', '/%2e%2e%2fpi-state/config.json']) {
      const r = await raw(p)
      const body = await r.text()
      assert(r.status >= 400 && !body.includes('scrypt') && !body.includes('"name": "get-grilled"'), `file escape ${p}: ${r.status}`)
    }
    const r6 = await raw('/api/dev/events')
    assert(r6.status === 401, 'device feed without a seat: ' + r6.status)
    const big = 'x'.repeat(10_000)
    const r7 = await raw('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GG': '1' }, body: JSON.stringify({ token: big }) })
    assert(r7.status === 413, 'oversized body: ' + r7.status)
    for (const p of ['/%2Fhost', '/%2F%2Fevil.example%2Fhost', '//host']) {
      const r = await raw(p)
      const loc = r.headers.get('location')
      assert(!loc || (loc.startsWith('/') && !loc.startsWith('//')), `redirect ${p} points away: ${loc}`)
    }
    const r8 = await raw('/', { method: 'PUT' })
    assert(r8.status === 405, 'PUT: ' + r8.status)
    const csp = (await raw('/')).headers.get('content-security-policy') || ''
    assert(csp.includes("default-src 'self'") && csp.includes("frame-ancestors 'none'"), 'security headers: ' + csp)
  })

  await test('five wrong PINs lock host sign-in from that device for five minutes', async () => {
    const post = (pin) => raw('/api/host/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GG': '1' }, body: JSON.stringify({ pin }) })
    let last
    for (let i = 0; i < 5; i++) last = await post('000000')
    assert(last.status === 401, 'fifth wrong try: ' + last.status)
    const locked = await post(PIN)
    assert(locked.status === 429, 'right PIN during the lock: ' + locked.status)
  })
} finally {
  await browser.close()
  server.kill()
}
const passed = results.filter(Boolean).length
console.log(`\n${passed}/${results.length} Pi tests passed`)
process.exit(passed === results.length ? 0 : 1)
