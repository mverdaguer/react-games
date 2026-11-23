import { GAME_RULES, type GameId } from "@/games/shared/leaderboard"
import type { AdvanceResult, Checkpoint, LogEntry } from "@/games/shared/replay"
import { advance as advancePang, begin as beginPang } from "@/games/pang/replay"
import { advance as advanceSnake, begin as beginSnake } from "@/games/snake/replay"
import { advance as advanceTetris, begin as beginTetris } from "@/games/tetris/replay"

type RunReplay = {
  begin(level: number, seed: number): Checkpoint<unknown>
  advance(checkpoint: Checkpoint<unknown>, log: readonly LogEntry[], budget: number): AdvanceResult<unknown>
}

const REPLAYS: Record<GameId, RunReplay> = {
  snake: { begin: beginSnake, advance: advanceSnake },
  tetris: { begin: beginTetris, advance: advanceTetris },
  pang: { begin: beginPang, advance: advancePang },
}

export function replayChunk(
  game: GameId,
  level: number,
  seed: number,
  log: readonly LogEntry[],
  checkpoint: string | null,
): AdvanceResult<unknown> {
  const replay = REPLAYS[game]
  const restored = restore(checkpoint, replay.begin(level, seed))
  if (!restored) return { status: "rejected", reason: "checkpoint" }
  return replay.advance(restored, log, GAME_RULES[game].chunk)
}

function restore(raw: string | null, fresh: Checkpoint<unknown>): Checkpoint<unknown> | null {
  if (raw === null) return fresh
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const checkpoint = parsed as { game?: unknown; tick?: unknown; cursor?: unknown }
  if (typeof checkpoint.tick !== "number" || typeof checkpoint.cursor !== "number") return null
  if (checkpoint.game === undefined || checkpoint.game === null) return null
  return { game: checkpoint.game, tick: checkpoint.tick, cursor: checkpoint.cursor }
}
