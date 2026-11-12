import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '../lib/types'
import { num } from '../lib/i18n'

/** When the clue's countdown started (epoch ms), how long it runs, and when the host stopped it, if they did. */
export interface Clock {
  start: number
  total: number
  stoppedAt?: number
}

interface Props {
  clock: Clock | null
  total: number
  lang: Lang
  timeUpText: string
  /** Called once per whole second in the last five seconds, and once when time runs out. */
  onTick?: (secsLeft: number) => void
  big?: boolean
}

const LOW = 5

/**
 * A bar that drains from full to empty with the seconds left beside it.
 * The bar itself is a CSS animation, so it keeps sliding smoothly even when the window
 * that shows it (the projector) is not the one in focus. The number is updated four times a second.
 */
export function TimerBar({ clock, total, lang, timeUpText, onTick, big }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => Date.now())
  const tickRef = useRef(onTick)
  tickRef.current = onTick
  const lastSec = useRef<number | null>(null)

  const running = !!clock && clock.stoppedAt === undefined
  useEffect(() => {
    if (!running) return
    const win = ref.current?.ownerDocument.defaultView ?? window
    const id = win.setInterval(() => setNow(Date.now()), 250)
    return () => win.clearInterval(id)
  }, [running])

  const end = clock ? clock.stoppedAt ?? now : 0
  const elapsed = clock ? Math.max(0, (end - clock.start) / 1000) : 0
  const left = Math.max(0, total - elapsed)
  const secs = Math.ceil(left - 0.001)
  const frac = clock ? left / total : 1
  const out = !!clock && left <= 0
  const low = !!clock && !out && secs <= LOW

  useEffect(() => {
    if (!running || lastSec.current === secs) return
    lastSec.current = secs
    if (secs <= LOW) tickRef.current?.(secs)
  }, [secs, running])

  // Fixed when the bar (re)mounts; the animation carries on from there by itself.
  const offset = useMemo(() => (clock ? Math.max(0, (Date.now() - clock.start) / 1000) : 0), [clock?.start, clock?.stoppedAt]) // eslint-disable-line react-hooks/exhaustive-deps
  const barStyle: React.CSSProperties = running
    ? { animation: `drain ${total}s linear ${-offset}s forwards` }
    : { transform: `scaleX(${frac})` }

  return (
    <div ref={ref} className={`timer${low ? ' low' : ''}${out ? ' out' : ''}${big ? ' big' : ''}`} role="timer" aria-live="off" data-testid="timer" data-left={secs}>
      <div className="track">
        {/* key restarts the CSS animation when the clock starts or is stopped */}
        <i key={`${clock?.start ?? 0}-${clock?.stoppedAt ?? ''}`} style={barStyle} />
      </div>
      <span className="secs" data-testid="timer-secs">
        {out ? timeUpText : num(secs, lang)}
      </span>
    </div>
  )
}

/** Minutes and seconds left in the whole game, for the board and the projector. */
export function GameClock({ endsAt, lang, leftText, overText }: { endsAt: number; lang: Lang; leftText: string; overText: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [now, setNow] = useState(() => Date.now())
  const over = now >= endsAt
  useEffect(() => {
    if (over) return
    const win = ref.current?.ownerDocument.defaultView ?? window
    const id = win.setInterval(() => setNow(Date.now()), 500)
    return () => win.clearInterval(id)
  }, [over])
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')
  return (
    <span ref={ref} className={`game-clock${left <= 60 ? ' low' : ''}${over ? ' out' : ''}`} role="timer" data-testid="game-clock">
      <span aria-hidden="true">⏱</span> {over ? overText : `${num(mm, lang)}:${num(+ss[0], lang)}${num(+ss[1], lang)} ${leftText}`}
    </span>
  )
}
