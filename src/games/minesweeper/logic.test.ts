import { describe, expect, it } from "vitest"

import {
  LEVELS,
  chord,
  createGame,
  cycleMark,
  flagCount,
  neighbors,
  reveal,
  type Cell,
  type Game,
  type Level,
  type Status,
} from "@/games/minesweeper/logic"

function fromLayout(rows: readonly string[], status: Status = "playing"): Game {
  const height = rows.length
  const width = rows[0]?.length ?? 0
  if (width === 0 || rows.some((row) => row.length !== width)) {
    throw new Error("layout must be a rectangle")
  }

  const cells: Cell[] = []
  const mineIndexes: number[] = []
  const documented = new Map<number, number>()

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const symbol = rows[row]?.[column] ?? ""
      const index = row * width + column
      const mine = symbol === "*" || symbol === "F"
      const mark = symbol === "F" || symbol === "f" ? "flag" : symbol === "?" ? "question" : "none"
      const revealed = symbol === " " || (symbol >= "1" && symbol <= "8")
      if (!mine && symbol !== "." && symbol !== "f" && symbol !== "?" && !revealed) {
        throw new Error(`unknown layout symbol ${symbol}`)
      }
      if (mine) mineIndexes.push(index)
      if (symbol === " ") documented.set(index, 0)
      if (symbol >= "1" && symbol <= "8") documented.set(index, Number(symbol))
      cells.push({ mine, adjacent: 0, revealed, mark, exploded: false })
    }
  }

  const game: Game = {
    level: "beginner",
    columns: width,
    rows: height,
    mines: mineIndexes.length,
    cells,
    status,
  }
  const adjacent = Array.from({ length: cells.length }, () => 0)
  for (const mine of mineIndexes) {
    for (const neighbor of neighbors(game, mine)) adjacent[neighbor] += 1
  }
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]
    if (!cell) continue
    cells[index] = { ...cell, adjacent: adjacent[index] ?? 0 }
  }
  for (const [index, count] of documented) {
    if (cells[index]?.adjacent !== count) {
      throw new Error(`cell ${index} adjacent is ${cells[index]?.adjacent}, layout says ${count}`)
    }
  }
  return game
}

function snapshot(game: Game): Cell[] {
  return game.cells.map((cell) => ({ ...cell }))
}

function adjacentCounts(game: Game): number[] {
  const counts = Array.from({ length: game.cells.length }, () => 0)
  game.cells.forEach((cell, index) => {
    if (!cell.mine) return
    for (const neighbor of neighbors(game, index)) counts[neighbor] += 1
  })
  return counts
}

describe("createGame", () => {
  it.each([
    ["beginner", 9, 9, 10],
    ["intermediate", 16, 16, 40],
    ["expert", 30, 16, 99],
  ] as const)("%s is %ix%i with %i mines", (level: Level, columns, rows, mines) => {
    const game = createGame(level)
    expect(game.level).toBe(level)
    expect(game.columns).toBe(columns)
    expect(game.rows).toBe(rows)
    expect(game.mines).toBe(mines)
    expect(LEVELS[level].mines).toBe(mines)
    expect(game.status).toBe("ready")
    expect(game.cells).toHaveLength(columns * rows)
    for (const cell of game.cells) {
      expect(cell).toEqual({
        mine: false,
        adjacent: 0,
        revealed: false,
        mark: "none",
        exploded: false,
      })
    }
  })
})

describe("neighbors", () => {
  const game = createGame("beginner")

  it("counts a corner, an edge, and an interior cell without wrapping rows", () => {
    expect(neighbors(game, 0)).toEqual([1, 9, 10])
    expect(neighbors(game, 1)).toEqual([0, 2, 9, 10, 11])
    expect(neighbors(game, 10)).toEqual([0, 1, 2, 9, 11, 18, 19, 20])
    expect(neighbors(game, 8)).toEqual([7, 16, 17])
    expect(neighbors(game, 8)).not.toContain(9)
    expect(neighbors(game, 9)).toEqual([0, 1, 10, 18, 19])
    expect(neighbors(game, 9)).not.toContain(8)
  })

  it("returns an empty list for out-of-range and non-integer indexes", () => {
    expect(neighbors(game, -1)).toEqual([])
    expect(neighbors(game, game.cells.length)).toEqual([])
    expect(neighbors(game, 1.5)).toEqual([])
    expect(neighbors(game, Number.NaN)).toEqual([])
  })
})

