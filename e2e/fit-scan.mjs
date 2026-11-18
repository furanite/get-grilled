// Shared by fit.mjs and fit-host.mjs.
// Runs in the page: finds text that is outside the box that holds it, or outside the screen.
export function scan() {
  const out = []
  const de = document.documentElement
  const vw = de.clientWidth
  if (de.scrollWidth > vw + 1) out.push({ kind: 'page scrolls sideways', by: de.scrollWidth - vw, where: 'html' })
  const path = (el) => {
    const parts = []
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      const tid = e.getAttribute('data-testid')
      parts.unshift(e.tagName.toLowerCase() + (tid ? `[${tid}]` : '') + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : ''))
    }
    return parts.join(' > ')
  }
  const visible = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false
      if (e.getAttribute('aria-hidden') === 'true') return false
    }
    return true
  }
  // The nearest ancestor that draws a box (background, border, or clipping) is what the text must stay inside.
  const boxOf = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e)
      const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible'
      // Shiny gradient lettering paints its background inside the letters only; it is not a box.
      if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') continue
      const drawn = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' || parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderTopWidth) > 0
      if (clips || drawn) return { e, cs, clips }
    }
    return null
  }
  // Boxes laid out side by side (grid and flex items) must not run into each other.
  for (const box of document.body.querySelectorAll('*')) {
    const d = getComputedStyle(box).display
    if (!/grid|flex/.test(d) || box.children.length < 2 || box.children.length > 80 || !visible(box)) continue
    const kids = [...box.children].filter((k) => { const cs = getComputedStyle(k); return !['absolute', 'fixed', 'sticky'].includes(cs.position) && cs.display !== 'none' && visible(k) }).map((k) => [k, k.getBoundingClientRect()]).filter(([, r]) => r.width > 2 && r.height > 2)
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i][1], b = kids[j][1]
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (ox > 4 && oy > 4) { out.push({ kind: 'boxes overlap', by: Math.round(Math.min(ox, oy)), where: path(kids[i][0]) + ' / ' + path(kids[j][0]).split(' > ').pop() }); i = kids.length; break }
    }
  }
  const seen = new Set()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue
    const el = n.parentElement
    if (!el || seen.has(el) || !visible(el)) continue
    const r0 = el.getBoundingClientRect()
    if (r0.width <= 2 || r0.height <= 2) continue // screen-reader-only text
    range.selectNodeContents(n)
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
    if (!rects.length) continue
    const t = {
      left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)),
      top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)),
    }
    const text = n.textContent.trim().slice(0, 50)
    // Text cut short with "…" on purpose is fine.
    if (getComputedStyle(el).textOverflow === 'ellipsis') continue
    if (t.right > vw + 1 || t.left < -1) {
      // Text inside a sideways scroller is fine only if the scroller itself is on screen.
      let sc = null
      for (let e = el; e && e !== document.body; e = e.parentElement) { const ox = getComputedStyle(e).overflowX; if (ox === 'auto' || ox === 'scroll') { sc = e; break } }
      if (!sc) { seen.add(el); out.push({ kind: 'off screen', by: Math.round(Math.max(t.right - vw, -t.left)), where: path(el), text }); continue }
    }
    const b = boxOf(el)
    if (!b) continue
    const br = b.e.getBoundingClientRect()
    // A box that scrolls on purpose (lists, the legal text) may hold more than it shows.
    if (b.clips && (b.cs.overflowY === 'auto' || b.cs.overflowY === 'scroll') && t.left >= br.left - 2 && t.right <= br.right + 2) continue
    if (b.clips && (b.cs.overflowX === 'auto' || b.cs.overflowX === 'scroll')) continue
    const by = Math.max(br.left - t.left, t.right - br.right, br.top - t.top, t.bottom - br.bottom)
    // Tall display fonts poke a little past their line box (more so in big sizes); that is not a spill.
    if (by > Math.max(3, parseFloat(getComputedStyle(el).fontSize) * 0.15)) {
      seen.add(el)
      out.push({ kind: b.clips ? 'cut off' : 'spills out', by: Math.round(by), where: path(el), box: path(b.e), text })
    }
  }
  return out
}

