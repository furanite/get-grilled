/** Where the app keeps its recorded notes (public/sounds/). */
export function setSoundBase(base: string): void
/** The title piece for a theme: 'a' | 'b' | 'd' are the Tune Room sets, 'e' is the no-music Heritage piece. */
export function renderTitle(theme: string, set: 'a' | 'b' | 'd' | 'e'): Promise<AudioBuffer>
/** The theme's suspense clock (four bars, loopable) or its roll and crash. */
export function renderSuspense(theme: string, kind: 'clock' | 'roll'): Promise<AudioBuffer>
/** How long the drum roll runs before the crash (the crash lands this long after the piece's 0.08s lead-in). */
export const ROLL_SECONDS: number
