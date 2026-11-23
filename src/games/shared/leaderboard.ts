import { isAllowedName } from "@/games/shared/name-filter"
import type { LogEntry } from "@/games/shared/replay"

export type { LogEntry } from "@/games/shared/replay"

export const GAME_IDS = ["snake", "tetris", "pang"] as const

export type GameId = (typeof GAME_IDS)[number]

export const BOARD_SIZE = 10

export const MAX_LOG_ENTRIES = 40_000

export const MAX_BODY_BYTES = 512 * 1024

export const MAX_NAME_LENGTH = 3

export const SNAKE_DIRECTIONS = ["up", "down", "left", "right"] as const

export const TETRIS_ACTIONS = ["left", "right", "down", "cw", "ccw"] as const

type GameRules = {
  chunk: number
  maxTicks: number
  maxCode: number
  maxPerTick: number
  strictTicks: boolean
  levels: readonly number[] | null
}

// Chunk sizes are a step budget, not a timer. Workers free-plan CPU time does
// not advance Date.now(), and one request has about 10 ms. `pnpm bench` times
// one chunk. On this machine a Snake chunk of 20,000 steps took about 6 ms, so
// the budget is 10,000 to leave room for a slower Worker.
export const GAME_RULES: Record<GameId, GameRules> = {
  snake: {
    chunk: 10_000,
    maxTicks: 100_000,
    maxCode: SNAKE_DIRECTIONS.length - 1,
    maxPerTick: 2,
    strictTicks: false,
    levels: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  tetris: {
    chunk: 10_000,
    maxTicks: 200_000,
    maxCode: TETRIS_ACTIONS.length - 1,
    maxPerTick: 64,
    strictTicks: false,
    levels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  pang: {
    chunk: 3_000,
    maxTicks: 216_000,
    maxCode: 7,
    maxPerTick: 1,
    strictTicks: true,
    levels: null,
  },
}

const NAME_PATTERN = /^\p{L}{3}$/u

export type UnrankedReason = "custom-speed" | "too-long"

export type RecordedRun = {
  game: GameId
  level: number
  seed: number
  score: number
  log: readonly LogEntry[]
  unranked: UnrankedReason | null
}

// Returns false once another entry would make the Worker reject the log.
export function recordInput(game: GameId, log: LogEntry[], ticks: number, code: number): boolean {
  const rules = GAME_RULES[game]
  if (!Number.isInteger(ticks) || !Number.isInteger(code)) return false
  if (ticks < 0 || ticks >= rules.maxTicks || code < 0 || code > rules.maxCode) return false
  if (log.length >= MAX_LOG_ENTRIES) return false
  const previous = log.at(-1)
  if (previous) {
    const [previousTick] = previous
    if (rules.strictTicks ? ticks <= previousTick : ticks < previousTick) return false
  }
  let sameTick = 0
  for (let index = log.length - 1; index >= 0 && log[index]?.[0] === ticks; index -= 1) {
    sameTick += 1
  }
  if (sameTick >= rules.maxPerTick) return false
  log.push([ticks, code])
  return true
}

export function pastTickLimit(game: GameId, ticks: number): boolean {
  return ticks > GAME_RULES[game].maxTicks
}

export type NameCheck =
  | { ok: true; name: string }
  | { ok: false; reason: "format" | "rude" }

export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && GAME_IDS.some((game) => game === value)
}

export function checkName(value: unknown): NameCheck {
  if (typeof value !== "string") return { ok: false, reason: "format" }
  const name = value.trim().toLocaleUpperCase()
  if (!NAME_PATTERN.test(name)) return { ok: false, reason: "format" }
  if (!isAllowedName(name)) return { ok: false, reason: "rude" }
  return { ok: true, name }
}

export function parseSeed(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null
  if (value < 0 || value > 0xffffffff) return null
  return value
}

export function parseClaimed(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null
  if (value < 0 || value > 1_000_000_000) return null
  return value
}

export function parseInputLevel(game: GameId, value: unknown): number | null {
  const levels = GAME_RULES[game].levels
  if (levels === null) {
    if (value === undefined || value === 0) return 0
    if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 999) {
      return value
    }
    return null
  }
  if (typeof value !== "number" || !levels.includes(value)) return null
  return value
}

export function parseLog(game: GameId, value: unknown): LogEntry[] | null {
  if (!Array.isArray(value) || value.length > MAX_LOG_ENTRIES) return null
  const rules = GAME_RULES[game]
  const log: LogEntry[] = []
  let previous = -1
  let runTick = -1
  let runCount = 0

  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) return null
    const [tick, code] = entry
    if (typeof tick !== "number" || typeof code !== "number") return null
    if (!Number.isInteger(tick) || !Number.isInteger(code)) return null
    if (tick < 0 || tick >= rules.maxTicks) return null
    if (code < 0 || code > rules.maxCode) return null
    if (rules.strictTicks ? tick <= previous : tick < previous) return null
    if (tick === runTick) runCount += 1
    else {
      runTick = tick
      runCount = 1
    }
    if (runCount > rules.maxPerTick) return null
    previous = tick
    log.push([tick, code])
  }

  return log
}

export function qualifies(score: number, scores: readonly { score: number }[]): boolean {
  if (scores.length < BOARD_SIZE) return score >= 0
  const tenth = scores[BOARD_SIZE - 1]
  if (!tenth) return true
  return score > tenth.score
}

export function levelLabel(game: GameId, level: number): string {
  if (game === "pang") return `Stage ${level}`
  return `Level ${level}`
}
