import { describe, expect, it } from "vitest"

import {
  BALL_R,
  BRICK_H,
  BRICK_W,
  CLEARED_TICKS,
  COLUMNS,
  DYING_TICKS,
  FIELD_RIGHT,
  FIELD_TOP,
  FIELD_X,
  IDLE,
  MAX_ROWS,
  PADDLE_H,
  PADDLE_W,
  PADDLE_Y,
  START_LIVES,
  SUB,
  createGame,
  pause,
  start,
  step,
  type Ball,
  type CapsuleKind,
  type Game,
} from "@/games/arkanoid/logic"
import { ROUNDS, bricksFor, layoutFor } from "@/games/arkanoid/levels"

function playing(seed = 1): Game {
  return start(createGame(seed))
}

function shotAt(col: number, row: number): Ball {
  return {
    id: 1,
    x: (FIELD_X + col * BRICK_W - BALL_R - 1) * SUB,
    y: (FIELD_TOP + row * BRICK_H + BRICK_H / 2) * SUB,
    vx: 4 * SUB,
    vy: 0,
    stuck: false,
    stuckOffset: 0,
  }
}

function falling(): Ball {
  return {
    id: 1,
    x: (FIELD_X + BALL_R) * SUB,
    y: (PADDLE_Y + PADDLE_H) * SUB,
    vx: 0,
    vy: SUB,
    stuck: false,
    stuckOffset: 0,
  }
}

function dropOn(paddleX: number, offset: number): Ball {
  return {
    id: 1,
    x: paddleX + offset,
    y: (PADDLE_Y - BALL_R - 2) * SUB,
    vx: 0,
    vy: 4 * SUB,
    stuck: false,
    stuckOffset: offset,
  }
}

