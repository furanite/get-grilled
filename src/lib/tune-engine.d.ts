/** Where the app keeps its recorded notes (public/sounds/). */
export function setSoundBase(base: string): void
/** The title piece for a theme: 'a' | 'b' | 'd' are the Tune Room sets, 'e' is the no-music Heritage piece, 'g' is Black & Gold's darker noir. */
export function renderTitle(theme: string, set: 'a' | 'b' | 'd' | 'e' | 'g'): Promise<AudioBuffer>
/** The theme's winner music for the results screen. */
export function renderWin(theme: string): Promise<AudioBuffer>
/** The theme's suspense clock (four bars, loopable) or its roll and crash. */
export function renderSuspense(theme: string, kind: 'clock' | 'roll'): Promise<AudioBuffer>
/** How long the drum roll runs before the crash (the crash lands this long after the piece's 0.08s lead-in). */
export const ROLL_SECONDS: number
/** One team's introduction cue (about 7 seconds), timed to the animation. team 0-3 picks that team's own version. */
export function renderIntro(theme: string, team?: number, members?: number): Promise<AudioBuffer>
/** The picked buzzer for time up, or the soft drop for a wrong answer. */
export function renderFx(kind: 'timeUp' | 'wrong'): Promise<AudioBuffer>
