import { useCallback, useEffect, useState } from 'react'

/** How much of the game is stored on this device for playing without internet. */
export interface OfflineState {
  /** The app itself is stored: the page opens without internet */
  ready: boolean
  /** Question packs stored, out of how many there are (a pack is stored the first time it is used) */
  packs: { have: number; total: number } | null
  /** Storing every pack is under way */
  busy: boolean
  /** Some packs could not be fetched on the last try */
  failed: boolean
  /** Stores every question pack now, for a host who will play without internet */
  storeAll: () => void
}

/**
 * Works offline: once the page has loaded over the internet, a service worker (sw.js, with the list of
 * files written at build time) keeps a copy of the app and its sounds, so the game still opens if the
 * venue's Wi-Fi drops. Each question pack is stored the first time it is used, and the host can store all
 * of them with one button; pictures are stored when first shown. Only on https or localhost (the Pi's
 * plain-http network doesn't need it: the Pi is the server).
 */
export function useOffline(): OfflineState {
  const [ready, setReady] = useState(false)
  const [packs, setPacks] = useState<OfflineState['packs']>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !isSecureContext || import.meta.env.DEV) return
    // On the Pi the server is in the room; caching there would only make updates slower to show.
    // (?sw=1 turns it on for a local test copy.)
    if (location.protocol !== 'https:' && !new URLSearchParams(location.search).has('sw')) return
    let stop = false
    const onMsg = (e: MessageEvent) => {
      if (stop) return
      const d = e.data as { type?: string; packs?: { have: number; total: number }; done?: boolean; failed?: number } | null
      if (d?.type !== 'gg-cached' && d?.type !== 'gg-packs') return
      if (d.type === 'gg-cached') setReady(true)
      if (d.packs && typeof d.packs.have === 'number' && typeof d.packs.total === 'number') setPacks(d.packs)
      if (d.done) {
        setBusy(false)
        setFailed(!!d.failed)
      }
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then(async (reg) => {
        await navigator.serviceWorker.ready
        // Ask the worker what is stored (it fills the cache when it installs).
        ;(reg.active ?? reg.waiting ?? reg.installing)?.postMessage({ type: 'gg-status' })
      })
      .catch(() => {})
    return () => {
      stop = true
      navigator.serviceWorker.removeEventListener('message', onMsg)
    }
  }, [])
  const storeAll = useCallback(() => {
    const sw = navigator.serviceWorker?.controller
    if (!sw) return
    setBusy(true)
    setFailed(false)
    sw.postMessage({ type: 'gg-all' })
  }, [])
  return { ready, packs, busy, failed, storeAll }
}

/** Asks the worker for a fresh count of what is stored (the answer arrives through useOffline). */
export const refreshOffline = () => navigator.serviceWorker?.controller?.postMessage({ type: 'gg-status' })

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
