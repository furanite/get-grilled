import type { Clock } from '../components/Timer'
/** The host edition adds a second window for the audience. It is built with `vite build --mode host`. */
export const HOST_EDITION = import.meta.env.VITE_EDITION === 'host'

/** What the audience screen needs to know about the clue the host has open. */
export interface Live {
  c: number
  l: number
  revealed: boolean
  /** The clue's countdown, so the projector shows the same sliding timer as the host. */
  clock?: Clock | null
}
