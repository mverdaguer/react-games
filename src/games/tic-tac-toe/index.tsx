import { useMemo, useState } from "react"
import { RotateCcw } from "lucide-react"

import { GameShell } from "@/components/GameShell"
import { Button } from "@/components/ui/button"

type Mark = "X" | "O"
type Cell = Mark | null

const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function winningLine(board: Cell[]) {
  return (
    lines.find(([a, b, c]) => {
      const mark = board[a]
      return mark !== null && mark === board[b] && mark === board[c]
    }) ?? null
  )
}

const emptyBoard = (): Cell[] => Array.from({ length: 9 }, () => null)

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(emptyBoard)
  const [turn, setTurn] = useState<Mark>("X")
  const [scores, setScores] = useState({ X: 0, O: 0 })

  const winLine = useMemo(() => winningLine(board), [board])
  const draw = winLine === null && board.every((cell) => cell !== null)
  const winner = winLine ? board[winLine[0]] : null

  function play(index: number) {
    if (board[index] !== null || winLine) return
    const next = board.slice()
    next[index] = turn
    setBoard(next)
    if (winningLine(next)) {
      setScores((current) => ({
        ...current,
        [turn]: current[turn] + 1,
      }))
      return
    }
    setTurn(turn === "X" ? "O" : "X")
  }

  function reset() {
    setBoard(emptyBoard())
    setTurn("X")
  }

  const status = winner
    ? `${winner} wins this round`
    : draw
      ? "This round is a draw"
      : `${turn} to move`

  return (
    <GameShell
      toolbar={
        <>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
            X {scores.X} · O {scores.O}
          </span>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw />
            New round
          </Button>
        </>
      }
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <p
          className="text-sm font-medium select-none outline-none"
          aria-live="polite"
        >
          {status}
        </p>
        <div className="grid grid-cols-3 gap-2" aria-label="Board">
          {board.map((cell, index) => {
            const winning = winLine?.includes(index) ?? false
            return (
              <button
                key={index}
                type="button"
                onClick={() => play(index)}
                disabled={cell !== null || winLine !== null}
                aria-label={
                  cell
                    ? `${cell}, cell ${index + 1}`
                    : `Empty cell ${index + 1}`
                }
                className={`flex size-24 items-center justify-center rounded-xl border bg-card text-3xl font-semibold shadow-sm transition-colors outline-none select-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:pointer-events-none sm:size-28 ${
                  winning
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border"
                }`}
              >
                {cell}
              </button>
            )
          })}
        </div>
        {(winner !== null || draw) && (
          <Button onClick={reset}>Play again</Button>
        )}
      </div>
    </GameShell>
  )
}
