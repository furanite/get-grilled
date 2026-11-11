import { useMemo } from 'react'
import type { ThemeId } from '../lib/types'
import { markSvg } from '../lib/marks'
import { ambient, flourishAbove, flourishBelow } from '../lib/flourish'

// The markup comes from fixed strings in lib/marks.ts and lib/flourish.ts, never from user input.

export function Mark({ theme, tile = false, className = 'mark' }: { theme: ThemeId; tile?: boolean; className?: string }) {
  const html = useMemo(() => markSvg(theme, { tile }), [theme, tile])
  return <span className={className} data-mark={theme} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
}

export function FlourishAbove({ theme }: { theme: ThemeId }) {
  const html = useMemo(() => flourishAbove(theme), [theme])
  return html ? <span className="fl-wrap above" key={theme} dangerouslySetInnerHTML={{ __html: html }} /> : null
}

export function Flourish({ theme }: { theme: ThemeId }) {
  const html = useMemo(() => flourishBelow(theme), [theme])
  return <span className="fl-wrap" key={theme} data-flourish={theme} dangerouslySetInnerHTML={{ __html: html }} />
}

export function Ambient({ theme }: { theme: ThemeId }) {
  const html = useMemo(() => ambient(theme), [theme])
  return <span className="amb-wrap" key={theme} dangerouslySetInnerHTML={{ __html: html }} />
}
