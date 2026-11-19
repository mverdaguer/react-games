export type StartLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type Settings = {
  startLevel: StartLevel
  sound: boolean
  preview: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  startLevel: 0,
  sound: false,
  preview: true,
}

export type BestScores = Partial<Record<StartLevel, number>>

const START_LEVELS: readonly StartLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const SCORES_KEY = "tetris:best-scores:v1"

const SETTINGS_KEY = "tetris:settings:v1"

function isStartLevel(value: unknown): value is StartLevel {
  return START_LEVELS.some((level) => level === value)
}

function readScores(): BestScores {
  try {
    const raw = localStorage.getItem(SCORES_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}
    const record = parsed as Record<string, unknown>
    const scores: BestScores = {}
    for (const level of START_LEVELS) {
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

export function saveBestScore(level: StartLevel, score: number): BestScores {
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
      startLevel: isStartLevel(record.startLevel) ? record.startLevel : DEFAULT_SETTINGS.startLevel,
      sound: typeof record.sound === "boolean" ? record.sound : DEFAULT_SETTINGS.sound,
      preview: typeof record.preview === "boolean" ? record.preview : DEFAULT_SETTINGS.preview,
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
