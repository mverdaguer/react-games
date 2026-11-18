import type { Level } from "./logic"

const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export type BestScores = Partial<Record<Level, number>>

const SCORES_KEY = "snake:best-scores:v1"

const SETTINGS_KEY = "snake:settings:v1"

export type Settings = {
  level: Level
  sound: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  level: 4,
  sound: false,
}

function isLevel(value: unknown): value is Level {
  return LEVELS.some((level) => level === value)
}

function readScores(): BestScores {
  try {
    const raw = localStorage.getItem(SCORES_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}
    const record = parsed as Record<string, unknown>
    const scores: BestScores = {}
    for (const level of LEVELS) {
      const value = record[String(level)]
      if (typeof value === "number" && Number.isFinite(value)) scores[level] = value
    }
    return scores
  } catch {
    return {}
  }
}

export function loadBestScores(): BestScores {
  return readScores()
}

export function saveBestScore(level: Level, score: number): BestScores {
  const current = readScores()
  const stored = current[level]
  if (stored !== undefined && stored >= score) return current
  const next: BestScores = { ...current, [level]: score }
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(next))
  } catch {
    return next
  }
  return next
}

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS }
    const record = parsed as Record<string, unknown>
    return {
      level: isLevel(record.level) ? record.level : DEFAULT_SETTINGS.level,
      sound: typeof record.sound === "boolean" ? record.sound : DEFAULT_SETTINGS.sound,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function loadSettings(): Settings {
  return readSettings()
}

export function saveSettings(settings: Settings): Settings {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    return settings
  }
  return settings
}
