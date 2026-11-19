/* Get Grilled offline copy. Written into the build by vite.config.ts (offlinePlugin); do not edit the built file.
 * Install: stores the app, fonts, sounds and question packs. Pictures are stored the first time they are shown.
 * Pages and question packs come from the network when it is there (so fixes reach everyone) and from the
 * stored copy when it isn't. Everything else is served from the stored copy first. */
const VERSION = '__VERSION__'
const FILES = __FILES__
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
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gg-' + SCOPE + '-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(async () => {
        complete = true
        for (const c of await self.clients.matchAll()) c.postMessage({ type: 'gg-cached' })
      }),
  )
})

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'gg-status' && e.source) {
    caches.open(CACHE).then(async (c) => {
      const have = (await c.keys()).length
      if (complete || have >= FILES.length * 0.9) e.source.postMessage({ type: 'gg-cached' })
    })
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
