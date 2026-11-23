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

type StoredResult = {
  status: string
  score: number | null
  rank: number | null
  level: number | null
}

const INSERT_RUN = `INSERT INTO runs (id, game, level, name, seed, claimed, log)
  VALUES (?, ?, ?, ?, ?, ?, ?)`

const DELETE_OLD_RUNS = `DELETE FROM runs WHERE created_at < datetime('now', '-1 hour')`

const LIST_GAME_SCORES = `SELECT id, name, score, level FROM scores
  WHERE game = ? ORDER BY score DESC, id`

const READ_RUN = `SELECT id, game, level, name, seed, claimed, log, checkpoint, tick FROM runs WHERE id = ?`

const READ_RESULT = `SELECT status, score, rank, level FROM run_results WHERE id = ?`

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

// A failed INSERT leaves last_insert_rowid() on an older row. Park it on a row
// this batch deletes so a miss cannot look like a score that was just saved.
const PARK_ROW_ID = `INSERT INTO scores (game, level, name, score) VALUES ('', 0, '', -1)`

const CLEAR_PARKED_ROW_ID = `DELETE FROM scores WHERE game = '' AND id = last_insert_rowid()`

const RANK = `SELECT COUNT(*) AS rank FROM scores
  WHERE game = ? AND (score > ? OR (score = ? AND id <= last_insert_rowid()))`

const INSERT_OUTCOME = `INSERT INTO run_results (id, status, score, rank, level)
  SELECT ?,
    CASE WHEN kept.id IS NULL THEN 'not-placed' ELSE 'saved' END,
    CASE WHEN kept.id IS NULL THEN NULL ELSE ? END,
    CASE WHEN kept.id IS NULL THEN NULL ELSE (
      SELECT COUNT(*) FROM scores
      WHERE game = ? AND (score > ? OR (score = ? AND id <= kept.id))
    ) END,
    CASE WHEN kept.id IS NULL THEN NULL ELSE ? END
  FROM (SELECT 1)
  LEFT JOIN (
    SELECT id FROM scores WHERE id = last_insert_rowid() AND game = ? AND score = ?
  ) AS kept ON 1 = 1
  WHERE changes() > 0`

const INSERT_REJECTED = `INSERT INTO run_results (id, status, score, rank, level)
  SELECT ?, 'rejected', NULL, NULL, NULL WHERE changes() > 0`

async function visibleScores(db: D1Database, game: string): Promise<ScoreRow[]> {
  const listed = await db.prepare(LIST_GAME_SCORES).bind(game).all<ScoreRow>()
  const visible: ScoreRow[] = []
  const hidden: number[] = []
  for (const row of listed.results) {
    if (isAllowedName(row.name)) visible.push(row)
    else hidden.push(row.id)
  }
  if (hidden.length > 0) {
    const marks = hidden.map(() => "?").join(", ")
    await db.prepare(`DELETE FROM scores WHERE id IN (${marks})`).bind(...hidden).run()
  }
  return visible
}

export async function listScores(db: D1Database, game: GameId): Promise<ScoreRow[]> {
  const visible = await visibleScores(db, game)
  return visible.slice(0, BOARD_SIZE)
}

export async function createRun(db: D1Database, id: string, submission: Submission): Promise<RunResult> {
  await db.prepare(DELETE_OLD_RUNS).run()
  const visible = await visibleScores(db, submission.game)
  const tenth = visible[BOARD_SIZE - 1]
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
  await db.prepare(DELETE_OLD_RUNS).run()
  const row = await db.prepare(READ_RUN).bind(id).first<RunRow>()
  if (!row) return finishedRun(db, id)
  if (!isGameId(row.game)) return { status: "missing" }
  const log = parseStoredLog(row.log)
  if (!log) return rejectRun(db, id, row.tick)

  const outcome = replayChunk(row.game, row.level, row.seed, log, row.checkpoint)
  if (outcome.status === "running") {
    const saved = await db
      .prepare(SAVE_CHECKPOINT)
      .bind(JSON.stringify(outcome.checkpoint), outcome.checkpoint.tick, id, row.tick)
      .run()
    if (saved.meta.changes === 0) return { status: "conflict" }
    return { status: "running", id }
  }

  if (outcome.status === "rejected" || outcome.score !== row.claimed) return rejectRun(db, id, row.tick)
  return saveRun(db, row, outcome.score, outcome.level)
}

async function saveRun(db: D1Database, row: RunRow, score: number, level: number): Promise<RunResult> {
  await visibleScores(db, row.game)
  const finished = await db.batch([
    db.prepare(PARK_ROW_ID),
    db.prepare(CLEAR_PARKED_ROW_ID),
    db.prepare(INSERT_SCORE).bind(level, score, row.id, row.tick, row.game, score, row.game),
    db.prepare(TRIM_SCORES).bind(row.game, row.game),
    db.prepare(RANK).bind(row.game, score, score),
    db.prepare(DELETE_RUN).bind(row.id, row.tick),
    db.prepare(INSERT_OUTCOME).bind(row.id, score, row.game, score, score, level, row.game, score),
  ])
  const inserted = finished[2]
  const removed = finished[5]
  if (!inserted || !removed) return { status: "conflict" }
  if (inserted.meta.changes === 0 && removed.meta.changes === 0) return { status: "conflict" }
  if (inserted.meta.changes === 0) return { status: "not-placed" }
  return { status: "saved", score, rank: rankFrom(finished[4]), level }
}

async function rejectRun(db: D1Database, id: string, tick: number): Promise<RunResult> {
  const finished = await db.batch([
    db.prepare(DELETE_RUN).bind(id, tick),
    db.prepare(INSERT_REJECTED).bind(id),
  ])
  const removed = finished[0]
  if (!removed || removed.meta.changes === 0) return { status: "conflict" }
  return { status: "rejected" }
}

async function finishedRun(db: D1Database, id: string): Promise<RunResult> {
  const receipt = await db.prepare(READ_RESULT).bind(id).first<StoredResult>()
  if (!receipt) return { status: "missing" }
  if (receipt.status === "rejected") return { status: "rejected" }
  if (receipt.status === "not-placed") return { status: "not-placed" }
  if (
    receipt.status === "saved" &&
    typeof receipt.score === "number" &&
    typeof receipt.rank === "number" &&
    typeof receipt.level === "number"
  ) {
    return { status: "saved", score: receipt.score, rank: receipt.rank, level: receipt.level }
  }
  return { status: "missing" }
}

function rankFrom(result: D1Result | undefined): number {
  const row = result?.results[0]
  if (!row || typeof row !== "object" || !("rank" in row)) return 1
  return typeof row.rank === "number" ? row.rank : 1
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
