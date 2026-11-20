import { useEffect, useMemo, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"

import { GameShell } from "@/components/GameShell"
import { Button } from "@/components/ui/button"
import {
  applyMove,
  computerMove,
  emptyBoard,
  isDraw,
  nextTurn,
  winningLine,
  type Cell,
  type Level,
  type Mark,
} from "@/games/tic-tac-toe/logic"

type Opponent = "human" | Level

const OPPONENTS: { id: Opponent; label: string }[] = [
  { id: "human", label: "Two players" },
  { id: "easy", label: "Easy" },
  { id: "hard", label: "Hard" },
]

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(emptyBoard)
  const [turn, setTurn] = useState<Mark>("X")
  const [scores, setScores] = useState({ X: 0, O: 0 })
  const [opponent, setOpponent] = useState<Opponent>("easy")
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const winLine = useMemo(() => winningLine(board), [board])
  const draw = isDraw(board)
  const winner = winLine ? board[winLine[0]] : null
  const vsComputer = opponent !== "human"
  const computerTurn = vsComputer && turn === "O"

  function clearTimer() {
    if (timer.current === null) return
    window.clearTimeout(timer.current)
    timer.current = null
  }

  function play(index: number) {
    if (timer.current !== null || computerTurn) return
    const next = applyMove(board, index, turn)
    if (next === board) return
    setBoard(next)
    if (winningLine(next)) {
      setScores((current) => ({
        ...current,
        [turn]: current[turn] + 1,
      }))
      return
    }
    if (opponent !== "human" && !isDraw(next)) {
      const level = opponent
      setTurn("O")
      timer.current = window.setTimeout(() => {
        timer.current = null
        const move = computerMove(next, "O", level)
        if (move === null) return
        const reply = applyMove(next, move, "O")
        setBoard(reply)
        if (winningLine(reply)) {
          setScores((current) => ({ ...current, O: current.O + 1 }))
          return
        }
        if (!isDraw(reply)) setTurn("X")
      }, 400)
      return
    }
    setTurn(nextTurn(turn))
  }

  function reset() {
    clearTimer()
    setBoard(emptyBoard())
    setTurn("X")
  }

  function chooseOpponent(next: Opponent) {
    if (next === opponent) return
    clearTimer()
    setOpponent(next)
    setBoard(emptyBoard())
    setTurn("X")
    setScores({ X: 0, O: 0 })
  }

  const status = winner
    ? vsComputer
      ? winner === "X"
        ? "You win this round"
        : "Computer wins this round"
      : `${winner} wins this round`
    : draw
      ? "This round is a draw"
      : computerTurn
        ? "Computer to move"
        : vsComputer
          ? "Your move"
          : `${turn} to move`

  return (
    <GameShell
      toolbar={
        <>
          <div role="group" aria-label="Opponent" className="flex gap-1">
            {OPPONENTS.map((option) => (
              <Button
                key={option.id}
                variant={opponent === option.id ? "default" : "outline"}
                size="sm"
                aria-pressed={opponent === option.id}
                onClick={() => chooseOpponent(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
            {vsComputer
              ? `You ${scores.X} · Computer ${scores.O}`
              : `X ${scores.X} · O ${scores.O}`}
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
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Board">
          {board.map((cell, index) => {
            const winning = winLine?.includes(index) ?? false
            return (
              <button
                key={index}
                type="button"
                onClick={() => play(index)}
                disabled={cell !== null || winLine !== null || computerTurn}
                aria-label={
                  cell
                    ? `${cell}, cell ${index + 1}`
                    : `Empty cell ${index + 1}`
                }
                className={`flex size-24 cursor-pointer items-center justify-center rounded-xl border bg-card text-3xl font-semibold shadow-sm transition-colors outline-none select-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default aria-disabled:pointer-events-none sm:size-28 ${
                  winning
                    ? "border-primary bg-primary/15 text-primary-ink"
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
