import { describe, expect, it } from "vitest"

import { SNAKE_DIRECTIONS } from "@/games/shared/leaderboard"
import { finishReplay, type LogEntry } from "@/games/shared/replay"
import { createGame, queueTurn, start, step, type Direction, type Game, type Level } from "@/games/snake/logic"
import { advance, begin } from "@/games/snake/replay"

const replay = { begin, advance }

function code(dir: Direction): number {
  return SNAKE_DIRECTIONS.indexOf(dir)
}

function play(
  level: Level,
  seed: number,
  choose: (game: Game, tick: number) => Direction | null,
): { log: LogEntry[]; score: number; status: Game["status"] } {
  let game = start(createGame(level, seed))
  const log: LogEntry[] = []
  let tick = 0
  while (game.status === "playing" && tick < 5_000) {
    const dir = choose(game, tick)
    if (dir) {
      const turned = queueTurn(game, dir)
      if (turned !== game) {
        log.push([tick, code(dir)])
        game = turned
      }
    }
    game = step(game)
    tick += 1
  }
  return { log, score: game.score, status: game.status }
}

const CRASH: (Direction | null)[] = ["up", "left", "down"]

describe("replay snake", () => {
  it("reaches the same score in one pass and in steps of one", () => {
    const played = play(4, 7, (_game, tick) => CRASH[tick] ?? (tick % 17 === 0 ? "right" : null))
    expect(played.status === "over" || played.status === "won").toBe(true)

    const whole = finishReplay(replay, 4, 7, played.log, 100_000)
    const chunked = finishReplay(replay, 4, 7, played.log, 1)
    expect(whole).toEqual({ status: "done", score: played.score, level: 4 })
    expect(chunked).toEqual(whole)
  })

  it("gives a tampered log the score those turns really earn", () => {
    const played = play(1, 1, (_game, tick) => CRASH[tick] ?? null)
    expect(played.status).toBe("over")
    const tampered: LogEntry[] = played.log.map((entry, index) =>
      index === 0 ? [entry[0], code("down")] : entry,
    )
    const outcome = finishReplay(replay, 1, 1, tampered, 100_000)
    const score = outcome.status === "done" ? outcome.score : -1
    expect(score).not.toBe(played.score)
  })

  it("rejects a snake that never ends", () => {
    const outcome = finishReplay(replay, 1, 1, [], 20_000)
    expect(outcome).toEqual({ status: "rejected", reason: "too long" })
  })

  it("rejects turns that arrive after the game is over", () => {
    const played = play(1, 1, (_game, tick) => CRASH[tick] ?? null)
    const extra: LogEntry[] = [...played.log, [3, code("left")]]
    expect(finishReplay(replay, 1, 1, extra, 100_000)).toEqual({
      status: "rejected",
      reason: "extra turns",
    })
  })
})
