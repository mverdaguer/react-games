import { GAME_RULES, TETRIS_ACTIONS } from "@/games/shared/leaderboard"
import type { AdvanceResult, Checkpoint, LogEntry } from "@/games/shared/replay"
import { apply, createGame, start, tick as fall, type Action, type Game } from "@/games/tetris/logic"

const MAX_TICKS = GAME_RULES.tetris.maxTicks

function actionFrom(code: number): Action | null {
  return TETRIS_ACTIONS[code] ?? null
}

export function begin(level: number, seed: number): Checkpoint<Game> {
  return { game: start(createGame(level, seed)), tick: 0, cursor: 0 }
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
      const action = code === undefined ? null : actionFrom(code)
      if (!action) return { status: "rejected", reason: "bad action" }
      game = apply(game, action)
      cursor += 1
    }
    const upcoming = log[cursor]
    if (upcoming && upcoming[0] < tick) return { status: "rejected", reason: "late action" }
    game = fall(game)
    tick += 1
    steps += 1
  }

  if (game.status === "playing") {
    return { status: "running", checkpoint: { game, tick, cursor } }
  }
  if (cursor < log.length) return { status: "rejected", reason: "extra actions" }
  if (game.status === "over") {
    return { status: "done", score: game.score, level: game.startLevel }
  }
  return { status: "rejected", reason: "unfinished" }
}
