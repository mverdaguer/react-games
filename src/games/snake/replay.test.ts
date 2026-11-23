import { describe, expect, it } from "vitest"

import { SNAKE_DIRECTIONS } from "@/games/shared/leaderboard"
import { finishReplay, type LogEntry } from "@/games/shared/replay"
import { createGame, queueTurn, start, step, type Direction, type Game, type Level } from "@/games/snake/logic"
import { advance, begin } from "@/games/snake/replay"

const replay = { begin, advance }

function code(dir: Direction): number {
  return SNAKE_DIRECTIONS.indexOf(dir)
}

function scoreTurns(
  level: Level,
  seed: number,
  log: readonly LogEntry[],
): { score: number; status: Game["status"] } {
  let game = start(createGame(level, seed))
  let tick = 0
  let cursor = 0
  while (game.status === "playing" && tick < 5_000) {
    while (cursor < log.length && log[cursor]?.[0] === tick) {
      const turn = log[cursor]?.[1]
      const dir = turn === undefined ? undefined : SNAKE_DIRECTIONS[turn]
      if (dir) game = queueTurn(game, dir)
      cursor += 1
    }
    game = step(game)
    tick += 1
  }
  return { score: game.score, status: game.status }
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
    const tampered: LogEntry[] = [
      [0, code("down")],
      [1, code("left")],
      [2, code("up")],
    ]
    const lived = scoreTurns(1, 1, tampered)
    expect(lived).toEqual({ status: "over", score: 0 })
    expect(tampered).not.toEqual(played.log)
    expect(finishReplay(replay, 1, 1, tampered, 100_000)).toEqual({
      status: "done",
      score: lived.score,
      level: 1,
    })
  })

  it("applies two turns recorded on the same tick", () => {
    const log: LogEntry[] = [
      [0, code("up")],
      [0, code("left")],
    ]
    let game = start(createGame(1, 1))
    game = queueTurn(game, "up")
    game = queueTurn(game, "left")
    game = step(game)
    const outcome = advance(begin(1, 1), log, 1)
    expect(outcome.status).toBe("running")
    if (outcome.status !== "running") return
    expect(outcome.checkpoint.tick).toBe(1)
    expect(outcome.checkpoint.cursor).toBe(2)
    expect(outcome.checkpoint.game.snake).toEqual(game.snake)
    expect(outcome.checkpoint.game.direction).toBe(game.direction)
    expect(outcome.checkpoint.game.pending).toEqual(game.pending)
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
