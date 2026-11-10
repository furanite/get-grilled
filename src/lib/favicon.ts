import type { ThemeId } from './types'

/** Colours for the tab icon (a flame over two grill bars), one set per theme. */
type Ico = { bg: string; f: [string, string, string]; core: string; bars: [string, string]; rx: number; ring?: string; across?: boolean }

export const ICONS: Record<ThemeId, Ico> = {
  amethyst: { bg: '#1b0e33', f: ['#a23cff', '#ff9fe3', '#f5cd72'], core: '#fff3e0', bars: ['#f5cd72', '#f5cd72'], rx: 14 },
  emerald: { bg: '#03251e', f: ['#159a7a', '#86f3d4', '#e9c47f'], core: '#fff7e0', bars: ['#e9c47f', '#e9c47f'], rx: 18 },
  neon: { bg: '#060722', f: ['#ff2bd6', '#a24dff', '#2ef2ff'], core: '#eafcff', bars: ['#2ef2ff', '#ff3fd8'], rx: 6 },
  onyx: { bg: '#0b0906', f: ['#a87a22', '#e2b54e', '#fff1c2'], core: '#fffaf0', bars: ['#f2cd6b', '#f2cd6b'], rx: 4, ring: '#c9a14a' },
  rivals: { bg: '#07081a', f: ['#ff3d5a', '#b04dff', '#5a7bff'], core: '#f4f7ff', bars: ['#ff3d5a', '#5a7bff'], rx: 12, across: true },
  ember: { bg: '#1a0507', f: ['#ff4d1a', '#ff9a1f', '#ffd24a'], core: '#fff3c4', bars: ['#ffb64a', '#ffb64a'], rx: 12 },
  heritage: { bg: '#0b1030', f: ['#0f7a7f', '#e5b95e', '#fff0c8'], core: '#fffaf0', bars: ['#e5b95e', '#2aa3a6'], rx: 10, ring: '#e5b95e' },
}

export function faviconSvg(theme: ThemeId): string {
  const c = ICONS[theme] ?? ICONS.amethyst
  const grad = c.across ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="1" x2="0" y2="0"'
  const ring = c.ring ? `<rect x="2.5" y="2.5" width="59" height="59" rx="${Math.max(c.rx - 2, 2)}" fill="none" stroke="${c.ring}" stroke-width="2"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="gg-${theme}" ${grad}><stop offset="0" stop-color="${c.f[0]}"/><stop offset=".55" stop-color="${c.f[1]}"/><stop offset="1" stop-color="${c.f[2]}"/></linearGradient></defs>` +
    `<rect width="64" height="64" rx="${c.rx}" fill="${c.bg}"/>${ring}` +
    `<path fill="url(#gg-${theme})" d="M32 6c3 8 13 13 13 25 0 4-1.6 7.4-4 9.6H23c-2.4-2.2-4-5.6-4-9.6 0-6 3.6-9.4 6.6-12.6.6 3.4 2 5.6 4.4 6.6C29 18 30 12 32 6z"/>` +
    `<path fill="${c.core}" d="M32 24c2 4 6 6.5 6 11.5 0 2-.7 3.8-1.9 5.1h-8.2c-1.2-1.3-1.9-3.1-1.9-5.1 0-3.4 2.5-5 4-7 .4 1.4 1 2.2 1.9 2.6-.5-2.8-.4-5 .1-7.1z"/>` +
    `<rect x="10" y="43" width="44" height="5" rx="2.5" fill="${c.bars[0]}"/><rect x="13" y="51.5" width="38" height="4.5" rx="2.25" fill="${c.bars[1]}"/></svg>`
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
