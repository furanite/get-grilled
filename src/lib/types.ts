export const VALUES = [100, 200, 300, 400, 500] as const
export const LEVEL_NAMES = ['Warm-up', 'Easy', 'Medium', 'Hard', 'Expert'] as const
export const LEVEL_NAMES_AR = ['تمهيدي', 'سهل', 'متوسط', 'صعب', 'خبير'] as const

export interface Question {
  id: string
  q: string
  a: string
  qAr?: string
  aAr?: string
  /** Urdu (Munaafasatul Ilm) */
  qUr?: string
  aUr?: string
  /** Source tag: H = historical or sourced fact, D = dramatised, F = fictional. */
  kind?: 'H' | 'D' | 'F'
  src?: string
  /** Credit line for a photo (author and licence), shown under the picture. */
  credit?: string
  /** A picture or diagram shown with the clue: a data: URL for host-made questions, or a path for built-in ones. */
  img?: string
  /** Schools of fiqh a ruling belongs to (h Hanafi, m Maliki, s Shafi'i, b Hanbali); absent when all agree. */
  sch?: string
  /** Seconds for this question only, overriding the game's setting. */
  secs?: number
}

export type Madhhab = '' | 'h' | 'm' | 's' | 'b'

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
  nameUr?: string
  builtIn: boolean
  /** Religious content: shown without spins or shakes, with its source after the answer. */
  respect?: boolean
  /** The study file this category came from (one subcategory of it), shown as a group in setup */
  set?: { id: string; title: string }
  levels: Question[][]
  /** Extra items for the special rounds (built-in categories only) */
  modes?: Partial<Record<ItemMode, ModeItem[]>>
}

export type PackGroup =
  | 'engineering' | 'cces' | 'general'
  | 'quran' | 'hadith' | 'aqidah' | 'fiqh' | 'prophets' | 'arabic' | 'tazkiyah' | 'islamichistory' | 'nasheed'
  | 'kids'

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
  /** Source tag (religious categories): historical with its source, dramatised or fictional */
  kind?: 'H' | 'D' | 'F'
  src?: string
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
  nameUr?: string
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

/** One person on a team, for the team introductions. */
export interface Member {
  name: string
  /** A short line under the name: their major, title or role (optional) */
  role?: string
}

export interface Team {
  name: string
  score: number
  /** Team introductions (optional): members, which member is captain, and a fun fact */
  members?: Member[]
  captain?: number
  fact?: string
}

/** Where the team introductions are: showing team i, or (i === teams.length) the Meet the teams screen. */
export interface IntroState {
  i: number
  /** Move on to the next team by itself after a few seconds */
  auto: boolean
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
  /** Overall difficulty: which question levels each board row draws from (missing = standard) */
  difficulty?: Difficulty
}

/** Overall difficulty the host picks. Points stay the same; only the questions behind them change. */
export const DIFFICULTIES = ['easy', 'balanced', 'standard', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Counts of special tiles the host asked for (used only when the game is made). */
export interface TileCounts {
  golden: number
  /** Overall difficulty (see GameSettings) */
  difficulty?: Difficulty
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
  cats: { id: string; name: string; nameAr?: string; nameUr?: string; respect?: boolean }[]
  /** clues[category][level] */
  clues: Clue[][]
  teams: Team[]
  used: string[]
  settings: GameSettings
  startedAt: number
  /** When the whole-game clock runs out (epoch ms), if the host set a game length */
  endsAt?: number
  /** Whose turn it is to pick a tile: a random team starts, then each team in turn */
  turn?: number
  /** Right answers in a row, per team (streak bonus) */
  streaks?: number[]
  stage?: Stage
  /** Quick questions for the lightning round, drawn from the game's categories */
  lightning?: Question[]
  lightningState?: LightningState
  /** The final question and the category it comes from */
  final?: { cat: { id: string; name: string; nameAr?: string; nameUr?: string }; q: Question }
  finalState?: FinalState
  /** The special round's items and where it is */
  modeRound?: { mode: RoundMode; items: ModeItem[] }
  modeState?: ModeRoundState
  /** The themed night this game was set up from, if any */
  night?: string
  /** Team introductions before the board; removed when the host starts the game */
  intro?: IntroState
  /** Points multiplier for the board on screen (2 in a double-points tournament round) */
  mult?: number
  /** A tournament: several rounds of different kinds, with scores carried from one to the next */
  tournament?: Tournament
  /** Sudden-death questions kept back for a tie at the top, each with its category */
  tiebreak?: { cat: { id: string; name: string; nameAr?: string; nameUr?: string }; q: Question }[]
  tieState?: TieState
  /** Every point won or lost, in order, for the game log and the judges' sheet */
  log?: LogEntry[]
}

/** Where the tie-breaker is: which question, whether it is on show, its answer shown, who missed it, and who won. */
export interface TieState {
  i: number
  /** The teams level at the top when the tie-breaker started */
  teams: number[]
  shown: boolean
  revealed: boolean
  wrong: number[]
  winner?: number
}

/** What a line of the game log records. */
export type LogKind = 'right' | 'wrong' | 'nobody' | 'bonus' | 'steal' | 'adjust' | 'lightning' | 'mode' | 'final' | 'tiebreak'

/** One line of the game log: a team (or -1 for nobody), the points it won or lost, and the question. */
export interface LogEntry {
  at: number
  kind: LogKind
  team: number
  delta: number
  cat?: string
  value?: number
  q?: string
  a?: string
  /** Tournament round number (1 = first), when there is one */
  round?: number
  /** Steal tiles: the team that answered and took the points */
  by?: number
}

/** Kinds of tournament round: a board, a board at double points, a special round, the lightning round, the final question. */
export const TOUR_KINDS = ['board', 'double', 'mode', 'lightning', 'final'] as const
export type TourKind = (typeof TOUR_KINDS)[number]

/** One round of a tournament plan, as the host sets it up. */
export interface TourStep {
  kind: TourKind
  /** Which special round, for kind "mode" */
  mode?: RoundMode
}

/** One round of a tournament in play, with what it was drawn with when the game was made. */
export interface TourRound extends TourStep {
  /** Board rounds: the categories and the clues */
  cats?: { id: string; name: string; nameAr?: string; nameUr?: string }[]
  clues?: Clue[][]
  /** Special rounds: the items */
  items?: ModeItem[]
}

export interface Tournament {
  rounds: TourRound[]
  /** The round being played */
  at: number
  /** True while the round's title card is showing, before the host starts it */
  intro: boolean
}

/** Themes that exist only on the Islamic site (Munaafasatul Ilm). */
export type PrayerTheme = 'fajr' | 'duha' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'qiyam'
export type CultureTheme = 'mughal' | 'sahel' | 'swahili' | 'nusantara' | 'zellige' | 'suzani' | 'bosnia' | 'tatar' | 'kubachi' | 'hui'
export type IslamicOnlyTheme = 'rawdah' | 'jumuah' | 'mawlid' | PrayerTheme | CultureTheme
export type BaseThemeId = Exclude<ThemeId, IslamicOnlyTheme>
export type ThemeId = 'amethyst' | 'emerald' | 'neon' | 'onyx' | 'rivals' | 'ember' | 'heritage' | IslamicOnlyTheme
export type Lang = 'en' | 'ar' | 'ur'
export type Screen = 'home' | 'setup' | 'intro' | 'game' | 'mode' | 'lightning' | 'final' | 'results' | 'builder' | 'round' | 'review' | 'study' | 'tiebreak' | 'practice' | 'bracket' | 'lobby'
