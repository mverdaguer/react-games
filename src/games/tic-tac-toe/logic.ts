export type Mark = "X" | "O"
export type Cell = Mark | null

export const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function winningLine(board: readonly Cell[]): number[] | null {
  return (
    LINES.find(([a, b, c]) => {
      const mark = board[a]
      return mark !== null && mark === board[b] && mark === board[c]
    }) ?? null
  )
}

export function isDraw(board: readonly Cell[]): boolean {
  return winningLine(board) === null && board.every((cell) => cell !== null)
}

export function nextTurn(mark: Mark): Mark {
  return mark === "X" ? "O" : "X"
}

export function emptyBoard(): Cell[] {
  return Array.from({ length: 9 }, () => null)
}

export function applyMove(board: Cell[], index: number, mark: Mark): Cell[] {
  if (!Number.isInteger(index) || index < 0 || index >= board.length) return board
  if (board[index] !== null) return board
  if (winningLine(board)) return board
  const next = board.slice()
  next[index] = mark
  return next
}
