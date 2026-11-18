import { memo, useEffect, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react"
import { Bomb, Flag, X } from "lucide-react"

import type { Cell, Game } from "@/games/minesweeper/logic"

const layouts = {
  beginner: { grid: "grid-cols-9", cell: "size-8" },
  intermediate: { grid: "grid-cols-16", cell: "size-8" },
  expert: { grid: "grid-cols-30", cell: "size-6 text-xs" },
} as const

const numberColors: Record<number, string> = {
  1: "text-mine-1",
  2: "text-mine-2",
  3: "text-mine-3",
  4: "text-mine-4",
  5: "text-mine-5",
  6: "text-mine-6",
  7: "text-mine-7",
  8: "text-mine-8",
}

const raised =
  "border-2 border-t-mine-bevel-light border-l-mine-bevel-light border-r-mine-bevel-dark border-b-mine-bevel-dark bg-mine-tile active:border-t-mine-bevel-dark active:border-r-mine-bevel-light active:border-b-mine-bevel-light active:border-l-mine-bevel-dark"

const opened = "border border-mine-bevel-dark/40 bg-mine-tile-open"

const exploded = "border border-mine-bevel-dark/40 bg-destructive text-white"

function cellLabel(cell: Cell, index: number, columns: number) {
  const row = Math.floor(index / columns) + 1
  const column = (index % columns) + 1
  const place = `row ${row} column ${column}`
  if (cell.revealed) {
    if (cell.mine || cell.exploded) return `Mine, ${place}`
    if (cell.adjacent > 0) return `${cell.adjacent} adjacent mines, ${place}`
    return `Empty, ${place}`
  }
  if (cell.mark === "flag") return `Flagged, ${place}`
  if (cell.mark === "question") return `Question mark, ${place}`
  return `Hidden, ${place}`
}

function indexFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  const button = target.closest("[data-index]")
  if (!(button instanceof HTMLButtonElement) || button.disabled) return null
  const index = Number(button.dataset.index)
  return Number.isInteger(index) ? index : null
}

function CellGlyph({ cell, over }: { cell: Cell; over: boolean }) {
  if (cell.revealed) {
    if (cell.mine) return <Bomb aria-hidden="true" />
    if (cell.adjacent > 0) {
      return <span className={`font-bold ${numberColors[cell.adjacent] ?? ""}`}>{cell.adjacent}</span>
    }
    return null
  }
  if (over && !cell.mine && cell.mark === "flag") {
    return (
      <span className="relative">
        <Bomb aria-hidden="true" />
        <X aria-hidden="true" className="absolute inset-0 text-destructive" />
      </span>
    )
  }
  if (cell.mark === "flag") return <Flag aria-hidden="true" className="text-destructive" />
  if (cell.mark === "question") return "?"
  return null
}

const CellView = memo(function CellView({
  cell,
  index,
  columns,
  over,
  className,
}: {
  cell: Cell
  index: number
  columns: number
  over: boolean
  className: string
}) {
  const face = cell.exploded ? exploded : cell.revealed ? opened : raised
  return (
    <button
      type="button"
      data-index={index}
      disabled={over}
      aria-disabled={cell.revealed}
      aria-label={cellLabel(cell, index, columns)}
      className={`${className} flex cursor-pointer items-center justify-center p-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default [&_svg]:size-4 ${face}`}
    >
      <CellGlyph cell={cell} over={over} />
    </button>
  )
})

export function Board({
  game,
  onReveal,
  onChord,
  onMark,
  onPressChange,
}: {
  game: Game
  onReveal: (index: number) => void
  onChord: (index: number) => void
  onMark: (index: number) => void
  onPressChange: (pressing: boolean) => void
}) {
  const suppressClick = useRef(false)
  const lastPointerType = useRef("")
  const longPress = useRef<{
    timer: number
    x: number
    y: number
    pointerId: number
  } | null>(null)

  useEffect(() => {
    return () => {
      if (longPress.current) window.clearTimeout(longPress.current.timer)
    }
  }, [])

  function clearLongPress() {
    if (!longPress.current) return
    window.clearTimeout(longPress.current.timer)
    longPress.current = null
  }

  function endPress() {
    clearLongPress()
    onPressChange(false)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    lastPointerType.current = event.pointerType
    if (event.button !== 0) return
    onPressChange(true)
    if (event.pointerType !== "touch") return
    const index = indexFromTarget(event.target)
    if (index === null) return
    clearLongPress()
    const x = event.clientX
    const y = event.clientY
    const pointerId = event.pointerId
    const timer = window.setTimeout(() => {
      longPress.current = null
      onMark(index)
      navigator.vibrate?.(10)
      suppressClick.current = true
    }, 450)
    longPress.current = { timer, x, y, pointerId }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const pending = longPress.current
    if (!pending || event.pointerId !== pending.pointerId) return
    const dx = event.clientX - pending.x
    const dy = event.clientY - pending.y
    if (dx * dx + dy * dy > 100) clearLongPress()
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    const index = indexFromTarget(event.target)
    if (index === null) return
    const cell = game.cells[index]
    if (!cell) return
    if (cell.revealed) onChord(index)
    else onReveal(index)
  }

  function onContextMenu(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    if (lastPointerType.current === "touch") return
    const index = indexFromTarget(event.target)
    if (index === null) return
    onMark(index)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "f" && event.key !== "F") return
    const index = indexFromTarget(event.target)
    if (index === null) return
    event.preventDefault()
    onMark(index)
  }

  const layout = layouts[game.level]
  const over = game.status === "won" || game.status === "lost"

  return (
    <div className="max-w-full overflow-x-auto touch-manipulation select-none">
      <div
        className={`grid ${layout.grid} w-max gap-0`}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onPointerDown={onPointerDown}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onPointerLeave={endPress}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        {game.cells.map((cell, index) => (
          <CellView
            key={index}
            cell={cell}
            index={index}
            columns={game.columns}
            over={over}
            className={layout.cell}
          />
        ))}
      </div>
    </div>
  )
}
