import { createBestStore, readRecord, writeRecord } from "@/games/shared/storage"
import { LEVELS, type Level } from "./logic"

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

const best = createBestStore(SCORES_KEY, LEVELS, (score, stored) => score > stored)

export const loadBestScores = best.load
export const saveBestScore = best.save

function isLevel(value: unknown): value is Level {
  return LEVELS.some((level) => level === value)
}

function readSettings(): Settings {
  const record = readRecord(SETTINGS_KEY)
  if (!record) return { ...DEFAULT_SETTINGS }
  return {
    level: isLevel(record.level) ? record.level : DEFAULT_SETTINGS.level,
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
