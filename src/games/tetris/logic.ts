export const COLUMNS = 10
export const ROWS = 20

export type PieceKind = "I" | "O" | "T" | "S" | "Z" | "J" | "L"
export type Status = "ready" | "playing" | "paused" | "over"
export type Rotation = 0 | 1 | 2 | 3
export type Cell = { x: number; y: number }
export type ActivePiece = { kind: PieceKind; rotation: Rotation; x: number; y: number }
export type LastClear = { rows: number[]; id: number }

export type Game = {
  board: (PieceKind | null)[][]
  active: ActivePiece
  next: PieceKind
  score: number
  lines: number
  level: number
  startLevel: number
  status: Status
  seed: number
  lastClear: LastClear | null
  /** Index of the most recently drawn piece (`next`). The next roll rerolls when it hits this or 7. */
  previousIndex: number
}

type Board = Game["board"]

const SPAWN_X = 3
const SPAWN_Y = 0

const O_SHAPE = [
  [1, 0],
  [2, 0],
  [1, 1],
  [2, 1],
] as const

export const SHAPES = {
  T: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  J: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
  ],
  L: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  ],
  S: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  Z: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  ],
  O: [O_SHAPE, O_SHAPE, O_SHAPE, O_SHAPE],
  I: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  ],
} as const

const GRAVITY_FRAMES = [48, 43, 38, 33, 28, 23, 18, 13, 8, 6] as const

// mulberry32. Same seed always yields the same fraction, then a new seed for the next draw.
export function random(seed: number): [number, number] {
  const nextSeed = (seed + 0x6d2b79f5) | 0
  let t = nextSeed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, nextSeed]
}

// A whole number in [0, max). The fraction is scaled and truncated, and the seed still advances.
export function randomInt(seed: number, max: number): [number, number] {
  if (max <= 0) return [0, seed]
  const [value, nextSeed] = random(seed)
  return [Math.floor(value * max), nextSeed]
}

function pieceKind(index: number): PieceKind {
  switch (index) {
    case 0:
      return "T"
    case 1:
      return "J"
    case 2:
      return "Z"
    case 3:
      return "O"
    case 4:
      return "S"
    case 5:
      return "L"
    case 6:
      return "I"
    default:
      throw new Error(`invalid piece index ${index}`)
  }
}

export function pieceCells(piece: ActivePiece): Cell[] {
  const blocks = SHAPES[piece.kind][piece.rotation]
  return blocks.map(([dx, dy]) => ({ x: piece.x + dx, y: piece.y + dy }))
}

function blocked(board: Board, cell: Cell): boolean {
  if (cell.x < 0 || cell.x >= COLUMNS || cell.y >= ROWS) return true
  if (cell.y < 0) return false
  return board[cell.y][cell.x] !== null
}

function canPlace(board: Board, piece: ActivePiece): boolean {
  for (const cell of pieceCells(piece)) {
    if (blocked(board, cell)) return false
  }
  return true
}

export function rollPiece(seed: number, previous: number | null): [PieceKind, number, number] {
  const [roll, nextSeed] = randomInt(seed, 8)
  if (roll === 7 || roll === previous) {
    const [reroll, afterReroll] = randomInt(nextSeed, 7)
    return [pieceKind(reroll), reroll, afterReroll]
  }
  return [pieceKind(roll), roll, nextSeed]
}

export function drawPiece(
  seed: number,
  previous: number | null,
): { kind: PieceKind; index: number; seed: number } {
  const [kind, index, nextSeed] = rollPiece(seed, previous)
  return { kind, index, seed: nextSeed }
}

export function gravityMs(level: number): number {
  let frames = 1
  if (level <= 9) frames = GRAVITY_FRAMES[level] ?? 1
  else if (level <= 12) frames = 5
  else if (level <= 15) frames = 4
  else if (level <= 18) frames = 3
  else if (level <= 28) frames = 2
  return Math.round((frames * 1000) / 60)
}

