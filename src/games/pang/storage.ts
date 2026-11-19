export type Settings = {
  sound: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  sound: false,
}

export type Best = {
  score: number
  level: number
}

const BEST_KEY = "pang:best:v1"
const SETTINGS_KEY = "pang:settings:v1"

function whole(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null
  return Math.floor(value)
}

function readBest(): Best | null {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    const record = parsed as Record<string, unknown>
    const score = whole(record.score)
    const level = whole(record.level)
    if (score === null || level === null || level < 1) return null
    return { score, level }
  } catch {
    return null
  }
}

export function loadBest(): Best | null {
  return readBest()
}

export function saveBest(score: number, level: number): Best {
  const current = readBest()
  const next: Best = {
    score: Math.max(current?.score ?? 0, whole(score) ?? 0),
    level: Math.max(current?.level ?? 0, whole(level) ?? 0),
  }
  if (next.level < 1) return current ?? next
  if (current && current.score === next.score && current.level === next.level) return current
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(next))
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
