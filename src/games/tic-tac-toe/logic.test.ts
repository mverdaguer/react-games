import { describe, expect, it } from "vitest"

import {
  LINES,
  applyMove,
  bestMove,
  computerMove,
  emptyBoard,
  isDraw,
  nextTurn,
  winningLine,
  type Cell,
  type Mark,
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

describe("bestMove", () => {
  it("takes a winning move when it could block instead", () => {
    const board = boardWith({ 0: "X", 1: "X", 3: "O", 4: "O" })
    expect(bestMove(board, "X")).toBe(2)
  })

  it("blocks when the opponent is one move from winning", () => {
    const board = boardWith({ 0: "X", 1: "X", 4: "O" })
    expect(bestMove(board, "O")).toBe(2)
  })

  it("returns null when the round is already won", () => {
    const board = boardWith({ 0: "X", 1: "X", 2: "X" })
    expect(bestMove(board, "O")).toBeNull()
  })

  it("never loses, moving second or first", () => {
    expect(tallyGames("O")).toMatchObject({ losses: 0, games: 569 })
    expect(tallyGames("X")).toMatchObject({ losses: 0, games: 73 })
  })
})

describe("computerMove", () => {
  it("plays a random empty cell on Easy when the roll is low", () => {
    const board = boardWith({ 3: "X", 4: "X", 6: "O" })
    expect(computerMove(board, "O", "easy", () => 0)).toBe(0)
    expect(bestMove(board, "O")).toBe(5)
  })

  it("plays the best move on Easy when the roll is high", () => {
    const board = boardWith({ 3: "X", 4: "X", 6: "O" })
    expect(computerMove(board, "O", "easy", () => 0.99)).toBe(5)
  })

  it("plays the best move on Hard", () => {
    const board = boardWith({ 3: "X", 4: "X", 6: "O" })
    expect(computerMove(board, "O", "hard", () => 0)).toBe(5)
  })
})

function tallyGames(computer: Mark) {
  const tally = { wins: 0, draws: 0, losses: 0, games: 0 }
  playEvery(emptyBoard(), "X", computer, tally)
  return {
    wins: tally.wins,
    draws: tally.draws,
    losses: tally.losses,
    games: tally.games,
  }
}

function playEvery(
  board: Cell[],
  turn: Mark,
  computer: Mark,
  tally: { wins: number; draws: number; losses: number; games: number },
) {
  const line = winningLine(board)
  if (line) {
    tally.games += 1
    if (board[line[0]] === computer) tally.wins += 1
    else tally.losses += 1
    return
  }
  if (isDraw(board)) {
    tally.games += 1
    tally.draws += 1
    return
  }
  if (turn === computer) {
    const move = bestMove(board, computer)
    if (move === null) throw new Error("computer has no move")
    playEvery(applyMove(board, move, computer), nextTurn(computer), computer, tally)
    return
  }
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== null) continue
    playEvery(applyMove(board, index, turn), nextTurn(turn), computer, tally)
  }
}
