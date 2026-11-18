import { describe, expect, it } from "vitest"

import {
  BONUS_KINDS,
  BONUS_TICKS,
  COLUMNS,
  INITIAL_LENGTH,
  LEVELS,
  ROWS,
  appleAhead,
  bonusPoints,
  createGame,
  crossesEdge,
  delta,
  isOpposite,
  neighborDirection,
  pause,
  queueTurn,
  random,
  randomInt,
  start,
  step,
  tickMs,
  togglePause,
  wrap,
  type Game,
  type Point,
} from "@/games/snake/logic"

function makeGame(overrides: Partial<Game> = {}): Game {
  return { ...createGame(1, 1), ...overrides }
}

function covers(points: readonly Point[], point: Point): boolean {
  return points.some((part) => part.x === point.x && part.y === point.y)
}

describe("createGame", () => {
  it("deals the same board for the same seed", () => {
    const game = createGame(1, 1)
    expect(game).toEqual(createGame(1, 1))
    expect(game.columns).toBe(COLUMNS)
    expect(game.rows).toBe(ROWS)
    expect(game.level).toBe(1)
    expect(game.status).toBe("ready")
    expect(game.direction).toBe("right")
    expect(game.snake).toHaveLength(INITIAL_LENGTH)
    expect(game.snake).toEqual([
      { x: 8, y: 6 },
      { x: 7, y: 6 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
    ])
    expect(game.pending).toEqual([])
    expect(game.meals).toEqual([])
    expect(game.vacated).toBeNull()
    expect(game.bonus).toBeNull()
    expect(game.applesEaten).toBe(0)
    expect(game.score).toBe(0)
    expect(game.apple).toEqual({ x: 5, y: 8 })
    expect(game.seed).toBe(1831565814)
    expect(game.apple).not.toBeNull()
    for (const part of game.snake) expect(game.apple).not.toEqual(part)
  })
})

describe("random", () => {
  it("runs mulberry32 from the updated seed", () => {
    expect(random(1)).toEqual([0.6270739405881613, 1831565814])
    expect(random(1)).toEqual(random(1))
  })

  it("returns an integer below max and keeps the seed when max is not positive", () => {
    expect(randomInt(5, 0)).toEqual([0, 5])
    expect(randomInt(5, -2)).toEqual([0, 5])
    let seed = 1
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const [n, nextSeed] = randomInt(seed, 7)
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(7)
      seed = nextSeed
    }
  })
})

describe("tickMs", () => {
  it("looks up the level speeds", () => {
    expect(tickMs(1)).toBe(400)
    expect(tickMs(5)).toBe(205)
    expect(tickMs(9)).toBe(95)
    expect(LEVELS.map((level) => tickMs(level))).toEqual([
      400, 340, 290, 245, 205, 170, 140, 115, 95,
    ])
  })
})

describe("geometry", () => {
  it("wraps coordinates onto the board", () => {
    expect(wrap({ x: -1, y: -1 }, COLUMNS, ROWS)).toEqual({ x: 23, y: 12 })
    expect(wrap({ x: COLUMNS, y: ROWS }, COLUMNS, ROWS)).toEqual({ x: 0, y: 0 })
  })

  it("knows opposites and one-cell deltas", () => {
    expect(isOpposite("up", "down")).toBe(true)
    expect(isOpposite("down", "up")).toBe(true)
    expect(isOpposite("left", "right")).toBe(true)
    expect(isOpposite("right", "left")).toBe(true)
    expect(isOpposite("up", "left")).toBe(false)
    expect(delta("up")).toEqual({ x: 0, y: -1 })
    expect(delta("down")).toEqual({ x: 0, y: 1 })
    expect(delta("left")).toEqual({ x: -1, y: 0 })
    expect(delta("right")).toEqual({ x: 1, y: 0 })
  })

  it("names the wrap-aware neighbour and rejects diagonals and the same cell", () => {
    expect(neighborDirection({ x: 0, y: 0 }, { x: 23, y: 0 }, COLUMNS, ROWS)).toBe("left")
    expect(neighborDirection({ x: 23, y: 0 }, { x: 0, y: 0 }, COLUMNS, ROWS)).toBe("right")
    expect(neighborDirection({ x: 0, y: 0 }, { x: 0, y: 12 }, COLUMNS, ROWS)).toBe("up")
    expect(neighborDirection({ x: 0, y: 12 }, { x: 0, y: 0 }, COLUMNS, ROWS)).toBe("down")
    expect(neighborDirection({ x: 1, y: 1 }, { x: 2, y: 1 }, COLUMNS, ROWS)).toBe("right")
    expect(neighborDirection({ x: 0, y: 0 }, { x: 1, y: 1 }, COLUMNS, ROWS)).toBeNull()
    expect(neighborDirection({ x: 2, y: 2 }, { x: 2, y: 2 }, COLUMNS, ROWS)).toBeNull()
  })

  it("flags a raw jump across more than one cell", () => {
    expect(crossesEdge({ x: 0, y: 0 }, { x: 23, y: 0 })).toBe(true)
    expect(crossesEdge({ x: 1, y: 1 }, { x: 2, y: 1 })).toBe(false)
  })
})

