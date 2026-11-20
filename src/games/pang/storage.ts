import { readRecord, writeRecord } from "@/games/shared/storage"

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
  const record = readRecord(BEST_KEY)
  if (!record) return null
  const score = whole(record.score)
  const level = whole(record.level)
  if (score === null || level === null || level < 1) return null
  return { score, level }
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
  writeRecord(BEST_KEY, next)
  return next
}

function readSettings(): Settings {
  const record = readRecord(SETTINGS_KEY)
  if (!record) return { ...DEFAULT_SETTINGS }
  return {
    sound: typeof record.sound === "boolean" ? record.sound : DEFAULT_SETTINGS.sound,
  }
}

export function loadSettings(): Settings {
  return readSettings()
}

export function saveSettings(settings: Settings): Settings {
  writeRecord(SETTINGS_KEY, settings)
  return settings
}
