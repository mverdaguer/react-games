import type { Level } from "./logic"

export type BestTimes = Partial<Record<Level, number>>

const KEY = "minesweeper:best-times:v1"

const levels: Level[] = ["beginner", "intermediate", "expert"]

function readStored(): BestTimes {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}
    const record = parsed as Record<string, unknown>
    const times: BestTimes = {}
    for (const level of levels) {
      const value = record[level]
      if (typeof value === "number" && Number.isFinite(value)) times[level] = value
    }
    return times
  } catch {
    return {}
  }
}

export function loadBestTimes(): BestTimes {
  return readStored()
}

export function saveBestTime(level: Level, seconds: number): BestTimes {
  const current = readStored()
  const stored = current[level]
  if (stored !== undefined && stored <= seconds) return current
  const next: BestTimes = { ...current, [level]: seconds }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    return next
  }
  return next
}