describe("queueTurn", () => {
  it("rejects the same direction, the opposite, a full queue, and a finished game", () => {
    const facingUp = makeGame({ direction: "up", pending: [], status: "ready" })
    expect(queueTurn(facingUp, "up")).toBe(facingUp)
    expect(queueTurn(facingUp, "down")).toBe(facingUp)

    const right = queueTurn(facingUp, "right")
    expect(right.pending).toEqual(["right"])
    const up = queueTurn(right, "up")
    expect(up.pending).toEqual(["right", "up"])
    expect(queueTurn(up, "down")).toBe(up)
    expect(queueTurn(up, "left")).toBe(up)

    const paused = makeGame({ direction: "up", status: "paused" })
    expect(queueTurn(paused, "right").pending).toEqual(["right"])

    const over = makeGame({ status: "over", direction: "up" })
    expect(queueTurn(over, "right")).toBe(over)
    const won = makeGame({ status: "won", apple: null, direction: "up" })
    expect(queueTurn(won, "right")).toBe(won)
  })
})

describe("start and pause", () => {
  it("starts from ready or paused, pauses from playing, and otherwise returns the same game", () => {
    const ready = createGame(1, 1)
    expect(pause(ready)).toBe(ready)
    expect(togglePause(ready)).toBe(ready)

    const playing = start(ready)
    expect(playing.status).toBe("playing")
    expect(playing.pending).toEqual(ready.pending)
    expect(start(playing)).toBe(playing)

    const paused = pause(playing)
    expect(paused.status).toBe("paused")
    expect(pause(paused)).toBe(paused)
    expect(start(paused).status).toBe("playing")

    const toggled = togglePause(playing)
    expect(toggled.status).toBe("paused")
    expect(togglePause(toggled).status).toBe("playing")

    const over = makeGame({ status: "over" })
    expect(start(over)).toBe(over)
    expect(pause(over)).toBe(over)
    expect(togglePause(over)).toBe(over)
    const won = makeGame({ status: "won", apple: null })
    expect(togglePause(won)).toBe(won)
  })
})

