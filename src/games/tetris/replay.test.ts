import { describe, expect, it } from "vitest"

import { TETRIS_ACTIONS } from "@/games/shared/leaderboard"
import { finishReplay, type LogEntry } from "@/games/shared/replay"
import { apply, createGame, start, tick, type Game } from "@/games/tetris/logic"
import { advance, begin } from "@/games/tetris/replay"

const replay = { begin, advance }

function play(seed: number): { log: LogEntry[]; score: number; status: Game["status"] } {
  let game = start(createGame(0, seed))
  const log: LogEntry[] = []
  let count = 0
  while (game.status === "playing" && count < 20_000) {
    if (count % 2 === 0) {
      const dropped = apply(game, "down")
      if (dropped !== game) {
        log.push([count, TETRIS_ACTIONS.indexOf("down")])
        game = dropped
      }
    }
    game = tick(game)
    count += 1
  }
  return { log, score: game.score, status: game.status }
}

describe("replay tetris", () => {
  it("reaches the same score in one pass and in steps of one", () => {
    const played = play(11)
    expect(played.status).toBe("over")
    const whole = finishReplay(replay, 0, 11, played.log, 200_000)
    const chunked = finishReplay(replay, 0, 11, played.log, 1)
    expect(whole).toEqual({ status: "done", score: played.score, level: 0 })
    expect(chunked).toEqual(whole)
  })

  it("rejects a log that keeps going after the game is over", () => {
    const played = play(11)
    const extra: LogEntry[] = [...played.log, [19_999, TETRIS_ACTIONS.indexOf("left")]]
    expect(finishReplay(replay, 0, 11, extra, 200_000).status).toBe("rejected")
  })
})
