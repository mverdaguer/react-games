import { describe, expect, it } from "vitest"

import { recordInput } from "@/games/shared/leaderboard"
import { finishReplay, type Checkpoint, type LogEntry } from "@/games/shared/replay"
import { createGame, start, step, type Difficulty, type Game, type Input } from "@/games/arkanoid/logic"
import { advance, begin, maskFromInput, storedLevel } from "@/games/arkanoid/replay"

const replay = { begin, advance }
const ACTIVE = new Set<Game["status"]>(["playing", "dying", "cleared"])
const IDLE: Input = { left: false, right: false, fire: false }

function play(
  seed: number,
  choose: (tick: number) => Input,
  difficulty: Difficulty = "easy",
): { log: LogEntry[]; game: Game } {
  let game = start(createGame(seed, difficulty))
  const log: LogEntry[] = []
  let mask = 0
  let tick = 0
  while (ACTIVE.has(game.status) && tick < 8_000) {
    const input = choose(tick)
    const nextMask = maskFromInput(input)
    if (nextMask !== mask) {
      if (!recordInput("arkanoid", log, tick, nextMask)) break
      mask = nextMask
    }
    game = step(game, input)
    tick += 1
  }
  return { log, game }
}

describe("replay arkanoid", () => {
  it("reaches the same score in one pass and in steps of one", () => {
    const played = play(5, (tick) => ({ ...IDLE, left: true, fire: tick % 40 === 0 }))
    expect(played.game.status).toBe("over")
    const whole = finishReplay(replay, 0, 5, played.log, 216_000)
    const chunked = finishReplay(replay, 0, 5, played.log, 1)
    expect(whole).toEqual({ status: "done", score: played.game.score, level: storedLevel(played.game) })
    expect(chunked).toEqual(whole)
  })

  it("survives a checkpoint being read back from JSON", () => {
    const played = play(9, (tick) => ({ ...IDLE, left: true, fire: tick % 40 === 0 }))
    expect(played.game.status).toBe("over")
    let checkpoint: Checkpoint<Game> = begin(0, 9)
    let seen = 0
    while (seen < 50) {
      const outcome = advance(checkpoint, played.log, 1)
      if (outcome.status !== "running") break
      checkpoint = outcome.checkpoint
      seen += 1
    }
    const restored = JSON.parse(JSON.stringify(checkpoint)) as Checkpoint<Game>
    const fromMemory = finishReplay(replay, 0, 9, played.log, 216_000)
    const fromJson = advanceUntilDone(restored, played.log)
    expect(fromJson).toEqual(fromMemory)
  })

  it("replays a hard run on the faster table", () => {
    const choose = (tick: number): Input => ({ ...IDLE, left: true, fire: tick % 40 === 0 })
    const played = play(5, choose, "hard")
    expect(played.game.status).toBe("over")
    expect(played.game.difficulty).toBe("hard")
    const whole = finishReplay(replay, 1, 5, played.log, 216_000)
    expect(whole).toEqual({ status: "done", score: played.game.score, level: storedLevel(played.game) })
    const asEasy = finishReplay(replay, 0, 5, played.log, 216_000)
    const sameScore = asEasy.status === "done" && asEasy.score === played.game.score
    expect(sameScore).toBe(false)
  })
})

function advanceUntilDone(checkpoint: Checkpoint<Game>, log: readonly LogEntry[]) {
  let current = checkpoint
  for (let guard = 0; guard < 10_000; guard += 1) {
    const outcome = advance(current, log, 30)
    if (outcome.status !== "running") return outcome
    current = outcome.checkpoint
  }
  return { status: "rejected" as const, reason: "too long" }
}
