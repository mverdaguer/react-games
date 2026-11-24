import { GAME_RULES } from "@/games/shared/leaderboard"
import type { AdvanceResult, Checkpoint, LogEntry } from "@/games/shared/replay"
import { createGame, start, step, type Game, type Input } from "@/games/arkanoid/logic"

const MAX_TICKS = GAME_RULES.arkanoid.maxTicks

const ACTIVE = new Set<Game["status"]>(["playing", "dying", "cleared"])

export function maskFromInput(input: Input): number {
  return (input.left ? 1 : 0) | (input.right ? 2 : 0) | (input.fire ? 4 : 0)
}

export function inputFromMask(mask: number): Input {
  return {
    left: (mask & 1) !== 0,
    right: (mask & 2) !== 0,
    fire: (mask & 4) !== 0,
  }
}

export function begin(_level: number, seed: number): Checkpoint<Game> {
  return { game: start(createGame(seed)), tick: 0, cursor: 0 }
}

export function advance(
  checkpoint: Checkpoint<Game>,
  log: readonly LogEntry[],
  budget: number,
): AdvanceResult<Game> {
  let { game, tick, cursor } = checkpoint
  let mask = cursor > 0 ? (log[cursor - 1]?.[1] ?? 0) : 0
  let steps = 0

  while (steps < budget && ACTIVE.has(game.status)) {
    if (tick >= MAX_TICKS) return { status: "rejected", reason: "too long" }
    const entry = log[cursor]
    if (entry && entry[0] === tick) {
      mask = entry[1]
      cursor += 1
    } else if (entry && entry[0] < tick) {
      return { status: "rejected", reason: "late input" }
    }
    game = step(game, inputFromMask(mask))
    tick += 1
    steps += 1
  }

  if (ACTIVE.has(game.status)) {
    return { status: "running", checkpoint: { game, tick, cursor } }
  }
  if (cursor < log.length) return { status: "rejected", reason: "extra input" }
  if (game.status === "over") {
    return { status: "done", score: game.score, level: game.level }
  }
  return { status: "rejected", reason: "unfinished" }
}
