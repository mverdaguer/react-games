import { GAME_RULES, SNAKE_DIRECTIONS } from "@/games/shared/leaderboard"
import type { AdvanceResult, Checkpoint, LogEntry } from "@/games/shared/replay"
import {
  createGame,
  LEVELS,
  queueTurn,
  start,
  step,
  type Direction,
  type Game,
  type Level,
} from "@/games/snake/logic"

function asLevel(level: number): Level {
  const match = LEVELS.find((item) => item === level)
  if (match === undefined) throw new Error("level")
  return match
}

const MAX_TICKS = GAME_RULES.snake.maxTicks

function direction(code: number): Direction | null {
  return SNAKE_DIRECTIONS[code] ?? null
}

export function begin(level: number, seed: number): Checkpoint<Game> {
  return { game: start(createGame(asLevel(level), seed)), tick: 0, cursor: 0 }
}

export function advance(
  checkpoint: Checkpoint<Game>,
  log: readonly LogEntry[],
  budget: number,
): AdvanceResult<Game> {
  let { game, tick, cursor } = checkpoint
  let steps = 0

  while (steps < budget && game.status === "playing") {
    if (tick >= MAX_TICKS) return { status: "rejected", reason: "too long" }
    while (cursor < log.length && log[cursor]?.[0] === tick) {
      const code = log[cursor]?.[1]
      const dir = code === undefined ? null : direction(code)
      if (!dir) return { status: "rejected", reason: "bad turn" }
      game = queueTurn(game, dir)
      cursor += 1
    }
    const upcoming = log[cursor]
    if (upcoming && upcoming[0] < tick) return { status: "rejected", reason: "late turn" }
    game = step(game)
    tick += 1
    steps += 1
  }

  if (game.status === "playing") {
    return { status: "running", checkpoint: { game, tick, cursor } }
  }
  if (cursor < log.length) return { status: "rejected", reason: "extra turns" }
  if (game.status === "over" || game.status === "won") {
    return { status: "done", score: game.score, level: game.level }
  }
  return { status: "rejected", reason: "unfinished" }
}
