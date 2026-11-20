import { createBestStore, readRecord, writeRecord } from "@/games/shared/storage"

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

const best = createBestStore(SCORES_KEY, START_LEVELS, (score, stored) => score > stored)

export const loadBestScores = best.load
export const saveBestScore = best.save

function isStartLevel(value: unknown): value is StartLevel {
  return START_LEVELS.some((level) => level === value)
}

function readSettings(): Settings {
  const record = readRecord(SETTINGS_KEY)
  if (!record) return { ...DEFAULT_SETTINGS }
  return {
    startLevel: isStartLevel(record.startLevel) ? record.startLevel : DEFAULT_SETTINGS.startLevel,
    sound: typeof record.sound === "boolean" ? record.sound : DEFAULT_SETTINGS.sound,
    preview: typeof record.preview === "boolean" ? record.preview : DEFAULT_SETTINGS.preview,
  }
}

export function loadSettings(): Settings {
  return readSettings()
}

export function saveSettings(settings: Settings): Settings {
  writeRecord(SETTINGS_KEY, settings)
  return settings
}
