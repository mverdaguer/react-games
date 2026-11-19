import { describe, expect, it } from "vitest"

import {
  BALL_SCORE,
  BEAT_TICKS,
  BOUNCE_VY,
  CEILING,
  FLOOR,
  FREEZE_TICKS,
  IDLE,
  MAX_LIVES,
  MAX_VOLLEY,
  PLAYER_W,
  RADIUS,
  SLOW_TICKS,
  START_LIVES,
  WIDTH,
  createGame,
  levelLayout,
  start,
  step,
  type Ball,
  type BallSize,
  type BoostKind,
  type Drop,
  type Game,
  type Shot,
} from "@/games/pang/logic"

function playing(seed = 1): Game {
  return { ...start(createGame(seed)), invuln: 0 }
}

function withBall(game: Game, ball: Ball): Game {
  return { ...game, balls: [ball], playerX: 24, shots: [], drops: [] }
}

function ropeThrough(x: number): Shot {
  return { id: 50, x, y: 40, length: 90, stuck: 0, mode: "rope" }
}

function dropOnPlayer(game: Game, kind: BoostKind): Game {
  const drop: Drop = { id: 9, kind, x: game.playerX, y: FLOOR - 4, vy: 0, age: 0 }
  return { ...game, drops: [drop] }
}

describe("pang rules", () => {
  it("bounces each size back to the same apex", () => {
    for (const size of [0, 1, 2, 3] as const) {
      const radius = RADIUS[size]
      let game = withBall(playing(), {
        id: 1,
        size,
        x: 180,
        y: FLOOR - radius - 1,
        vx: 0.4,
        vy: -BOUNCE_VY[size],
      })
      const peaks: number[] = []
      let minY = Number.POSITIVE_INFINITY
      let climbed = false
      for (let tick = 0; tick < 5000 && peaks.length < 3; tick += 1) {
        const before = game.balls[0]
        game = step(game, IDLE)
        const ball = game.balls[0]
        expect(ball).toBeDefined()
        if (!ball || !before) break
        if (ball.y < minY) minY = ball.y
        if (ball.vy < 0) climbed = true
        if (climbed && before.vy > 0 && ball.vy === -BOUNCE_VY[size]) {
          peaks.push(minY)
          minY = Number.POSITIVE_INFINITY
          climbed = false
        }
      }
      expect(peaks).toHaveLength(3)
      const first = peaks[1] ?? 0
      const second = peaks[2] ?? 0
      expect(Math.abs(first - second)).toBeLessThan(0.01)
      expect(first).toBeGreaterThan(CEILING + radius - 1)
    }
  })

  it("splits a hit ball into two smaller ones and pops the smallest", () => {
    const parent: Ball = { id: 1, size: 1, x: 140, y: 80, vx: 0, vy: 0 }
    let game = withBall(playing(), parent)
    game = { ...game, shots: [ropeThrough(parent.x)], nextId: 60 }
    game = step(game, IDLE)
    expect(game.score).toBe(BALL_SCORE[1])
    expect(game.balls).toHaveLength(2)
    expect(game.balls.map((ball) => ball.size)).toEqual([2, 2])
    const left = game.balls[0]
    const right = game.balls[1]
    expect(left).toBeDefined()
    expect(right).toBeDefined()
    expect(left?.vx).toBeLessThan(0)
    expect(right?.vx).toBeGreaterThan(0)
    expect(left?.vy).toBeLessThan(0)
    expect(game.shots).toHaveLength(0)

    const tiny: Ball = { id: 1, size: 3, x: 140, y: 80, vx: 0, vy: 0 }
    let popped = withBall(playing(2), tiny)
    popped = { ...popped, shots: [ropeThrough(tiny.x)] }
    popped = step(popped, IDLE)
    expect(popped.balls).toHaveLength(0)
    expect(popped.score).toBe(BALL_SCORE[3] + popped.level * 500)
    expect(popped.status).toBe("cleared")
  })

  it("loses a life when a ball touches the player, unless the shield holds", () => {
    const game = playing()
    const ball: Ball = { id: 1, size: 3, x: game.playerX, y: FLOOR - 8, vx: 0, vy: 0 }
    const hit = step({ ...game, balls: [ball], shots: [] }, IDLE)
    expect(hit.status).toBe("dying")
    expect(hit.lives).toBe(START_LIVES - 1)
    expect(hit.weapon).toBe("harpoon")

    const shielded = step({ ...game, shield: true, balls: [ball], shots: [] }, IDLE)
    expect(shielded.status).toBe("playing")
    expect(shielded.lives).toBe(START_LIVES)
    expect(shielded.shield).toBe(false)
    expect(shielded.invuln).toBeGreaterThan(0)
  })

  it("starts balls clear of the player and moving away", () => {
    const center = WIDTH / 2
    for (const level of [1, 2, 7, 20, 40]) {
      for (const ball of levelLayout(level)) {
        const clearance = RADIUS[ball.size] + PLAYER_W / 2
        expect(Math.abs(ball.x - center)).toBeGreaterThanOrEqual(clearance)
        expect(Math.sign(ball.vx)).toBe(ball.x < center ? -1 : 1)
      }
    }
  })

  it("does not drop a ball on the player during the opening second", () => {
    let game = playing(11)
    expect(game.shield).toBe(false)
    expect(game.invuln).toBe(0)
    for (let tick = 0; tick < 60; tick += 1) game = step(game, IDLE)
    expect(game.status).toBe("playing")
    expect(game.lives).toBe(START_LIVES)
  })

  it("puts exactly level balls inside the arena", () => {
    for (const level of [1, 2, 7, 20, 40]) {
      const balls = levelLayout(level)
      expect(balls).toHaveLength(level)
      for (const ball of balls) {
        const radius = RADIUS[ball.size]
        expect(ball.x).toBeGreaterThanOrEqual(radius)
        expect(ball.x).toBeLessThanOrEqual(WIDTH - radius)
        expect(ball.y).toBeGreaterThanOrEqual(CEILING + radius)
        expect(ball.y).toBeLessThanOrEqual(FLOOR - radius)
      }
    }
  })

  it("opens the next level with one more ball after a clear", () => {
    let game: Game = { ...playing(4), balls: [], shots: [], score: 20 }
    game = step(game, IDLE)
    expect(game.status).toBe("cleared")
    expect(game.score).toBe(20 + 500)
    for (let tick = 0; tick < BEAT_TICKS - 1; tick += 1) {
      game = step(game, IDLE)
      expect(game.status).toBe("cleared")
    }
    game = step(game, IDLE)
    expect(game.status).toBe("playing")
    expect(game.level).toBe(2)
    expect(game.balls).toHaveLength(2)
    expect(game.score).toBe(520)
  })

  it("adds one shot each time the double boost is picked up", () => {
    let game = playing(8)
    const fire = { ...IDLE, fire: true }
    for (let count = 2; count <= 4; count += 1) {
      game = step(dropOnPlayer(game, "double"), IDLE)
      expect(game.volley).toBe(count)
      expect(game.weapon).toBe("harpoon")
    }

    game = {
      ...game,
      balls: [{ id: 1, size: 3, x: 24, y: 40, vx: 0, vy: 0 }],
    }
    for (let shot = 0; shot < game.volley; shot += 1) {
      game = step(game, fire)
      game = step(game, IDLE)
    }
    expect(game.shots).toHaveLength(4)
    game = step(game, fire)
    expect(game.shots).toHaveLength(4)

    const capped = step(dropOnPlayer({ ...playing(8), volley: MAX_VOLLEY }, "double"), IDLE)
    expect(capped.volley).toBe(MAX_VOLLEY)
  })

  it("applies every boost", () => {
    const base = playing(8)
    const kinds: BoostKind[] = ["double", "wire", "gun", "shield", "freeze", "slow", "life"]
    for (const kind of kinds) {
      const next = step(dropOnPlayer({ ...base, balls: base.balls }, kind), IDLE)
      const weaponBoost = kind === "wire" || kind === "gun"
      expect(next.drops).toHaveLength(0)
      expect(next.weapon).toBe(weaponBoost ? kind : "harpoon")
      expect(next.volley).toBe(kind === "double" ? 2 : 1)
      expect(next.shield).toBe(kind === "shield")
      expect(next.freeze).toBe(kind === "freeze" ? FREEZE_TICKS : 0)
      expect(next.slow).toBe(kind === "slow" ? SLOW_TICKS : 0)
      expect(next.lives).toBe(kind === "life" ? START_LIVES + 1 : START_LIVES)
    }

    const capped = step(dropOnPlayer({ ...base, lives: MAX_LIVES }, "life"), IDLE)
    expect(capped.lives).toBe(MAX_LIVES)

    const armed = dropOnPlayer(
      {
        ...base,
        balls: [{ id: 1, size: 0 as BallSize, x: 200, y: 60, vx: 0, vy: 0 }],
        score: 0,
      },
      "dynamite",
    )
    const blown = step(armed, IDLE)
    expect(blown.balls.every((ball) => ball.size === 3)).toBe(true)
    expect(blown.balls.length).toBeGreaterThanOrEqual(2)
    expect(blown.score).toBe(BALL_SCORE[0])
  })

  it("freezes balls and replays the same level after a death", () => {
    let game = dropOnPlayer(playing(3), "freeze")
    const before = game.balls.map((ball) => ({ x: ball.x, y: ball.y }))
    game = step(game, IDLE)
    const frozen = game.balls.map((ball) => ({ x: ball.x, y: ball.y }))
    game = step(game, IDLE)
    expect(game.balls.map((ball) => ({ x: ball.x, y: ball.y }))).toEqual(frozen)
    expect(frozen).not.toEqual(before)

    let dying = playing(5)
    dying = step(
      {
        ...dying,
        volley: 4,
        balls: [{ id: 1, size: 3, x: dying.playerX, y: FLOOR - 8, vx: 0, vy: 0 }],
      },
      IDLE,
    )
    expect(dying.status).toBe("dying")
    const score = dying.score
    for (let tick = 0; tick < BEAT_TICKS; tick += 1) dying = step(dying, IDLE)
    expect(dying.status).toBe("playing")
    expect(dying.level).toBe(1)
    expect(dying.balls).toHaveLength(1)
    expect(dying.score).toBe(score)
    expect(dying.lives).toBe(START_LIVES - 1)
    expect(dying.volley).toBe(1)
  })

  it("replays the same game from the same seed", () => {
    const script = (tick: number) => ({
      left: tick % 40 < 20,
      right: tick % 40 >= 20,
      fire: tick % 15 === 0,
    })
    const run = () => {
      let game = start(createGame(2026))
      const trace = []
      for (let tick = 0; tick < 240; tick += 1) {
        game = step(game, script(tick))
        trace.push([game.status, game.score, game.level, game.balls.length, game.playerX])
      }
      return trace
    }
    expect(run()).toEqual(run())
  })

  it("uses the same balls for a stage in every game", () => {
    const placed = (seed: number) =>
      createGame(seed).balls.map(({ size, x, y, vx, vy }) => ({ size, x, y, vx, vy }))
    expect(placed(1)).toEqual(placed(99))
    expect(placed(1)).toEqual(placed(2026))
    expect(levelLayout(12)).toEqual(levelLayout(12))
    expect(levelLayout(12)).not.toEqual(levelLayout(13))
  })
})
