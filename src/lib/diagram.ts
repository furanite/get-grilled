/** Pictures and diagrams attached to questions. */

/** Largest stored picture (characters of its data: URL). Keeps a category of diagrams within browser storage. */
export const MAX_DIAGRAM = 400_000

const DATA_URL = /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/]+=*$/
/** Built-in packs point at files shipped with the app, such as "packs/img/and-gate.svg". */
const PACK_PATH = /^packs\/img\/[a-z0-9-]+\.(svg|png|webp|jpg)$/

/** True for a picture the app will show: a base64 image data: URL within the size limit, or a built-in pack picture. */
export function isDiagram(v: unknown): v is string {
  return typeof v === 'string' && ((v.length <= MAX_DIAGRAM && DATA_URL.test(v)) || PACK_PATH.test(v))
}

/** The address to put in <img src>. Built-in pictures are relative to the app. */
export function diagramSrc(img: string) {
  return img.startsWith('data:') ? img : `${import.meta.env.BASE_URL}${img}`
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('bad image'))
    img.src = src
  })
}

/**
 * Turns a chosen or pasted picture into a small data: URL.
 * Small SVGs are kept as they are (they stay sharp at any size). Everything else is redrawn
 * at most 1000 pixels across and saved as WebP, or JPEG where WebP isn't available.
 * Throws if the file isn't a usable picture.
 */
export async function fileToDiagram(file: Blob): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif|svg\+xml|bmp)$/.test(file.type)) throw new Error('not an image')
  const original = await readAsDataUrl(file)
  if (file.type === 'image/svg+xml' && original.length <= 150_000 && isDiagram(original)) return original
  const img = await loadImage(original)
  const w0 = img.naturalWidth || 800
  const h0 = img.naturalHeight || 600
  for (const max of [1000, 800, 600, 420]) {
    const k = Math.min(1, max / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * k))
    const h = Math.max(1, Math.round(h0 * k))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const g = canvas.getContext('2d')
    if (!g) throw new Error('no canvas')
    // Diagrams are often black lines on a see-through background: give them a white page.
    g.fillStyle = '#fff'
    g.fillRect(0, 0, w, h)
    g.drawImage(img, 0, 0, w, h)
    let url = canvas.toDataURL('image/webp', 0.82)
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', 0.85)
    if (url.length <= 160_000 && isDiagram(url)) return url
  }
  throw new Error('too big')
}