describe("step", () => {
  it("does nothing until the game is playing", () => {
    const ready = createGame(1, 1)
    expect(step(ready)).toBe(ready)
    const paused = makeGame({ status: "paused" })
    expect(step(paused)).toBe(paused)
    const over = makeGame({ status: "over" })
    expect(step(over)).toBe(over)
    const won = makeGame({ status: "won", apple: null })
    expect(step(won)).toBe(won)
  })

  it("follows one queued turn and leaves the old tail vacated", () => {
    const game = start(makeGame({ apple: { x: 0, y: 0 } }))
    const queued = queueTurn(game, "up")
    const next = step(queued)
    expect(next.snake).toEqual([
      { x: 8, y: 5 },
      { x: 8, y: 6 },
      { x: 7, y: 6 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ])
    expect(next.snake).toHaveLength(INITIAL_LENGTH)
    expect(next.vacated).toEqual({ x: 4, y: 6 })
    expect(next.direction).toBe("up")
    expect(next.pending).toEqual([])
    expect(next.status).toBe("playing")
    expect(queued.snake).toEqual(game.snake)
    expect(queued.pending).toEqual(["up"])
  })

  it.each([
    {
      edge: "right",
      snake: [
        { x: 23, y: 6 },
        { x: 22, y: 6 },
      ],
      direction: "right" as const,
      head: { x: 0, y: 6 },
    },
    {
      edge: "left",
      snake: [
        { x: 0, y: 6 },
        { x: 1, y: 6 },
      ],
      direction: "left" as const,
      head: { x: 23, y: 6 },
    },
    {
      edge: "up",
      snake: [
        { x: 8, y: 0 },
        { x: 8, y: 1 },
      ],
      direction: "up" as const,
      head: { x: 8, y: 12 },
    },
    {
      edge: "down",
      snake: [
        { x: 8, y: 12 },
        { x: 8, y: 11 },
      ],
      direction: "down" as const,
      head: { x: 8, y: 0 },
    },
  ])("wraps the head off the $edge edge", ({ snake, direction, head }) => {
    const game = makeGame({
      status: "playing",
      snake,
      direction,
      apple: { x: 12, y: 3 },
      pending: [],
    })
    const next = step(game)
    expect(next.status).toBe("playing")
    expect(next.snake[0]).toEqual(head)
    expect(next.snake).toHaveLength(snake.length)
  })

  it("plays the first queued turn before the second, so up-then-left does not reverse", () => {
    let game = makeGame({ status: "playing", apple: { x: 0, y: 0 } })
    game = queueTurn(game, "up")
    game = queueTurn(game, "left")
    expect(game.pending).toEqual(["up", "left"])
    game = step(game)
    expect(game.snake[0]).toEqual({ x: 8, y: 5 })
    expect(game.pending).toEqual(["left"])
    expect(game.status).toBe("playing")
    game = step(game)
    expect(game.snake[0]).toEqual({ x: 7, y: 5 })
    expect(game.direction).toBe("left")
    expect(game.pending).toEqual([])
    expect(game.status).toBe("playing")
  })

  it("grows and scores the level when the head takes the apple", () => {
    const game = makeGame({
      level: 3,
      status: "playing",
      apple: { x: 9, y: 6 },
      score: 0,
      meals: [],
      applesEaten: 0,
      bonus: null,
    })
    const next = step(game)
    expect(next.snake).toHaveLength(INITIAL_LENGTH + 1)
    expect(next.snake[0]).toEqual({ x: 9, y: 6 })
    expect(next.score).toBe(3)
    expect(next.meals).toContain(0)
    expect(next.vacated).toBeNull()
    expect(next.applesEaten).toBe(1)
    expect(next.status).toBe("playing")
    expect(next.apple).not.toBeNull()
    for (const part of next.snake) expect(next.apple).not.toEqual(part)
    expect(game.snake).toHaveLength(INITIAL_LENGTH)
  })

  it("walks a swallowed meal down the body and drops it at the tail", () => {
    const meals = [0]
    let game = makeGame({ status: "playing", meals, apple: { x: 0, y: 0 } })
    for (let index = 1; index < game.snake.length; index += 1) {
      game = step(game)
      expect(game.meals).toEqual([index])
      expect(game.status).toBe("playing")
    }
    game = step(game)
    expect(game.meals).toEqual([])
    expect(meals).toEqual([0])
  })

  it("may enter the cell the tail is leaving", () => {
    const snake = [
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ]
    const game = makeGame({
      status: "playing",
      direction: "right",
      snake,
      apple: { x: 0, y: 0 },
      pending: [],
    })
    const next = step(game)
    expect(next.status).toBe("playing")
    expect(next.snake).toHaveLength(snake.length)
    expect(next.snake[0]).toEqual({ x: 6, y: 6 })
    expect(next.vacated).toEqual({ x: 6, y: 6 })
  })

  it("dies when growth keeps the tail in the way", () => {
    const snake = [
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ]
    const game = makeGame({
      status: "playing",
      direction: "right",
      snake,
      apple: { x: 6, y: 6 },
      pending: [],
    })
    const next = step(game)
    expect(next.status).toBe("over")
    expect(next.snake).toBe(snake)
    expect(next.vacated).toBeNull()
    expect(next.pending).toEqual([])
    expect(next.direction).toBe("right")
  })

  it("ends when a three-turn coil lands on the body", () => {
    let game = makeGame({ status: "playing", apple: { x: 0, y: 0 } })
    game = step(queueTurn(game, "up"))
    expect(game.snake[0]).toEqual({ x: 8, y: 5 })
    game = step(queueTurn(game, "left"))
    expect(game.snake[0]).toEqual({ x: 7, y: 5 })
    expect(game.status).toBe("playing")
    const before = game
    game = step(queueTurn(game, "down"))
    expect(game.status).toBe("over")
    expect(game.snake).toBe(before.snake)
    expect(game.direction).toBe("down")
    expect(game.pending).toEqual([])
    expect(game.vacated).toBeNull()
  })

  it("spawns a bonus on the fifth apple and retires it after 20 ticks", () => {
    const game = makeGame({
      status: "playing",
      applesEaten: 4,
      apple: { x: 9, y: 6 },
      bonus: null,
    })
    const spawned = step(game)
    const bonus = spawned.bonus
    expect(bonus).not.toBeNull()
    if (!bonus) return
    expect(bonus.ticksLeft).toBe(BONUS_TICKS)
    expect(bonus.at.x).toBeLessThanOrEqual(spawned.columns - 2)
    expect(bonus.kind).toBeGreaterThanOrEqual(0)
    expect(bonus.kind).toBeLessThan(BONUS_KINDS)
    const cells = [bonus.at, { x: bonus.at.x + 1, y: bonus.at.y }]
    for (const cell of cells) {
      expect(covers(spawned.snake, cell)).toBe(false)
      expect(spawned.apple).not.toEqual(cell)
    }
    expect(spawned.apple).not.toBeNull()
    expect(spawned.applesEaten).toBe(5)

    let current = spawned
    for (let ticksLeft = BONUS_TICKS; ticksLeft > 0; ticksLeft -= 1) {
      expect(current.bonus?.ticksLeft).toBe(ticksLeft)
      expect(current.status).toBe("playing")
      current = step(current)
    }
    expect(current.bonus).toBeNull()
    expect(current.status).toBe("playing")
  })

  it("does not spawn another bonus while one is still on the board", () => {
    const game = makeGame({
      status: "playing",
      applesEaten: 4,
      apple: { x: 9, y: 6 },
      bonus: { at: { x: 0, y: 0 }, kind: 1, ticksLeft: 10 },
    })
    const next = step(game)
    expect(next.bonus).toEqual({ at: { x: 0, y: 0 }, kind: 1, ticksLeft: 9 })
    expect(next.applesEaten).toBe(5)
  })

  it("scores the first bonus cell from the ticks still showing", () => {
    const ticksLeft = 20
    const game = makeGame({
      level: 2,
      status: "playing",
      score: 0,
      apple: { x: 0, y: 0 },
      bonus: { at: { x: 9, y: 6 }, kind: 0, ticksLeft },
    })
    const next = step(game)
    expect(next.score).toBe(bonusPoints(2, ticksLeft))
    expect(next.bonus).toBeNull()
    expect(next.status).toBe("playing")
    expect(next.snake[0]).toEqual({ x: 9, y: 6 })
    expect(next.vacated).toBeNull()
  })

  it("scores the second bonus cell the same way", () => {
    const ticksLeft = 20
    const game = makeGame({
      level: 2,
      status: "playing",
      score: 0,
      apple: { x: 0, y: 0 },
      bonus: { at: { x: 8, y: 6 }, kind: 2, ticksLeft },
    })
    const next = step(game)
    expect(next.score).toBe(bonusPoints(2, ticksLeft))
    expect(next.bonus).toBeNull()
    expect(next.status).toBe("playing")
    expect(next.snake[0]).toEqual({ x: 9, y: 6 })
  })

  it("wins when the apple fills the last open cell", () => {
    const snake = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]
    const game = makeGame({
      columns: 3,
      rows: 2,
      status: "playing",
      direction: "right",
      snake,
      apple: { x: 1, y: 0 },
      applesEaten: 0,
      bonus: null,
      pending: [],
    })
    const next = step(game)
    expect(next.status).toBe("won")
    expect(next.apple).toBeNull()
    expect(next.snake).toHaveLength(6)
    expect(next.bonus).toBeNull()
  })
})