describe("reveal", () => {
  it("keeps the first click safe and numbers the field", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const start = createGame("beginner")
      const index = Math.floor(Math.random() * start.cells.length)
      const next = reveal(start, index)
      expect(next.cells[index]?.mine).toBe(false)
      expect(next.cells.filter((cell) => cell.mine)).toHaveLength(start.mines)
      expect(next.status).not.toBe("ready")
      const counts = adjacentCounts(next)
      next.cells.forEach((cell, cellIndex) => {
        expect(cell.adjacent).toBe(counts[cellIndex])
      })
    }
  })

  it("opens the zero region, stops at numbers, skips flags, and clears question marks", () => {
    const game = fromLayout([".?..f", ".....", "*****", ".....", "....."])
    const next = reveal(game, 0)
    expect(next.status).toBe("playing")

    expect(next.cells[0]).toMatchObject({ revealed: true, adjacent: 0, mark: "none" })
    expect(next.cells[1]).toMatchObject({ revealed: true, mark: "none" })
    expect(next.cells[4]).toMatchObject({ revealed: false, mark: "flag" })
    for (const index of [5, 6, 7, 8, 9]) {
      expect(next.cells[index]?.revealed).toBe(true)
      expect(next.cells[index]?.adjacent).toBeGreaterThan(0)
    }
    for (const index of [10, 11, 12, 13, 14]) {
      expect(next.cells[index]).toMatchObject({ mine: true, revealed: false, mark: "none" })
    }
    for (let index = 15; index < 25; index += 1) {
      expect(next.cells[index]?.revealed).toBe(false)
    }
  })

  it("loses on a mine, explodes only that cell, and leaves flagged mines flagged", () => {
    const game = fromLayout(["*.*", "F.."])
    const next = reveal(game, 0)
    expect(next.status).toBe("lost")
    expect(next.cells[0]).toMatchObject({ exploded: true, revealed: true, mark: "none" })
    expect(next.cells[2]).toMatchObject({ mine: true, revealed: true, exploded: false, mark: "none" })
    expect(next.cells[3]).toMatchObject({ mine: true, revealed: false, exploded: false, mark: "flag" })
    expect(next.cells.flatMap((cell, index) => (cell.exploded ? [index] : []))).toEqual([0])
  })

  it("wins by revealing the last safe cell and flags every mine", () => {
    const game = fromLayout(["**", "*."])
    const next = reveal(game, 3)
    expect(next.status).toBe("won")
    expect(next.cells[3]).toMatchObject({ mine: false, revealed: true })
    expect(next.cells.filter((cell) => cell.mine).every((cell) => cell.mark === "flag")).toBe(true)
  })

  it("returns the same game when the action cannot change the board", () => {
    const revealed = fromLayout([" "])
    expect(reveal(revealed, 0)).toBe(revealed)

    const flagged = fromLayout(["f."])
    expect(reveal(flagged, 0)).toBe(flagged)

    const playing = fromLayout([".*"])
    expect(reveal(playing, -1)).toBe(playing)
    expect(reveal(playing, 4)).toBe(playing)
    expect(reveal(playing, 0.5)).toBe(playing)

    const won = reveal(fromLayout(["**", "*."]), 3)
    expect(won.status).toBe("won")
    expect(reveal(won, 3)).toBe(won)
    expect(chord(won, 3)).toBe(won)
    expect(cycleMark(won, 0)).toBe(won)

    const lost = reveal(fromLayout(["*", "."]), 0)
    expect(lost.status).toBe("lost")
    expect(reveal(lost, 1)).toBe(lost)
    expect(chord(lost, 1)).toBe(lost)
    expect(cycleMark(lost, 1)).toBe(lost)
  })
})

describe("chord", () => {
  it("opens neighbors when the flag count matches", () => {
    const game = fromLayout(["F..", ".1.", "..."])
    const next = chord(game, 4)
    expect(next).not.toBe(game)
    expect(next.status).not.toBe("lost")
    expect(next.cells[1]?.revealed).toBe(true)
    expect(next.cells[0]).toMatchObject({ mark: "flag", exploded: false })
  })

  it("does nothing when the flags do not match the number", () => {
    const game = fromLayout(["*..", ".1.", "..."])
    expect(chord(game, 4)).toBe(game)
  })

  it("loses and explodes the mine hidden behind a wrong flag", () => {
    const game = fromLayout(["*f.", ".1.", "..."])
    const next = chord(game, 4)
    expect(next.status).toBe("lost")
    expect(next.cells[0]).toMatchObject({ mine: true, exploded: true, revealed: true })
    expect(next.cells.filter((cell) => cell.exploded)).toHaveLength(1)
  })
})

describe("cycleMark", () => {
  it("cycles none, flag, question, and back, and ignores a revealed cell", () => {
    const game = fromLayout(["."])
    const flagged = cycleMark(game, 0)
    expect(flagged.cells[0]?.mark).toBe("flag")
    expect(flagCount(flagged)).toBe(1)

    const questioned = cycleMark(flagged, 0)
    expect(questioned.cells[0]?.mark).toBe("question")
    expect(flagCount(questioned)).toBe(0)

    const cleared = cycleMark(questioned, 0)
    expect(cleared.cells[0]?.mark).toBe("none")
    expect(flagCount(cleared)).toBe(0)

    const open = fromLayout([" "])
    expect(cycleMark(open, 0)).toBe(open)
    expect(flagCount(open)).toBe(0)
  })
})

describe("immutability", () => {
  it("never mutates the input cells array", () => {
    const ready = createGame("beginner")
    const readyCells = ready.cells
    const readyBefore = snapshot(ready)
    reveal(ready, 4)
    expect(ready.cells).toBe(readyCells)
    expect(snapshot(ready)).toEqual(readyBefore)

    const playing = fromLayout(["....", "..*.", "...."])
    const playingCells = playing.cells
    const playingBefore = snapshot(playing)
    reveal(playing, 0)
    chord(playing, 0)
    cycleMark(playing, 1)
    expect(playing.cells).toBe(playingCells)
    expect(snapshot(playing)).toEqual(playingBefore)
  })
})
