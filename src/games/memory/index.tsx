import { useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"

import { GameShell } from "@/components/GameShell"
import { Button } from "@/components/ui/button"

const symbols = ["🎮", "🎲", "🎯", "🚀", "🌟", "🎨", "🎵", "🏆"]

type Card = {
  id: number
  symbol: string
  flipped: boolean
  matched: boolean
}

function shuffle<T>(items: T[]) {
  const next = items.slice()
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swap] as T
    next[swap] = current as T
  }
  return next
}

function createDeck(): Card[] {
  const pairs = symbols.flatMap((symbol, index) => [
    { id: index * 2, symbol, flipped: false, matched: false },
    { id: index * 2 + 1, symbol, flipped: false, matched: false },
  ])
  return shuffle(pairs)
}

const clock = new Intl.DateTimeFormat(undefined, {
  minute: "2-digit",
  second: "2-digit",
  timeZone: "UTC",
})

function formatTime(seconds: number) {
  return clock.format(new Date(seconds * 1000))
}

export default function MemoryMatch() {
  const [cards, setCards] = useState(createDeck)
  const [moves, setMoves] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const lock = useRef(false)
  const round = useRef(0)

  const won = cards.every((card) => card.matched)

  useEffect(() => {
    if (!running || won) return
    const id = window.setInterval(() => {
      setElapsed((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [running, won])

  function restart() {
    round.current += 1
    lock.current = false
    setCards(createDeck())
    setMoves(0)
    setElapsed(0)
    setRunning(false)
  }

  function flip(id: number) {
    if (lock.current || won) return
    const card = cards.find((item) => item.id === id)
    if (!card || card.flipped || card.matched) return

    const open = cards.filter((item) => item.flipped && !item.matched)
    if (open.length >= 2) return

    if (!running) setRunning(true)

    const next = cards.map((item) =>
      item.id === id ? { ...item, flipped: true } : item,
    )
    const opened = next.filter((item) => item.flipped && !item.matched)

    if (opened.length < 2) {
      setCards(next)
      return
    }

    setMoves((value) => value + 1)
    const [first, second] = opened
    if (!first || !second) return

    if (first.symbol === second.symbol) {
      setCards(
        next.map((item) =>
          item.id === first.id || item.id === second.id
            ? { ...item, matched: true }
            : item,
        ),
      )
      return
    }

    setCards(next)
    lock.current = true
    const roundAtFlip = round.current
    window.setTimeout(() => {
      if (round.current !== roundAtFlip) return
      setCards((current) =>
        current.map((item) =>
          item.id === first.id || item.id === second.id
            ? { ...item, flipped: false }
            : item,
        ),
      )
      lock.current = false
    }, 750)
  }

  const status = won
    ? `Cleared in ${moves} moves`
    : moves === 0
      ? "Flip a card to start"
      : `${moves} ${moves === 1 ? "move" : "moves"}`

  return (
    <GameShell
      toolbar={
        <>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">
            {formatTime(elapsed)} · {moves} moves
          </span>
          <Button variant="outline" size="sm" onClick={restart}>
            <RotateCcw />
            Restart
          </Button>
        </>
      }
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <p className="text-sm font-medium" aria-live="polite">
          {status}
        </p>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {cards.map((card) => {
            const faceUp = card.flipped || card.matched
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => flip(card.id)}
                disabled={faceUp || won}
                aria-label={
                  card.matched
                    ? `Matched ${card.symbol}`
                    : faceUp
                      ? `Showing ${card.symbol}`
                      : "Hidden card"
                }
                className="perspective-midrange size-16 rounded-xl transition-transform focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default sm:size-20"
              >
                <span
                  className={`relative grid size-full transform-3d transition-transform duration-500 ${
                    faceUp ? "transform-[rotateY(180deg)]" : ""
                  }`}
                >
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm backface-hidden">
                    ?
                  </span>
                  <span
                    className={`absolute inset-0 flex items-center justify-center rounded-xl bg-card text-2xl shadow-sm ring-1 transform-[rotateY(180deg)] backface-hidden ${
                      card.matched ? "ring-primary" : "ring-border"
                    }`}
                  >
                    {card.symbol}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {won && <Button onClick={restart}>Play again</Button>}
      </div>
    </GameShell>
  )
}
