import { describe, expect, it } from "vitest"

import {
  LINES,
  applyMove,
  emptyBoard,
  isDraw,
  nextTurn,
  winningLine,
  type Cell,
} from "@/games/tic-tac-toe/logic"

function boardWith(marks: Record<number, Cell>): Cell[] {
  const board = emptyBoard()
  for (const [index, mark] of Object.entries(marks)) {
    board[Number(index)] = mark
  }
  return board
}

describe("winningLine", () => {
  it.each(LINES)("line %s, %s, %s wins", (a, b, c) => {
    const line = [a, b, c]
    const board = emptyBoard()
    for (const index of line) board[index] = "X"
    expect(winningLine(board)).toEqual(line)

    for (const index of line) board[index] = "O"
    expect(winningLine(board)).toEqual(line)
  })

  it("returns null when nobody has three in a row", () => {
    expect(winningLine(emptyBoard())).toBeNull()
    expect(winningLine(boardWith({ 0: "X", 1: "O", 2: "X", 4: "O" }))).toBeNull()
  })
})

describe("isDraw", () => {
  it("is true for a full board with no winner", () => {
    const board = boardWith({
      0: "X",
      1: "O",
      2: "X",
      3: "X",
      4: "O",
      5: "O",
      6: "O",
      7: "X",
      8: "X",
    })
    expect(winningLine(board)).toBeNull()
    expect(isDraw(board)).toBe(true)
  })

  it("is false for a full board that already has a winner", () => {
    const board = boardWith({
      0: "X",
      1: "X",
      2: "X",
      3: "O",
      4: "O",
      5: "X",
      6: "O",
      7: "X",
      8: "O",
    })
    expect(winningLine(board)).toEqual([0, 1, 2])
    expect(isDraw(board)).toBe(false)
  })

  it("is false while empty cells remain", () => {
    expect(isDraw(emptyBoard())).toBe(false)
  })
})

describe("applyMove", () => {
  it("places a mark on an empty cell", () => {
    const board = emptyBoard()
    const next = applyMove(board, 4, "X")
    expect(next).not.toBe(board)
    expect(next[4]).toBe("X")
    expect(board[4]).toBeNull()
  })

  it("returns the same board when the cell is taken", () => {
    const board = boardWith({ 0: "X" })
    expect(applyMove(board, 0, "O")).toBe(board)
  })

  it("returns the same board when the index is out of range", () => {
    const board = emptyBoard()
    expect(applyMove(board, -1, "X")).toBe(board)
    expect(applyMove(board, 9, "X")).toBe(board)
    expect(applyMove(board, 1.5, "X")).toBe(board)
  })

  it("returns the same board when the round is already won", () => {
    const board = boardWith({ 0: "X", 1: "X", 2: "X" })
    expect(applyMove(board, 8, "O")).toBe(board)
  })
})

describe("nextTurn", () => {
  it("swaps X and O", () => {
    expect(nextTurn("X")).toBe("O")
    expect(nextTurn("O")).toBe("X")
  })
})
