/* Get Grilled offline copy. Written into the build by vite.config.ts (offlinePlugin); do not edit the built file.
 * Install: stores the app, fonts and sounds. A question pack is stored the first time it is used, and all of
 * them when the page asks (the host's "store every category" button). Pictures are stored the first time they are shown.
 * Pages and question packs come from the network when it is there (so fixes reach everyone) and from the
 * stored copy when it isn't. Everything else is served from the stored copy first. */
const VERSION = '__VERSION__'
const FILES = __FILES__
const PACKS = __PACKS__
const SCOPE = self.registration.scope
const CACHE = 'gg-' + SCOPE + '-' + VERSION
const RUNTIME = 'gg-rt-' + SCOPE
let complete = false

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(FILES.map((f) => fetch(new Request(f, { cache: 'reload' })).then((r) => (r.ok ? c.put(f, r) : null)).catch(() => null))))
      .then(() => {
        complete = true
        return self.skipWaiting()
      }),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then(async (keys) => {
        const old = keys.filter((k) => k.startsWith('gg-' + SCOPE + '-') && k !== CACHE)
        // Question packs stored by an earlier version are carried over, so an update never takes away
        // a category that was ready to play offline. (Online, a fresher copy replaces it when it is next used.)
        const now = await caches.open(CACHE)
        for (const k of old) {
          const was = await caches.open(k)
          for (const req of await was.keys()) {
            if (!/\/packs\/[^/]+\.json$/.test(new URL(req.url).pathname) || (await now.match(req))) continue
            const r = await was.match(req)
            if (r) await now.put(req, r)
          }
        }
        return Promise.all(old.map((k) => caches.delete(k)))
      })
      .then(() => self.clients.claim())
      .then(async () => {
        complete = true
        for (const c of await self.clients.matchAll()) c.postMessage({ type: 'gg-cached' })
      }),
  )
})

/** How many question packs are stored, out of how many there are. */
async function packCount(c) {
  const have = new Set((await c.keys()).map((r) => r.url))
  return { have: PACKS.filter((f) => have.has(new URL(f, SCOPE).href)).length, total: PACKS.length }
}

self.addEventListener('message', (e) => {
  const type = e.data && e.data.type
  const to = e.source
  if (!to) return
  if (type === 'gg-status') {
    caches.open(CACHE).then(async (c) => {
      const have = (await c.keys()).length
      if (complete || have >= FILES.length * 0.9) to.postMessage({ type: 'gg-cached', packs: await packCount(c) })
    })
  }
  // The host's "store every category" button: fetch the packs not stored yet, a few at a time.
  if (type === 'gg-all') {
    e.waitUntil(
      caches.open(CACHE).then(async (c) => {
        const stored = new Set((await c.keys()).map((r) => r.url))
        const todo = PACKS.map((f) => new URL(f, SCOPE).href).filter((u) => !stored.has(u))
        let failed = 0
        const next = async () => {
          for (let u = todo.shift(); u; u = todo.shift()) {
            try {
              const r = await fetch(new Request(u, { cache: 'reload' }))
              if (r.ok) await c.put(u, r)
              else failed++
            } catch {
              failed++
            }
            to.postMessage({ type: 'gg-packs', packs: await packCount(c) })
          }
        }
        await Promise.all([next(), next(), next(), next()])
        to.postMessage({ type: 'gg-packs', packs: await packCount(c), done: true, failed })
      }),
    )
  }
})

const fresh = /\/(index\.html|packs\/[^/]+\.json|version\.json)$|\/$/

async function networkFirst(req, key) {
  try {
    const r = await fetch(req)
    if (r.ok) {
      const c = await caches.open(CACHE)
      c.put(key, r.clone())
    }
    return r
  } catch (err) {
    const hit = (await caches.match(key, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true }))
    if (hit) return hit
    throw err
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: true })
  if (hit) return hit
  const r = await fetch(req)
  if (r.ok && r.type === 'basic') {
    const c = await caches.open(RUNTIME)
    c.put(req, r.clone())
  }
  return r
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin || !url.href.startsWith(SCOPE) || url.pathname.includes('/api/')) return
  // Leave the host edition (its own folder, with its own copy) to itself.
  if (url.href.slice(SCOPE.length).startsWith('host/')) return
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, new URL('index.html', SCOPE).href))
    return
  }
  e.respondWith(fresh.test(url.pathname) ? networkFirst(req, url.href.split('?')[0]) : cacheFirst(req))
})
