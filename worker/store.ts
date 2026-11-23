import { isAllowedName } from "@/games/shared/name-filter"
import { BOARD_SIZE, isGameId, type GameId } from "@/games/shared/leaderboard"
import type { LogEntry } from "@/games/shared/replay"
import { replayChunk } from "./replay"
import type { Submission } from "./validate"

export type ScoreRow = {
  id: number
  name: string
  score: number
  level: number
}

export type RunResult =
  | { status: "running"; id: string }
  | { status: "not-placed" }
  | { status: "saved"; score: number; rank: number; level: number }
  | { status: "rejected" }
  | { status: "missing" }
  | { status: "conflict" }

type RunRow = {
  id: string
  game: string
  level: number
  name: string
  seed: number
  claimed: number
  log: string
  checkpoint: string | null
  tick: number
}

const INSERT_RUN = `INSERT INTO runs (id, game, level, name, seed, claimed, log)
  VALUES (?, ?, ?, ?, ?, ?, ?)`

const DELETE_OLD_RUNS = `DELETE FROM runs WHERE created_at < datetime('now', '-1 hour')`

const TENTH_SCORE = `SELECT score FROM scores WHERE game = ? ORDER BY score DESC, id LIMIT 1 OFFSET 9`

const LIST_SCORES = `SELECT id, name, score, level FROM scores
  WHERE game = ? ORDER BY score DESC, id LIMIT ?`

const READ_RUN = `SELECT id, game, level, name, seed, claimed, log, checkpoint, tick FROM runs WHERE id = ?`

const SAVE_CHECKPOINT = `UPDATE runs SET checkpoint = ?, tick = ? WHERE id = ? AND tick = ?`

const DELETE_RUN = `DELETE FROM runs WHERE id = ? AND tick = ?`

const INSERT_SCORE = `INSERT INTO scores (game, level, name, score)
  SELECT game, ?, name, ? FROM runs
  WHERE id = ? AND tick = ? AND game = ?
  AND ? > COALESCE((
    SELECT score FROM scores WHERE game = ? ORDER BY score DESC, id LIMIT 1 OFFSET 9
  ), -1)`

const TRIM_SCORES = `DELETE FROM scores WHERE game = ? AND id NOT IN (
  SELECT id FROM (
    SELECT id FROM scores WHERE game = ? ORDER BY score DESC, id LIMIT ${BOARD_SIZE}
  )
)`

const RANK = `SELECT COUNT(*) AS rank FROM scores
  WHERE game = ? AND (score > ? OR (score = ? AND id <= ?))`

export async function listScores(db: D1Database, game: GameId): Promise<ScoreRow[]> {
  const listed = await db.prepare(LIST_SCORES).bind(game, BOARD_SIZE).all<ScoreRow>()
  return listed.results.filter((row) => isAllowedName(row.name))
}

export async function createRun(db: D1Database, id: string, submission: Submission): Promise<RunResult> {
  await db.prepare(DELETE_OLD_RUNS).run()
  const tenth = await db.prepare(TENTH_SCORE).bind(submission.game).first<{ score: number }>()
  if (tenth && submission.claimed <= tenth.score) return { status: "not-placed" }

  await db
    .prepare(INSERT_RUN)
    .bind(
      id,
      submission.game,
      submission.level,
      submission.name,
      submission.seed,
      submission.claimed,
      JSON.stringify(submission.log),
    )
    .run()
  return { status: "running", id }
}

export async function continueRun(db: D1Database, id: string): Promise<RunResult> {
  const row = await db.prepare(READ_RUN).bind(id).first<RunRow>()
  if (!row || !isGameId(row.game)) return { status: "missing" }
  const log = parseStoredLog(row.log)
  if (!log) {
    await db.prepare(DELETE_RUN).bind(id, row.tick).run()
    return { status: "rejected" }
  }

  const outcome = replayChunk(row.game, row.level, row.seed, log, row.checkpoint)
  if (outcome.status === "running") {
    const saved = await db
      .prepare(SAVE_CHECKPOINT)
      .bind(JSON.stringify(outcome.checkpoint), outcome.checkpoint.tick, id, row.tick)
      .run()
    if (saved.meta.changes === 0) return { status: "conflict" }
    return { status: "running", id }
  }

  if (outcome.status === "rejected" || outcome.score !== row.claimed) {
    const removed = await db.prepare(DELETE_RUN).bind(id, row.tick).run()
    if (removed.meta.changes === 0) return { status: "conflict" }
    return { status: "rejected" }
  }

  const finished = await db.batch([
    db.prepare(INSERT_SCORE).bind(outcome.level, outcome.score, id, row.tick, row.game, outcome.score, row.game),
    db.prepare(TRIM_SCORES).bind(row.game, row.game),
    db.prepare(DELETE_RUN).bind(id, row.tick),
  ])
  const inserted = finished[0]
  const removed = finished[2]
  if (!inserted || !removed) return { status: "conflict" }
  if (inserted.meta.changes === 0 && removed.meta.changes === 0) return { status: "conflict" }
  if (inserted.meta.changes === 0) return { status: "not-placed" }

  const rank = await db
    .prepare(RANK)
    .bind(row.game, outcome.score, outcome.score, inserted.meta.last_row_id ?? 0)
    .first<{ rank: number }>()
  return { status: "saved", score: outcome.score, rank: rank?.rank ?? 1, level: outcome.level }
}

function parseStoredLog(raw: string): LogEntry[] | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed as LogEntry[]
  } catch {
    return null
  }
}