describe("arkanoid rules", () => {
  it("opens a ready round and deals the same table from the same seed", () => {
    const game = createGame(7)
    expect(game.status).toBe("ready")
    expect(game.level).toBe(1)
    expect(game.lives).toBe(START_LIVES)
    expect(game.balls).toHaveLength(1)
    expect(game.balls[0]?.stuck).toBe(true)
    expect(game.wide).toBe(false)
    expect(game.laser).toBe(false)
    expect(game.catchOn).toBe(false)
    expect(game.gate).toBe(false)
    expect(createGame(7)).toEqual(game)
    expect(step(game, IDLE)).toBe(game)

    const started = start(game)
    expect(started.status).toBe("playing")
    expect(started.balls[0]?.stuck).toBe(true)
    const paused = pause(started)
    expect(paused.status).toBe("paused")
    expect(step(paused, IDLE)).toBe(paused)
  })

  it("launches the stuck ball upward when fire rises", () => {
    const launched = step(playing(), { ...IDLE, fire: true })
    expect(launched.balls[0]?.stuck).toBe(false)
    expect(launched.balls[0]?.vy).toBeLessThan(0)
  })

  it("builds 12 distinct rounds and counts silver hits from the round number", () => {
    expect(ROUNDS).toHaveLength(12)
    const shapes = new Set(ROUNDS.map((round) => round.join("|")))
    expect(shapes.size).toBe(12)
    const cells = ROUNDS.flat().join("")
    expect(cells.includes("s")).toBe(true)
    expect(cells.includes("g")).toBe(true)
    for (const round of ROUNDS) {
      expect(round.length).toBeGreaterThan(0)
      expect(round.length).toBeLessThanOrEqual(MAX_ROWS)
      for (const row of round) expect(row).toHaveLength(COLUMNS)
    }
    expect(layoutFor(13)).toEqual(layoutFor(1))
    expect(bricksFor(7).find((brick) => brick.kind === "silver")?.hits).toBe(2)
    expect(bricksFor(19).find((brick) => brick.kind === "silver")?.hits).toBe(4)
    expect(bricksFor(8).some((brick) => brick.kind === "gold")).toBe(true)
    expect(bricksFor(1).every((brick) => brick.row < 6)).toBe(true)
  })

  it("flips off the left wall", () => {
    const game = step(
      {
        ...playing(),
        bricks: [],
        balls: [
          {
            id: 1,
            x: (FIELD_X + BALL_R) * SUB,
            y: 80 * SUB,
            vx: -2 * SUB,
            vy: 0,
            stuck: false,
            stuckOffset: 0,
          },
        ],
      },
      IDLE,
    )
    expect(game.balls[0]?.vx).toBeGreaterThan(0)
    expect(game.balls[0]?.x).toBe((FIELD_X + BALL_R) * SUB)
  })

  it("sends the left side of the paddle one way and the right side the other", () => {
    const paddleX = playing().paddleX
    const left = step({ ...playing(), bricks: [], balls: [dropOn(paddleX, 0)] }, IDLE)
    const right = step(
      { ...playing(), bricks: [], balls: [dropOn(paddleX, PADDLE_W * SUB - 1)] },
      IDLE,
    )
    expect(left.balls[0]?.vx).toBeLessThan(0)
    expect(right.balls[0]?.vx).toBeGreaterThan(0)
    expect(left.balls[0]?.vy).toBeLessThan(0)
    expect(right.balls[0]?.vy).toBeLessThan(0)
  })

  it("scores a color brick when it breaks", () => {
    const game = step(
      {
        ...playing(),
        bricks: [
          { col: 6, row: 0, kind: "color", color: 0, hits: 1 },
          { col: 0, row: 5, kind: "color", color: 1, hits: 1 },
        ],
        balls: [shotAt(6, 0)],
      },
      IDLE,
    )
    expect(game.score).toBe(50)
    expect(game.bricks.some((brick) => brick.col === 6 && brick.row === 0)).toBe(false)
    expect(game.status).toBe("playing")
  })

  it("cracks silver on the first hit and pays 50 times the round when it breaks", () => {
    let game = step(
      {
        ...playing(),
        bricks: [
          { col: 6, row: 0, kind: "silver", color: 0, hits: 2 },
          { col: 0, row: 5, kind: "color", color: 0, hits: 1 },
        ],
        balls: [shotAt(6, 0)],
      },
      IDLE,
    )
    expect(game.bricks.find((brick) => brick.kind === "silver")?.hits).toBe(1)
    expect(game.score).toBe(0)
    game = step({ ...game, balls: [shotAt(6, 0)] }, IDLE)
    expect(game.bricks.some((brick) => brick.kind === "silver")).toBe(false)
    expect(game.score).toBe(50 * game.level)
  })

  it("leaves gold in the wall", () => {
    let game: Game = {
      ...playing(),
      bricks: [{ col: 6, row: 0, kind: "gold", color: 0, hits: 1 }],
      balls: [shotAt(6, 0)],
    }
    for (let hit = 0; hit < 4; hit += 1) {
      game = step({ ...game, balls: [shotAt(6, 0)] }, IDLE)
    }
    expect(game.bricks).toEqual([{ col: 6, row: 0, kind: "gold", color: 0, hits: 1 }])
    expect(game.score).toBe(0)
    expect(game.status).toBe("playing")
  })

  it("clears the round and deals the next one when the timer ends", () => {
    const cleared = step(
      {
        ...playing(),
        wide: true,
        laser: true,
        bricks: [{ col: 6, row: 0, kind: "color", color: 0, hits: 1 }],
        balls: [shotAt(6, 0)],
      },
      IDLE,
    )
    expect(cleared.status).toBe("cleared")
    expect(cleared.score).toBe(50)
    const skipped = start(cleared)
    expect(skipped.status).toBe("playing")
    expect(skipped.level).toBe(2)
    expect(skipped.wide).toBe(false)
    expect(skipped.balls[0]?.stuck).toBe(true)

    let game = cleared
    for (let tick = 0; tick < CLEARED_TICKS; tick += 1) game = step(game, IDLE)
    expect(game.status).toBe("playing")
    expect(game.level).toBe(2)
    expect(game.lives).toBe(START_LIVES)
    expect(game.balls[0]?.stuck).toBe(true)
    expect(game.laser).toBe(false)
    expect(game.wide).toBe(false)
    expect(game.bricks.length).toBeGreaterThan(1)
  })

  it("spends a life after the dying timer and ends on the last one", () => {
    let game = step(
      {
        ...playing(),
        bricks: [],
        wide: true,
        laser: true,
        catchOn: true,
        slow: true,
        gate: true,
        disruption: true,
        balls: [falling()],
      },
      IDLE,
    )
    expect(game.status).toBe("dying")
    expect(game.lives).toBe(START_LIVES)
    expect(start(game)).toBe(game)
    for (let tick = 0; tick < DYING_TICKS; tick += 1) game = step(game, IDLE)
    expect(game.status).toBe("playing")
    expect(game.lives).toBe(START_LIVES - 1)
    expect(game.balls[0]?.stuck).toBe(true)
    expect(game.wide).toBe(false)
    expect(game.laser).toBe(false)
    expect(game.catchOn).toBe(false)
    expect(game.slow).toBe(false)
    expect(game.gate).toBe(false)
    expect(game.disruption).toBe(false)

    const over = step({ ...playing(), lives: 1, bricks: [], balls: [falling()] }, IDLE)
    expect(over.status).toBe("over")
    expect(over.lives).toBe(0)
  })

  it("applies each capsule when it lands on the paddle", () => {
    const landed = (kind: CapsuleKind) => {
      const base = playing()
      return step({ ...base, capsule: { kind, x: base.paddleX, y: PADDLE_Y * SUB } }, IDLE)
    }

    const slow = landed("slow")
    const catchBall = landed("catch")
    const expand = landed("expand")
    const laser = landed("laser")
    const opened = landed("break")
    const player = landed("player")
    const disruption = landed("disruption")

    expect(slow.capsule).toBeNull()
    expect(slow.slow).toBe(true)
    expect(catchBall.capsule).toBeNull()
    expect(catchBall.catchOn).toBe(true)
    expect(expand.capsule).toBeNull()
    expect(expand.wide).toBe(true)
    expect(laser.capsule).toBeNull()
    expect(laser.laser).toBe(true)
    expect(opened.capsule).toBeNull()
    expect(opened.gate).toBe(true)
    expect(player.capsule).toBeNull()
    expect(player.lives).toBe(START_LIVES + 1)
    expect(disruption.capsule).toBeNull()
    expect(disruption.balls).toHaveLength(3)
    expect(disruption.disruption).toBe(true)
  })

  it("does not drop a capsule while disruption is out", () => {
    const game = step(
      {
        ...playing(),
        disruption: true,
        bricks: [{ col: 6, row: 0, kind: "color", color: 3, hits: 1 }],
        balls: [shotAt(6, 0)],
        capsule: null,
      },
      IDLE,
    )
    expect(game.bricks).toHaveLength(0)
    expect(game.capsule).toBeNull()
  })

  it("adds a life when the score crosses 20000", () => {
    const game = step(
      {
        ...playing(),
        score: 19_950,
        disruption: true,
        bricks: [
          { col: 6, row: 0, kind: "color", color: 0, hits: 1 },
          { col: 0, row: 5, kind: "color", color: 1, hits: 1 },
        ],
        balls: [shotAt(6, 0)],
      },
      IDLE,
    )
    expect(game.score).toBe(20_000)
    expect(game.lives).toBe(START_LIVES + 1)
  })

  it("pays 10000 and a life when the ball leaves through the gate", () => {
    const game = step(
      {
        ...playing(),
        gate: true,
        score: 15_000,
        balls: [
          {
            id: 1,
            x: (FIELD_RIGHT - BALL_R) * SUB,
            y: 80 * SUB,
            vx: 3 * SUB,
            vy: 0,
            stuck: false,
            stuckOffset: 0,
          },
        ],
      },
      IDLE,
    )
    expect(game.status).toBe("cleared")
    expect(game.score).toBe(25_000)
    expect(game.lives).toBe(START_LIVES + 1)
  })

  it("stays in lockstep for the same seed and inputs", () => {
    const script = (tick: number) => ({
      left: tick % 50 < 25,
      right: tick % 50 >= 25,
      fire: tick % 20 === 0,
    })
    const run = () => {
      let game = start(createGame(99))
      for (let tick = 0; tick < 300; tick += 1) game = step(game, script(tick))
      return game
    }
    expect(run()).toEqual(run())
  })
})
