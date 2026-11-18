import { useEffect, useRef, useState } from "react"

import { GameShell } from "@/components/GameShell"
import { Button } from "@/components/ui/button"
import { Board } from "@/games/minesweeper/Board"
import { FaceButton } from "@/games/minesweeper/FaceButton"
import { LedCounter } from "@/games/minesweeper/LedCounter"
import { loadBestTimes, saveBestTime } from "@/games/minesweeper/best-times"
import {
  LEVELS,
  chord,
  createGame,
  cycleMark,
  flagCount,
  reveal,
  type Game,
  type Level,
} from "@/games/minesweeper/logic"

const levels: Level[] = ["beginner", "intermediate", "expert"]

function secondsSince(startedAt: number) {
  return Math.min(999, Math.floor((Date.now() - startedAt) / 1000))
}

export default function Minesweeper() {
  const [game, setGame] = useState(() => createGame("beginner"))
  const [elapsed, setElapsed] = useState(0)
  const [pressing, setPressing] = useState(false)
  const [bestTimes, setBestTimes] = useState(loadBestTimes)
  const [newBest, setNewBest] = useState(false)
  const startedAt = useRef<number | null>(null)

  useEffect(() => {
    if (game.status !== "playing" || startedAt.current == null) return
    const id = window.setInterval(() => {
      const start = startedAt.current
      if (start == null) return
      setElapsed(secondsSince(start))
    }, 1000)
    return () => window.clearInterval(id)
  }, [game.status])

  function apply(next: Game) {
    if (next === game) return
    if (game.status === "ready" && next.status === "playing") {
      startedAt.current = Date.now()
      setElapsed(0)
    }
    if (next.status === "won") {
      const start = startedAt.current
      const seconds = start == null ? 0 : secondsSince(start)
      const previous = bestTimes[game.level]
      setElapsed(seconds)
      setBestTimes(saveBestTime(game.level, seconds))
      setNewBest(previous === undefined || seconds < previous)
    } else if (next.status === "lost" && startedAt.current != null) {
      setElapsed(secondsSince(startedAt.current))
    }
    setGame(next)
  }

  function open(index: number) {
    apply(reveal(game, index))
  }

  function openChord(index: number) {
    apply(chord(game, index))
  }

  function mark(index: number) {
    const next = cycleMark(game, index)
    if (next !== game) setGame(next)
  }

  function reset() {
    startedAt.current = null
    setElapsed(0)
    setPressing(false)
    setNewBest(false)
    setGame(createGame(game.level))
  }

  function choose(level: Level) {
    startedAt.current = null
    setElapsed(0)
    setPressing(false)
    setNewBest(false)
    setGame(createGame(level))
  }

  const face =
    game.status === "won" ? "won" : game.status === "lost" ? "lost" : pressing ? "pressing" : "playing"

  const best = bestTimes[game.level]
  const status =
    game.status === "lost"
      ? "Boom! Try again"
      : game.status === "won"
        ? `Cleared in ${elapsed}s${newBest ? " · New best!" : ""}`
        : "Left click to open, right click or long-press to flag"

  return (
    <GameShell
      toolbar={
        <>
          {levels.map((level) => (
            <Button
              key={level}
              variant={game.level === level ? "default" : "outline"}
              size="sm"
              aria-pressed={game.level === level}
              onClick={() => choose(level)}
            >
              {LEVELS[level].label}
            </Button>
          ))}
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
            {typeof best === "number" ? `Best ${best}s` : "Best —"}
          </span>
        </>
      }
    >
      <div className="flex w-full flex-col items-center gap-4">
        <div className="inline-flex max-w-full min-w-0 flex-col gap-3 border-2 border-t-mine-bevel-light border-l-mine-bevel-light border-r-mine-bevel-dark border-b-mine-bevel-dark bg-mine-panel p-3">
          <div className="flex items-center justify-between gap-3 border-2 border-t-mine-bevel-dark border-r-mine-bevel-light border-b-mine-bevel-light border-l-mine-bevel-dark bg-mine-panel px-2 py-2">
            <LedCounter value={game.mines - flagCount(game)} label="Mines" />
            <FaceButton face={face} onClick={reset} />
            <LedCounter value={elapsed} label="Time" />
          </div>
          <Board
            game={game}
            onReveal={open}
            onChord={openChord}
            onMark={mark}
            onPressChange={setPressing}
          />
        </div>
        <p className="text-sm font-medium" aria-live="polite">
          {status}
        </p>
      </div>
    </GameShell>
  )
}
