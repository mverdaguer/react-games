export type Level = "beginner" | "intermediate" | "expert"

export const LEVELS: Record<
  Level,
  { label: string; columns: number; rows: number; mines: number }
> = {
  beginner: { label: "Beginner", columns: 9, rows: 9, mines: 10 },
  intermediate: { label: "Intermediate", columns: 16, rows: 16, mines: 40 },
  expert: { label: "Expert", columns: 30, rows: 16, mines: 99 },
}

export type Mark = "none" | "flag" | "question"

export type Cell = {
  mine: boolean
  adjacent: number
  revealed: boolean
  mark: Mark
  exploded: boolean
}

export type Status = "ready" | "playing" | "won" | "lost"

export type Game = {
  level: Level
  columns: number
  rows: number
  mines: number
  cells: Cell[]
  status: Status
}

const nextMark: Record<Mark, Mark> = {
  none: "flag",
  flag: "question",
  question: "none",
}

function blankCell(): Cell {
  return {
    mine: false,
    adjacent: 0,
    revealed: false,
    mark: "none",
    exploded: false,
  }
}

export function createGame(level: Level): Game {
  const { columns, rows, mines } = LEVELS[level]
  const cells: Cell[] = []
  for (let i = 0; i < columns * rows; i++) cells.push(blankCell())
  return { level, columns, rows, mines, cells, status: "ready" }
}

export function neighbors(game: Game, index: number): number[] {
  const { columns, rows } = game
  if (!Number.isInteger(index) || index < 0 || index >= columns * rows) return []
  const row = Math.floor(index / columns)
  const col = index % columns
  const found: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    const nextRow = row + dr
    if (nextRow < 0 || nextRow >= rows) continue
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nextCol = col + dc
      if (nextCol < 0 || nextCol >= columns) continue
      found.push(nextRow * columns + nextCol)
    }
  }
  return found
}

function placeMines(game: Game, safeIndex: number): Cell[] {
  const total = game.cells.length
  const pool: number[] = []
  for (let i = 0; i < total; i++) {
    if (i !== safeIndex) pool.push(i)
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = pool[i]
    pool[i] = pool[j]
    pool[j] = swap
  }
  const mines = new Set(pool.slice(0, game.mines))
  const cells = game.cells.slice()
  const adjacent = Array.from({ length: total }, () => 0)
  for (const mine of mines) {
    for (const neighbor of neighbors(game, mine)) adjacent[neighbor]++
  }
  for (let i = 0; i < total; i++) {
    const mine = mines.has(i)
    const count = adjacent[i]
    if (!mine && count === 0) continue
    cells[i] = { ...cells[i], mine, adjacent: count }
  }
  return cells
}

function flood(game: Game, cells: Cell[], start: number) {
  const stack: number[] = [start]
  let index = stack.pop()
  while (index !== undefined) {
    const cell = cells[index]
    if (!cell.revealed && cell.mark !== "flag" && !cell.mine) {
      cells[index] =
        cell.mark === "question"
          ? { ...cell, revealed: true, mark: "none" }
          : { ...cell, revealed: true }
      if (cell.adjacent === 0) {
        for (const neighbor of neighbors(game, index)) {
          const next = cells[neighbor]
          if (!next.revealed && next.mark !== "flag" && !next.mine) stack.push(neighbor)
        }
      }
    }
    index = stack.pop()
  }
}

function revealMines(cells: Cell[], exploded: readonly number[]) {
  const explodedSet = new Set(exploded)
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    if (!cell.mine || cell.mark === "flag") continue
    const isExploded = explodedSet.has(i)
    if (cell.revealed && cell.exploded === isExploded && cell.mark === "none") continue
    cells[i] = { ...cell, revealed: true, exploded: isExploded, mark: "none" }
  }
}

function flagMines(cells: Cell[]) {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    if (!cell.mine || cell.mark === "flag") continue
    cells[i] = { ...cell, mark: "flag" }
  }
}

function safeCellsRevealed(cells: Cell[]) {
  for (const cell of cells) {
    if (!cell.mine && !cell.revealed) return false
  }
  return true
}

function inBounds(game: Game, index: number) {
  return Number.isInteger(index) && index >= 0 && index < game.cells.length
}

export function reveal(game: Game, index: number): Game {
  if (game.status === "won" || game.status === "lost") return game
  if (!inBounds(game, index)) return game
  const current = game.cells[index]
  if (current.revealed || current.mark === "flag") return game

  const cells = game.status === "ready" ? placeMines(game, index) : game.cells.slice()
  if (cells[index].mine) {
    revealMines(cells, [index])
    return { ...game, cells, status: "lost" }
  }
  flood(game, cells, index)
  if (safeCellsRevealed(cells)) {
    flagMines(cells)
    return { ...game, cells, status: "won" }
  }
  return { ...game, cells, status: "playing" }
}

export function chord(game: Game, index: number): Game {
  if (game.status === "won" || game.status === "lost") return game
  if (!inBounds(game, index)) return game
  const cell = game.cells[index]
  if (!cell.revealed || cell.adjacent === 0) return game

  const around = neighbors(game, index)
  let flags = 0
  let closed = 0
  for (const neighbor of around) {
    const next = game.cells[neighbor]
    if (next.mark === "flag") flags++
    else if (!next.revealed) closed++
  }
  if (flags !== cell.adjacent || closed === 0) return game

  const cells = game.cells.slice()
  const hits: number[] = []
  for (const neighbor of around) {
    const next = cells[neighbor]
    if (next.revealed || next.mark === "flag") continue
    if (next.mine) {
      hits.push(neighbor)
      continue
    }
    flood(game, cells, neighbor)
  }
  if (hits.length > 0) {
    revealMines(cells, hits)
    return { ...game, cells, status: "lost" }
  }
  if (safeCellsRevealed(cells)) {
    flagMines(cells)
    return { ...game, cells, status: "won" }
  }
  return { ...game, cells, status: "playing" }
}

export function cycleMark(game: Game, index: number): Game {
  if (game.status === "won" || game.status === "lost") return game
  if (!inBounds(game, index)) return game
  const cell = game.cells[index]
  if (cell.revealed) return game
  const cells = game.cells.slice()
  cells[index] = { ...cell, mark: nextMark[cell.mark] }
  return { ...game, cells }
}

export function flagCount(game: Game): number {
  let count = 0
  for (const cell of game.cells) {
    if (cell.mark === "flag") count++
  }
  return count
}
