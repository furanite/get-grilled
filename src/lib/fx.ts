import type { ThemeId } from './types'

/** True when the system asks for less motion or the player turned on Reduce effects. */
export const reducedMotion = () =>
  (typeof document !== 'undefined' && document.documentElement.dataset.reduceFx === 'on') ||
  (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)

/**
 * Twinkle speed for each theme's background particles (radians per second, before each
 * particle's own speed factor, which is at most MAX_PARTICLE_SPEED). Kept low so that no
 * effect brightens and dims more than 3 times a second (WCAG 2.3.1).
 */
export const TWINKLE = { amethyst: 1, emerald: 1.4, ember: 5, onyx: 2, heritage: 1 }
export const MAX_PARTICLE_SPEED = 2
export const maxTwinkleHz = () => Math.max(...Object.values(TWINKLE)) * MAX_PARTICLE_SPEED / (2 * Math.PI)

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

interface P { x: number; y: number; r: number; s: number; p: number; vy: number; vx: number; life: number }
interface Trace { pts: [number, number][]; len: number; pos: number; sp: number; c: string }

/** Animated background for each theme, drawn on one full-screen canvas. */
export function startBackground(canvas: HTMLCanvasElement, getTheme: () => ThemeId) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  let W = 0, H = 0, parts: P[] = [], traces: Trace[] = [], theme: ThemeId | null = null, raf = 0, stopped = false

  const reset = () => {
    theme = getTheme()
    parts = []
    traces = []
    const n = { amethyst: 110, emerald: 80, ember: 90, onyx: 120, rivals: 6, heritage: 90, neon: 0 }[theme]
    for (let i = 0; i < n; i++) parts.push({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.6, 2.2), s: rnd(0.5, MAX_PARTICLE_SPEED), p: rnd(0, 6.28), vy: rnd(0.15, 0.6), vx: rnd(-0.2, 0.2), life: rnd(0, 1) })
    if (theme === 'neon') {
      for (let i = 0; i < 18; i++) {
        let x = rnd(-20, W * 0.2), y = rnd(0, H)
        const pts: [number, number][] = [[x, y]]
        while (x < W + 20) {
          x += rnd(60, 200); pts.push([x, y])
          if (Math.random() < 0.6) { y += rnd(-80, 80); x += rnd(20, 40); pts.push([x, y]) }
        }
        let len = 0
        for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])
        traces.push({ pts, len, pos: rnd(0, len), sp: rnd(1.5, 4), c: i % 3 ? '#2ef2ff' : '#ff3fd8' })
      }
    }
  }

  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1)
    W = innerWidth; H = innerHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    reset()
  }

  const ptAt = (tr: Trace, d: number): [number, number] => {
    for (let k = 1; k < tr.pts.length; k++) {
      const a = tr.pts[k - 1], b = tr.pts[k], l = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (d <= l) return [a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l]
      d -= l
    }
    return tr.pts[tr.pts.length - 1]
  }

  const star = (x: number, y: number, r: number, a: number, col: string) => {
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath()
    ctx.moveTo(x, y - r * 4); ctx.quadraticCurveTo(x, y, x + r * 4, y); ctx.quadraticCurveTo(x, y, x, y + r * 4)
    ctx.quadraticCurveTo(x, y, x - r * 4, y); ctx.quadraticCurveTo(x, y, x, y - r * 4); ctx.fill()
  }

  const khatam = (x: number, y: number, R: number) => {
    for (const rot of [0, Math.PI / 4]) {
      ctx.beginPath()
      for (let k = 0; k < 4; k++) {
        const a = rot + (k * Math.PI) / 2
        const px = x + R * Math.cos(a), py = y + R * Math.sin(a)
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py)
      }
      ctx.closePath(); ctx.stroke()
    }
  }

  const frame = (ms: number) => {
    if (stopped) return
    if (getTheme() !== theme) reset()
    const t = ms / 1000
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'lighter'
    switch (theme) {
      case 'amethyst':
        for (const p of parts) {
          const a = Math.pow((Math.sin(t * TWINKLE.amethyst * p.s + p.p) + 1) / 2, 3)
          if (p.r > 1.8) star(p.x, p.y, p.r * 0.9, a, '#f5cd72')
          else { ctx.globalAlpha = a * 0.8; ctx.fillStyle = p.r > 1.2 ? '#ff9fe3' : '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill() }
        }
        break
      case 'emerald':
        for (const p of parts) {
          p.y -= p.vy * 0.6; p.x += Math.sin(t + p.p) * 0.25
          if (p.y < -5) { p.y = H + 5; p.x = rnd(0, W) }
          ctx.globalAlpha = 0.25 + 0.6 * Math.pow((Math.sin(t * p.s * TWINKLE.emerald + p.p) + 1) / 2, 2)
          ctx.fillStyle = p.r > 1.6 ? '#e9c47f' : '#86f3d4'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill()
        }
        break
      case 'neon':
        ctx.lineWidth = 1
        for (const tr of traces) {
          ctx.globalAlpha = 0.13; ctx.strokeStyle = tr.c; ctx.beginPath()
          tr.pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke()
          tr.pos = (tr.pos + tr.sp) % tr.len
          for (let k = 0; k < 14; k++) {
            const [x, y] = ptAt(tr, Math.max(0, tr.pos - k * 4))
            ctx.globalAlpha = (1 - k / 14) * 0.9; ctx.fillStyle = tr.c; ctx.beginPath(); ctx.arc(x, y, k ? 1.6 : 2.6, 0, 7); ctx.fill()
          }
        }
        break
      case 'ember':
        for (const p of parts) {
          p.y -= p.vy * 1.6; p.x += p.vx + Math.sin(t * 2 + p.p) * 0.3; p.life -= 0.003
          if (p.y < -5 || p.life <= 0) { p.y = H + 5; p.x = rnd(0, W); p.life = 1 }
          const f = 0.5 + 0.5 * Math.sin(t * TWINKLE.ember * p.s + p.p)
          ctx.globalAlpha = p.life * (0.4 + 0.6 * f); ctx.fillStyle = p.r > 1.5 ? '#ffb64a' : '#ff4d6d'
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life + 0.3, 0, 7); ctx.fill()
        }
        break
      case 'onyx':
        for (const p of parts) {
          p.y += p.vy * 0.5; p.x += Math.sin(t * 0.8 + p.p) * 0.2
          if (p.y > H + 5) { p.y = -5; p.x = rnd(0, W) }
          const a = 0.15 + 0.85 * Math.pow((Math.sin(t * p.s * TWINKLE.onyx + p.p) + 1) / 2, 6)
          if (p.r > 1.9) star(p.x, p.y, p.r * 0.7, a, '#fff1c2')
          else { ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#e2b54e'; ctx.fillRect(p.x, p.y, p.r, p.r) }
        }
        break
      case 'rivals':
        parts.forEach((p, i) => {
          const red = i % 2 === 0
          const ox = red ? W * (0.1 + 0.12 * i) : W * (0.95 - 0.12 * i)
          const ang = Math.sin(t * 0.5 * p.s + p.p) * 0.5 + (red ? 0.25 : -0.25)
          const g = ctx.createLinearGradient(ox, H, ox + Math.sin(ang) * H, 0)
          const c = red ? '255,61,90' : '90,130,255'
          g.addColorStop(0, `rgba(${c},.3)`); g.addColorStop(1, `rgba(${c},0)`)
          ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath()
          ctx.moveTo(ox - 6, H); ctx.lineTo(ox + Math.sin(ang) * H * 1.2 - 90, -20); ctx.lineTo(ox + Math.sin(ang) * H * 1.2 + 90, -20); ctx.lineTo(ox + 6, H); ctx.fill()
        })
        break
      case 'heritage': {
        ctx.globalCompositeOperation = 'source-over'
        const S = 96, R = S * 0.36, wave = ((t * 160) % (W + H + 800)) - 400
        ctx.lineWidth = 1; ctx.globalAlpha = 1
        for (let y = 0; y <= H + S; y += S) for (let x = 0; x <= W + S; x += S) {
          for (const [cx, cy, rr] of [[x, y, R], [x + S / 2, y + S / 2, R * 0.55]]) {
            const d = cx + cy - wave
            ctx.strokeStyle = `rgba(229,185,94,${0.05 + 0.45 * Math.exp(-(d * d) / (2 * 140 * 140))})`
            khatam(cx, cy, rr)
          }
          const d = x + S / 2 + y - wave
          ctx.strokeStyle = `rgba(229,185,94,${0.04 + 0.28 * Math.exp(-(d * d) / (2 * 140 * 140))})`
          ctx.beginPath(); ctx.moveTo(x + R, y); ctx.lineTo(x + S - R, y); ctx.moveTo(x, y + R); ctx.lineTo(x, y + S - R); ctx.stroke()
        }
        for (const p of parts) {
          const a = Math.pow((Math.sin(t * TWINKLE.heritage * p.s + p.p) + 1) / 2, 4)
          ctx.fillStyle = `rgba(255,240,200,${a * 0.9})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.8, 0, 7); ctx.fill()
        }
        break
      }
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    if (!reducedMotion()) raf = requestAnimationFrame(frame)
  }

  size()
  addEventListener('resize', size)
  raf = requestAnimationFrame(frame)
  return () => { stopped = true; cancelAnimationFrame(raf); removeEventListener('resize', size) }
}

/** A burst of star sparks at a screen point, coloured from the current theme. */
export function burst(x: number, y: number, n = 20, dist = 140) {
  if (reducedMotion()) return
  const cs = getComputedStyle(document.documentElement)
  const cols = [cs.getPropertyValue('--accent').trim(), cs.getPropertyValue('--accent2').trim(), '#ffffff']
  for (let k = 0; k < n; k++) {
    const s = document.createElement('span')
    s.className = 'spark'
    const sz = 6 + Math.random() * 10, c = cols[k % 3]
    s.style.cssText = `left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;background:${c};filter:drop-shadow(0 0 6px ${c})`
    document.body.appendChild(s)
    const a = Math.random() * Math.PI * 2, d = dist * (0.4 + Math.random() * 0.8)
    const anim = s.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0) rotate(0)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d}px)) scale(1) rotate(${Math.random() * 180}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px),calc(-50% + ${Math.sin(a) * d * 1.2 + 30}px)) scale(0) rotate(240deg)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
    anim.onfinish = () => s.remove()
  }
}

export function burstAt(el: Element | null, n?: number, dist?: number) {
  if (!el) return
  const r = el.getBoundingClientRect()
  burst(r.left + r.width / 2, r.top + r.height / 2, n, dist)
}
