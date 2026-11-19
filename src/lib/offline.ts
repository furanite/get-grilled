import { useEffect, useState } from 'react'

/**
 * Works offline: once the page has loaded over the internet, a service worker (public/sw.js, with the list of
 * files written at build time) keeps a copy of the app, its question packs, pictures and sounds, so the game
 * still opens and plays if the venue's Wi-Fi drops. Only on https or localhost (the Pi's plain-http network
 * doesn't need it: the Pi is the server). Returns whether the copy is ready.
 */
export function useOffline(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !isSecureContext || import.meta.env.DEV) return
    // On the Pi the server is in the room; caching there would only make updates slower to show.
    // (?sw=1 turns it on for a local test copy.)
    if (location.protocol !== 'https:' && !new URLSearchParams(location.search).has('sw')) return
    let stop = false
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'gg-cached' && !stop) setReady(true)
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then(async (reg) => {
        await navigator.serviceWorker.ready
        // Ask the worker whether everything is stored (it fills the cache when it installs).
        ;(reg.active ?? reg.waiting ?? reg.installing)?.postMessage({ type: 'gg-status' })
      })
      .catch(() => {})
    return () => {
      stop = true
      navigator.serviceWorker.removeEventListener('message', onMsg)
    }
  }, [])
  return ready
}

/** Keeps the screen on while `on` (and the big-screen window too, when it is open). Browsers without it just carry on. */
export function useWakeLock(on: boolean, extra?: Window | null) {
  useEffect(() => {
    if (!on) return
    type Lock = { release: () => Promise<void> }
    type Nav = Navigator & { wakeLock?: { request: (k: 'screen') => Promise<Lock> } }
    const wins = [window, ...(extra && !extra.closed ? [extra] : [])]
    const locks = new Map<Window, Lock>()
    const grab = (w: Window) => {
      const nav = w.navigator as Nav
      if (!nav.wakeLock || w.document.visibilityState !== 'visible' || locks.has(w)) return
      nav.wakeLock
        .request('screen')
        .then((l) => {
          locks.set(w, l)
          ;(l as unknown as EventTarget).addEventListener?.('release', () => locks.delete(w))
        })
        .catch(() => {})
    }
    const onVis = () => wins.forEach(grab)
    wins.forEach((w) => {
      grab(w)
      w.document.addEventListener('visibilitychange', onVis)
    })
    return () => {
      wins.forEach((w) => w.document.removeEventListener('visibilitychange', onVis))
      locks.forEach((l) => l.release().catch(() => {}))
      locks.clear()
    }
  }, [on, extra])
}
