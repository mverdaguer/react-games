export const COLUMNS = 24
export const ROWS = 13
export const INITIAL_LENGTH = 5
export const APPLES_PER_BONUS = 5
export const BONUS_TICKS = 20
export const BONUS_KINDS = 4
export const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export type Level = (typeof LEVELS)[number]
export type Direction = "up" | "down" | "left" | "right"
export type Point = { x: number; y: number }
export type Status = "ready" | "playing" | "paused" | "over" | "won"
export type Bonus = { at: Point; kind: number; ticksLeft: number }

export type Game = {
  columns: number
  rows: number
  level: Level
  snake: Point[]
  direction: Direction
  pending: Direction[]
  apple: Point | null
  bonus: Bonus | null
  applesEaten: number
  score: number
  meals: number[]
  vacated: Point | null
  status: Status
  seed: number
}

const TICK_MS = [400, 340, 290, 245, 205, 170, 140, 115, 95] as const

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
}

export function tickMs(level: Level): number {
  return TICK_MS[level - 1]
}

export function random(seed: number): [number, number] {
  const nextSeed = (seed + 0x6d2b79f5) | 0
  let t = nextSeed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, nextSeed]
}

export function randomInt(seed: number, max: number): [number, number] {
  if (max <= 0) return [0, seed]
  const [value, nextSeed] = random(seed)
  return [Math.floor(value * max), nextSeed]
}

export function wrap(point: Point, columns: number, rows: number): Point {
  return {
    x: ((point.x % columns) + columns) % columns,
    y: ((point.y % rows) + rows) % rows,
  }
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b
}

export function delta(dir: Direction): Point {
  switch (dir) {
    case "up":
      return { x: 0, y: -1 }
    case "down":
      return { x: 0, y: 1 }
    case "left":
      return { x: -1, y: 0 }
    case "right":
      return { x: 1, y: 0 }
  }
}

function wrappedDelta(distance: number, size: number): number {
  const mod = ((distance % size) + size) % size
  return mod > size / 2 ? mod - size : mod
}

export function neighborDirection(
  from: Point,
  to: Point,
  columns: number,
  rows: number,
): Direction | null {
  const dx = wrappedDelta(to.x - from.x, columns)
  const dy = wrappedDelta(to.y - from.y, rows)
  if (dx === 0 && dy === -1) return "up"
  if (dx === 0 && dy === 1) return "down"
  if (dx === -1 && dy === 0) return "left"
  if (dx === 1 && dy === 0) return "right"
  return null
}

export function crossesEdge(from: Point, to: Point): boolean {
  return Math.abs(to.x - from.x) > 1 || Math.abs(to.y - from.y) > 1
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

function contains(points: readonly Point[], point: Point): boolean {
  for (const candidate of points) {
    if (samePoint(candidate, point)) return true
  }
  return false
}

function pointKey(x: number, y: number): string {
  return `${x},${y}`
}

function pointSet(points: readonly Point[]): Set<string> {
  const keys = new Set<string>()
  for (const point of points) keys.add(pointKey(point.x, point.y))
  return keys
}

function freeCells(columns: number, rows: number, blocked: readonly Point[]): Point[] {
  const taken = pointSet(blocked)
  const cells: Point[] = []
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (!taken.has(pointKey(x, y))) cells.push({ x, y })
    }
  }
  return cells
}

function bonusSpots(columns: number, rows: number, blocked: readonly Point[]): Point[] {
  const taken = pointSet(blocked)
  const spots: Point[] = []
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x <= columns - 2; x += 1) {
      if (taken.has(pointKey(x, y)) || taken.has(pointKey(x + 1, y))) continue
      spots.push({ x, y })
    }
  }
  return spots
}

function pickCell(
  seed: number,
  blocked: readonly Point[],
  columns: number,
  rows: number,
): [Point | null, number] {
  const free = freeCells(columns, rows, blocked)
  if (free.length === 0) return [null, seed]
  const [index, nextSeed] = randomInt(seed, free.length)
  return [free[index] ?? null, nextSeed]
}

function advance(point: Point, dir: Direction, columns: number, rows: number): Point {
  const move = delta(dir)
  return wrap({ x: point.x + move.x, y: point.y + move.y }, columns, rows)
}

