import { useMemo } from 'react'
import type { ThemeId } from '../lib/types'
import { markSvg } from '../lib/marks'
import { catIconSvg } from '../lib/caticons'
import { ambient, flourishAbove, flourishBelow } from '../lib/flourish'
import { catIconSvg as islamicIconSvg } from '../lib/islamic'

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

/** A category's icon. Colours follow the current theme through CSS. */
// Islamic and Kids categories keep their own line icons; every other category uses the themed icon set.
export function CatIcon({ id, className = 'ci' }: { id: string; className?: string }) {
  const isl = useMemo(() => islamicIconSvg(id), [id])
  const html = useMemo(() => isl || catIconSvg(id), [id, isl])
  return <span className={isl ? `${className} cat-icon` : className} data-ci={id} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
}
