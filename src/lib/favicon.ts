import type { ThemeId } from './types'
import { MARKS, markSvg } from './marks'

export const ICONS = MARKS

/** The tab icon for a theme: the theme's mark on its app-icon tile. */
export function faviconSvg(theme: ThemeId): string {
  return markSvg(theme, { tile: true, id: `gg-${theme}-` })
}

/** Point the tab icon of `doc` at the icon for `theme`. */
export function setFavicon(doc: Document, theme: ThemeId): void {
  let link = doc.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]')
  if (!link) {
    link = doc.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    doc.head.appendChild(link)
  }
  const href = 'data:image/svg+xml,' + encodeURIComponent(faviconSvg(theme))
  if (link.getAttribute('href') !== href) link.setAttribute('href', href)
}