describe("bonusPoints", () => {
  it("pays 10x level at 20 ticks and 5x level at 1 tick", () => {
    expect(bonusPoints(2, 20)).toBe(20)
    expect(bonusPoints(2, 1)).toBe(10)
  })
})

describe("appleAhead", () => {
  it("looks one step along the queued direction at the apple or either bonus cell", () => {
    expect(appleAhead(makeGame({ apple: { x: 9, y: 6 }, bonus: null }))).toBe(true)
    expect(appleAhead(makeGame({ apple: { x: 0, y: 0 }, bonus: null }))).toBe(false)
    expect(appleAhead(makeGame({ apple: null, bonus: null, status: "won" }))).toBe(false)
    expect(
      appleAhead(
        makeGame({
          apple: { x: 0, y: 0 },
          bonus: { at: { x: 9, y: 6 }, kind: 0, ticksLeft: 4 },
        }),
      ),
    ).toBe(true)
    expect(
      appleAhead(
        makeGame({
          apple: { x: 0, y: 0 },
          bonus: { at: { x: 8, y: 6 }, kind: 0, ticksLeft: 4 },
        }),
      ),
    ).toBe(true)
    const queued = queueTurn(
      makeGame({ apple: { x: 8, y: 5 }, direction: "right", bonus: null }),
      "up",
    )
    expect(appleAhead(queued)).toBe(true)
  })
})
