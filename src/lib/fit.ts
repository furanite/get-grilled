import { useLayoutEffect, type DependencyList, type RefObject } from 'react'

/**
 * Shrinks the text inside `box` until nothing spills out of it: sets the CSS variable --fit
 * (1 = full size, down to `min`) which the stylesheet multiplies into the font sizes inside.
 * Re-fits when the box or the window changes size, when the window is shown, and once fonts have loaded.
 * Works in the audience window too, which is another window with its own ResizeObserver.
 */
export function useFitText(box: RefObject<HTMLElement | null>, deps: DependencyList, min = 0.45) {
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const doc = el.ownerDocument
    const win = doc.defaultView ?? window
    // The box itself, and the question and answer inside it (a question may overflow its own space
    // while the card still looks the right size). Tall letters and accents poke a little past their
    // line, so only more than a third of a letter counts.
    const spills = (e: Element) => {
      const slack = Math.max(2, parseFloat(win.getComputedStyle(e).fontSize) * 0.33)
      return e.scrollHeight > e.clientHeight + slack || e.scrollWidth > e.clientWidth + slack
    }
    const over = () => spills(el) || [...el.querySelectorAll('.q, .answer')].some(spills)
    const set = (v: number) => el.style.setProperty('--fit', String(Math.round(v * 1000) / 1000))
    const probe = el.querySelector('.q, .answer')
    const size = () => (probe ? parseFloat(win.getComputedStyle(probe).fontSize) : 0)
    let timer = 0

    const fit = () => {
      win.clearTimeout(timer)
      // A window in the background may not lay itself out; fit once it is shown.
      if (doc.hidden) return
      set(min)
      const small = size()
      set(1)
      if (!probe || size() !== small) {
        // The browser lays out at once when asked: find the size in one go.
        if (!over()) return
        let lo = min
        let hi = 1
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) / 2
          set(mid)
          if (over()) hi = mid
          else lo = mid
        }
        set(lo)
        return
      }
      // Some browsers only lay a second window out on its next frame: take one step per frame.
      let lo = min
      let hi = 1
      let cur = 1
      let n = 0
      const step = () => {
        const o = over()
        if (n === 0 && !o) return
        if (o) hi = cur
        else lo = cur
        if (++n > 7) return set(lo)
        cur = (lo + hi) / 2
        set(cur)
        timer = win.setTimeout(step, 120)
      }
      timer = win.setTimeout(step, 120)
    }

    fit()
    // A short timer rather than an animation frame: frames pause while a window is in the background.
    let wait = 0
    const later = () => {
      win.clearTimeout(wait)
      wait = win.setTimeout(fit, 60)
    }
    const ro = new win.ResizeObserver(later)
    ro.observe(el)
    win.addEventListener('resize', later)
    doc.addEventListener('visibilitychange', later)
    doc.fonts?.ready.then(later).catch(() => {})
    return () => {
      ro.disconnect()
      win.removeEventListener('resize', later)
      doc.removeEventListener('visibilitychange', later)
      win.clearTimeout(wait)
      win.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
