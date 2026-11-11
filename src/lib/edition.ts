/** The host edition adds a second window for the audience. It is built with `vite build --mode host`. */
export const HOST_EDITION = import.meta.env.VITE_EDITION === 'host'

/** The Islamic look (Munaafasatul Ilm): Islamic logo marks, ornaments, theme names and the Garden theme. */
export const ISLAMIC_SET = import.meta.env.VITE_THEMESET === 'islamic'

/** The app's name. The Islamic site (Munaafasatul Ilm) sets VITE_APP_NAME and VITE_APP_NAME_AR in `npm run build:islamic`. */
export const APP_NAME: string = import.meta.env.VITE_APP_NAME || 'Get Grilled'
export const APP_NAME_AR: string = import.meta.env.VITE_APP_NAME_AR || APP_NAME
/** True when the app has its own Arabic name (then the logo shows it, not the Get Grilled tagline). */
export const HAS_AR_NAME = APP_NAME_AR !== APP_NAME
export const appName = (lang: 'en' | 'ar') => (lang === 'ar' ? APP_NAME_AR : APP_NAME)

/** What the audience screen needs to know about the clue the host has open. */
export interface Live {
  c: number
  l: number
  revealed: boolean
}
