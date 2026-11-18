import { useRef, type PointerEvent, type ReactNode } from "react"
import type { Direction } from "./logic"

const SWIPE_PX = 24

function directionFromDelta(dx: number, dy: number): Direction {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? "left" : "right"
  }
  return dy < 0 ? "up" : "down"
}

export function Device({
  screen,
  keypad,
  onSwipe,
  onTap,
}: {
  screen: ReactNode
  keypad: ReactNode
  onSwipe: (dir: Direction) => void
  onTap: () => void
}) {
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const swiped = useRef(false)

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    start.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    }
    swiped.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const origin = start.current
    if (!origin || origin.pointerId !== event.pointerId) return

    const dx = event.clientX - origin.x
    const dy = event.clientY - origin.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return

    swiped.current = true
    onSwipe(directionFromDelta(dx, dy))
    start.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    }
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const origin = start.current
    if (!origin || origin.pointerId !== event.pointerId) return
    start.current = null
    if (!swiped.current) onTap()
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-4xl bg-phone-body p-4">
      <div
        aria-hidden
        className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-phone-bezel"
      />
      <div
        className="touch-none rounded-2xl bg-phone-bezel p-2 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <div className="overflow-hidden rounded-xl bg-lcd shadow-inner">
          {screen}
        </div>
      </div>
      <div className="pt-4">{keypad}</div>
    </div>
  )
}