export function createGame(level: Level, seed: number): Game {
  const y = Math.floor(ROWS / 2)
  const snake: Point[] = []
  for (let index = 0; index < INITIAL_LENGTH; index += 1) {
    snake.push({ x: 8 - index, y })
  }
  const [apple, nextSeed] = pickCell(seed, snake, COLUMNS, ROWS)
  return {
    columns: COLUMNS,
    rows: ROWS,
    level,
    snake,
    direction: "right",
    pending: [],
    apple,
    bonus: null,
    applesEaten: 0,
    score: 0,
    meals: [],
    vacated: null,
    status: "ready",
    seed: nextSeed,
  }
}

export function queueTurn(game: Game, dir: Direction): Game {
  if (game.status === "over" || game.status === "won") return game
  const facing = game.pending.at(-1) ?? game.direction
  if (dir === facing || isOpposite(dir, facing)) return game
  if (game.pending.length >= 2) return game
  return { ...game, pending: [...game.pending, dir] }
}

export function start(game: Game): Game {
  if (game.status !== "ready" && game.status !== "paused") return game
  return { ...game, status: "playing" }
}

export function pause(game: Game): Game {
  if (game.status !== "playing") return game
  return { ...game, status: "paused" }
}

export function togglePause(game: Game): Game {
  if (game.status === "playing") return { ...game, status: "paused" }
  if (game.status === "paused") return { ...game, status: "playing" }
  return game
}

export function bonusPoints(level: Level, ticksLeft: number): number {
  return level * (5 + Math.floor(ticksLeft / 4))
}

export function appleAhead(game: Game): boolean {
  if (game.apple === null && game.bonus === null) return false
  const head = game.snake[0]
  if (!head) return false
  const next = advance(head, game.pending[0] ?? game.direction, game.columns, game.rows)
  if (game.apple !== null && samePoint(next, game.apple)) return true
  if (game.bonus === null) return false
  return (
    samePoint(next, game.bonus.at) ||
    samePoint(next, { x: game.bonus.at.x + 1, y: game.bonus.at.y })
  )
}

export function step(game: Game): Game {
  if (game.status !== "playing") return game

  const dir = game.pending[0] ?? game.direction
  const pending = game.pending.slice(1)
  const origin = game.snake[0]
  if (!origin) return game
  const head = advance(origin, dir, game.columns, game.rows)
  const eatsApple = game.apple !== null && samePoint(head, game.apple)
  const eatsBonus =
    game.bonus !== null &&
    (samePoint(head, game.bonus.at) ||
      samePoint(head, { x: game.bonus.at.x + 1, y: game.bonus.at.y }))
  const grows = eatsApple || eatsBonus
  const blocking = grows ? game.snake : game.snake.slice(0, -1)
  if (contains(blocking, head)) {
    return { ...game, direction: dir, pending: [], status: "over", vacated: null }
  }

  const newSnake = [head, ...blocking]
  const vacated = grows ? null : (game.snake[game.snake.length - 1] ?? null)
  let score = game.score
  if (eatsApple) score += game.level
  if (eatsBonus && game.bonus) score += bonusPoints(game.level, game.bonus.ticksLeft)

  const meals = game.meals.map((index) => index + 1).filter((index) => index < newSnake.length)
  if (grows) meals.push(0)

  let bonus = game.bonus
  if (eatsBonus) bonus = null
  else if (bonus) {
    const ticksLeft = bonus.ticksLeft - 1
    bonus = ticksLeft > 0 ? { ...bonus, ticksLeft } : null
  }

  let apple = game.apple
  let applesEaten = game.applesEaten
  let status: Status = "playing"
  let seed = game.seed

  if (eatsApple) {
    applesEaten += 1
    const blocked = bonus
      ? [...newSnake, bonus.at, { x: bonus.at.x + 1, y: bonus.at.y }]
      : newSnake
    const free = freeCells(game.columns, game.rows, blocked)
    if (free.length === 0) {
      apple = null
      status = "won"
    } else {
      const [index, nextSeed] = randomInt(seed, free.length)
      seed = nextSeed
      apple = free[index] ?? null
      if (apple !== null && applesEaten % APPLES_PER_BONUS === 0 && bonus === null) {
        const spots = bonusSpots(game.columns, game.rows, [...newSnake, apple])
        if (spots.length > 0) {
          const [spotIndex, afterSpot] = randomInt(seed, spots.length)
          const [kind, afterKind] = randomInt(afterSpot, BONUS_KINDS)
          seed = afterKind
          const at = spots[spotIndex]
          if (at) bonus = { at, kind, ticksLeft: BONUS_TICKS }
        }
      }
    }
  }

  return {
    ...game,
    snake: newSnake,
    direction: dir,
    pending,
    apple,
    bonus,
    applesEaten,
    score,
    meals,
    vacated,
    status,
    seed,
  }
}
