export const VALUES = [100, 200, 300, 400, 500] as const
export const LEVEL_NAMES = ['Warm-up', 'Easy', 'Medium', 'Hard', 'Expert'] as const
export const LEVEL_NAMES_AR = ['تمهيدي', 'سهل', 'متوسط', 'صعب', 'خبير'] as const

export interface Question {
  id: string
  q: string
  a: string
  qAr?: string
  aAr?: string
  /** A picture or diagram shown with the clue: a data: URL for host-made questions, or a path for built-in ones. */
  img?: string
  /** Seconds for this question only, overriding the game's setting. */
  secs?: number
}

/**
 * The host's changes to one category's question pool, kept apart from the questions themselves
 * so built-in categories can be changed too: questions taken out of play, and questions added.
 * Both lists are per level (100 to 500).
 */
export interface PoolEdit {
  off: string[][]
  extra: Question[][]
}

/** A category holds five pools of questions, one per difficulty (100 to 500). */
export interface Category {
  id: string
  name: string
  nameAr?: string
  builtIn: boolean
  levels: Question[][]
  /** Extra items for the special rounds (built-in categories only) */
  modes?: Partial<Record<ItemMode, ModeItem[]>>
}

export type PackGroup = 'engineering' | 'cces' | 'general' | 'finance' | 'law' | 'design' | 'humanities'

/** Special rounds the host can add after the board. "picture" uses the picture questions of the categories. */
export const ROUND_MODES = ['picture', 'tf', 'case', 'translate', 'clues', 'odd'] as const
export type RoundMode = (typeof ROUND_MODES)[number]
/** The modes that have their own sections in pack files. */
export type ItemMode = Exclude<RoundMode, 'picture'>

/** One item of a special round. For true-or-false, v is 1 (true, halal, legal) or 0, and k says which words to use. */
export interface ModeItem {
  id?: string
  q: string
  a: string
  img?: string
  v?: 0 | 1
  k?: 'true' | 'halal' | 'legal'
  /** The category it came from (name shown with the item, and its id) */
  cat?: string
  from?: string
}

export interface ModeRoundState {
  i: number
  revealed: boolean
  /** Clue-by-clue: how many clues are showing */
  shown: number
  done?: boolean
}

export interface CategorySummary {
  id: string
  name: string
  nameAr?: string
  group?: PackGroup
  builtIn: boolean
  counts: number[]
  /** How many items the category has for each special round */
  modes?: Partial<Record<ItemMode, number>>
  /** How many picture questions it has */
  pics?: number
}

/** Special tiles: Steal moves the points from another team; Audience lets someone in the room answer for the team. */
export type Special = 'steal' | 'crowd'

export interface Clue extends Question {
  value: number
  golden: boolean
  special?: Special
}

export interface Team {
  name: string
  score: number
}

export interface GameSettings {
  /** Seconds per clue (0 = no timer) */
  timer: number
  deduct: boolean
  /** Optional seconds for each level (100 to 500); null keeps the game's seconds per clue */
  levelTimers?: (number | null)[]
  /** Optional length of the whole game in minutes (0 or missing = no limit) */
  gameMinutes?: number
  /** Fun extras (all optional, off when missing) */
  streak?: boolean
  comeback?: boolean
  lightning?: boolean
  final?: boolean
  /** A special round after the board */
  mode?: RoundMode
}

/** Counts of special tiles the host asked for (used only when the game is made). */
export interface TileCounts {
  golden: number
  steal?: number
  crowd?: number
}

/** Where a game is: on the board, in the 60-second lightning round, or at the final question. */
export type Stage = 'board' | 'mode' | 'lightning' | 'final'

export interface LightningState {
  /** Index of the question on screen */
  i: number
  revealed: boolean
  /** When the 60 seconds started (epoch ms), once the host presses Go */
  startedAt?: number
  done?: boolean
}

export interface FinalState {
  /** cat: the category is shown, teams get ready; q: the question and its timer; answer: the answer is shown and teams are marked */
  step: 'cat' | 'q' | 'answer'
  startedAt?: number
  /** Which teams were marked right (true), wrong (false), or not yet marked (null) */
  marks: (boolean | null)[]
}

export interface Game {
  cats: { id: string; name: string; nameAr?: string }[]
  /** clues[category][level] */
  clues: Clue[][]
  teams: Team[]
  used: string[]
  settings: GameSettings
  startedAt: number
  /** When the whole-game clock runs out (epoch ms), if the host set a game length */
  endsAt?: number
  /** Right answers in a row, per team (streak bonus) */
  streaks?: number[]
  stage?: Stage
  /** Quick questions for the lightning round, drawn from the game's categories */
  lightning?: Question[]
  lightningState?: LightningState
  /** The final question and the category it comes from */
  final?: { cat: { id: string; name: string; nameAr?: string }; q: Question }
  finalState?: FinalState
  /** The special round's items and where it is */
  modeRound?: { mode: RoundMode; items: ModeItem[] }
  modeState?: ModeRoundState
  /** The themed night this game was set up from, if any */
  night?: string
}

export type ThemeId = 'amethyst' | 'emerald' | 'neon' | 'onyx' | 'rivals' | 'ember' | 'heritage'
export type Lang = 'en' | 'ar'
export type Screen = 'home' | 'setup' | 'game' | 'mode' | 'lightning' | 'final' | 'results' | 'builder'
