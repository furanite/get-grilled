import credits from '../../questions/img/credits.json'

/** The credit line for a built-in photo (author, licence, Wikimedia Commons), or nothing for drawings and host pictures. */
export function photoCredit(img?: string): string | undefined {
  if (!img || !img.startsWith('packs/img/')) return undefined
  return (credits as Record<string, string>)[img.slice('packs/img/'.length)]
}
