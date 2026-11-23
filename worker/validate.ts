import {
  checkName,
  isGameId,
  parseClaimed,
  parseInputLevel,
  parseLog,
  parseSeed,
  type GameId,
  type LogEntry,
} from "@/games/shared/leaderboard"

export type Submission = {
  game: GameId
  level: number
  name: string
  seed: number
  claimed: number
  log: LogEntry[]
}

export type Validation =
  | { ok: true; submission: Submission }
  | { ok: false; error: "body" | "game" | "level" | "name" | "seed" | "log" | "claimed" }

export function validateSubmission(value: unknown): Validation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "body" }
  const body = value as Record<string, unknown>
  if (!isGameId(body.game)) return { ok: false, error: "game" }
  const level = parseInputLevel(body.game, body.level)
  if (level === null) return { ok: false, error: "level" }
  const name = checkName(body.name)
  if (!name.ok) return { ok: false, error: "name" }
  const seed = parseSeed(body.seed)
  if (seed === null) return { ok: false, error: "seed" }
  const claimed = parseClaimed(body.claimed)
  if (claimed === null) return { ok: false, error: "claimed" }
  const log = parseLog(body.game, body.log)
  if (!log) return { ok: false, error: "log" }
  return { ok: true, submission: { game: body.game, level, name: name.name, seed, claimed, log } }
}
