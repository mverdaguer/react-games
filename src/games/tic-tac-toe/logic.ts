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

export type Level = "easy" | "hard"

function score(board: Cell[], turn: Mark, me: Mark, depth: number): number {
  const line = winningLine(board)
  if (line) return board[line[0]] === me ? 10 - depth : depth - 10
  if (isDraw(board)) return 0
  let best = turn === me ? -Infinity : Infinity
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== null) continue
    const value = score(applyMove(board, index, turn), nextTurn(turn), me, depth + 1)
    best = turn === me ? Math.max(best, value) : Math.min(best, value)
  }
  return best
}

export function bestMove(board: Cell[], mark: Mark): number | null {
  if (winningLine(board)) return null
  let best: number | null = null
  let bestScore = -Infinity
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== null) continue
    const value = score(applyMove(board, index, mark), nextTurn(mark), mark, 1)
    if (value > bestScore) {
      bestScore = value
      best = index
    }
  }
  return best
}

export function computerMove(
  board: Cell[],
  mark: Mark,
  level: Level,
  random: () => number = Math.random,
): number | null {
  if (winningLine(board)) return null
  if (level === "easy" && random() < 0.5) {
    const empty: number[] = []
    for (let index = 0; index < board.length; index += 1) {
      if (board[index] === null) empty.push(index)
    }
    if (empty.length === 0) return null
    return empty[Math.floor(random() * empty.length)] ?? null
  }
  return bestMove(board, mark)
}