export function levelThreshold(startLevel: number, level: number): number {
  if (level <= startLevel) return 0
  const first = Math.min(startLevel * 10 + 10, Math.max(100, startLevel * 10 - 50))
  return first + (level - startLevel - 1) * 10
}

function linePoints(count: number): number {
  switch (count) {
    case 1:
      return 40
    case 2:
      return 100
    case 3:
      return 300
    case 4:
      return 1200
    default:
      return 0
  }
}

function emptyRow(): (PieceKind | null)[] {
  return Array.from({ length: COLUMNS }, () => null)
}

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => emptyRow())
}

function spawn(kind: PieceKind): ActivePiece {
  return { kind, rotation: 0, x: SPAWN_X, y: SPAWN_Y }
}

export function createGame(startLevel: number, seed: number): Game {
  const [activeKind, activeIndex, afterActive] = rollPiece(seed, null)
  const [nextKind, nextIndex, afterNext] = rollPiece(afterActive, activeIndex)
  return {
    board: emptyBoard(),
    active: spawn(activeKind),
    next: nextKind,
    score: 0,
    lines: 0,
    level: startLevel,
    startLevel,
    status: "ready",
    seed: afterNext,
    lastClear: null,
    previousIndex: nextIndex,
  }
}

export function start(game: Game): Game {
  if (game.status !== "ready" && game.status !== "paused") return game
  return { ...game, status: "playing" }
}

export function pause(game: Game): Game {
  if (game.status !== "playing") return game
  return { ...game, status: "paused" }
}

export function move(game: Game, delta: -1 | 1): Game {
  if (game.status !== "playing") return game
  const active = { ...game.active, x: game.active.x + delta }
  if (!canPlace(game.board, active)) return game
  return { ...game, active }
}

export function rotate(game: Game, dir: "cw" | "ccw"): Game {
  if (game.status !== "playing") return game
  const rotation = ((game.active.rotation + (dir === "cw" ? 1 : 3)) % 4) as Rotation
  const active = { ...game.active, rotation }
  if (!canPlace(game.board, active)) return game
  return { ...game, active }
}

export function softDrop(game: Game): Game {
  if (game.status !== "playing") return game
  const active = { ...game.active, y: game.active.y + 1 }
  if (!canPlace(game.board, active)) return game
  return { ...game, active, score: game.score + 1 }
}

function lock(game: Game): Game {
  const board = game.board.map((row) => row.slice())
  for (const cell of pieceCells(game.active)) {
    if (cell.y < 0 || cell.y >= ROWS || cell.x < 0 || cell.x >= COLUMNS) continue
    board[cell.y][cell.x] = game.active.kind
  }

  const rows: number[] = []
  for (let y = 0; y < ROWS; y += 1) {
    if (board[y].every((cell) => cell !== null)) rows.push(y)
  }

  let settled = board
  let lastClear: LastClear | null = null
  let score = game.score
  let lines = game.lines
  let level = game.level

  if (rows.length > 0) {
    lastClear = { rows, id: (game.lastClear?.id ?? 0) + 1 }
    const removed = new Set(rows)
    const kept = board.filter((_, y) => !removed.has(y))
    const blanks = Array.from({ length: rows.length }, () => emptyRow())
    settled = [...blanks, ...kept]
    lines += rows.length
    score += linePoints(rows.length) * (level + 1)
    while (lines >= levelThreshold(game.startLevel, level + 1)) level += 1
  }

  const [nextKind, nextIndex, seed] = rollPiece(game.seed, game.previousIndex)
  const active = spawn(game.next)
  return {
    ...game,
    board: settled,
    active,
    next: nextKind,
    score,
    lines,
    level,
    status: canPlace(settled, active) ? "playing" : "over",
    seed,
    lastClear,
    previousIndex: nextIndex,
  }
}

export function tick(game: Game): Game {
  if (game.status !== "playing") return game
  const active = { ...game.active, y: game.active.y + 1 }
  if (canPlace(game.board, active)) return { ...game, active }
  return lock(game)
}
