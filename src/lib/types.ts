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
}

export type PackGroup = 'engineering' | 'cces' | 'general'

export interface CategorySummary {
  id: string
  name: string
  nameAr?: string
  group?: PackGroup
  builtIn: boolean
  counts: number[]
}

export interface Clue extends Question {
  value: number
  golden: boolean
}

export interface Team {
  name: string
  score: number
}

export interface GameSettings {
  timer: number
  deduct: boolean
}

export interface Game {
  cats: { id: string; name: string; nameAr?: string }[]
  /** clues[category][level] */
  clues: Clue[][]
  teams: Team[]
  used: string[]
  settings: GameSettings
  startedAt: number
}

export type ThemeId = 'amethyst' | 'emerald' | 'neon' | 'onyx' | 'rivals' | 'ember' | 'heritage'
export type Lang = 'en' | 'ar'
export type Screen = 'home' | 'setup' | 'game' | 'results' | 'builder'
