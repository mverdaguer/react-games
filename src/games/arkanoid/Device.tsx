import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRef, type PointerEvent, type ReactNode } from "react"

import { GameBoy, HoldButton, pillButton, roundButton, TapButton } from "@/games/shared/game-boy"

const DRAG_PX = 4
const VIEW_W = 160

type Gesture = {
  x: number
  y: number
  pointerId: number
  dragged: boolean
}

function viewBoxX(bezel: HTMLElement, clientX: number): number | null {
  const svg = bezel.querySelector("svg")
  if (!svg) return null
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0) return null
  const x = ((clientX - rect.left) / rect.width) * VIEW_W
  if (x < 0) return 0
  if (x > VIEW_W) return VIEW_W
  return x
}

function FireButton({
  label,
  onFire,
  onTap,
  children,
}: {
  label: string
  onFire: (held: boolean) => void
  onTap: () => void
  children: ReactNode
}) {
  function end(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    onFire(false)
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      className={roundButton}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onFire(true)
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      onClick={(event) => {
        if (event.detail === 0) onTap()
      }}
    >
      {children}
    </button>
  )
}

export function Device({
  screen,
  primaryLabel,
  onHoldStart,
  onHoldEnd,
  onFire,
  onPrimary,
  onAim,
  onTap,
}: {
  screen: ReactNode
  primaryLabel: string
  onHoldStart: (dir: "left" | "right") => void
  onHoldEnd: (dir: "left" | "right") => void
  onFire: (held: boolean) => void
  onPrimary: () => void
  onAim: (x: number | null) => void
  onTap: () => void
}) {
  const gesture = useRef<Gesture | null>(null)

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      dragged: false,
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (Math.hypot(dx, dy) <= DRAG_PX) return
    current.dragged = true
    const x = viewBoxX(event.currentTarget, event.clientX)
    if (x !== null) onAim(x)
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const dragged = current.dragged
    gesture.current = null
    if (!dragged) onTap()
    onAim(null)
  }

  return (
    <GameBoy.Frame>
      <GameBoy.Screen
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        {screen}
      </GameBoy.Screen>
      <div className="flex items-start justify-between pt-2">
        <GameBoy.DPad
          up={<div className="size-11" />}
          left={
            <HoldButton label="Left" dir="left" onHoldStart={onHoldStart} onHoldEnd={onHoldEnd}>
              <ChevronLeft aria-hidden className="size-4" />
            </HoldButton>
          }
          right={
            <HoldButton label="Right" dir="right" onHoldStart={onHoldStart} onHoldEnd={onHoldEnd}>
              <ChevronRight aria-hidden className="size-4" />
            </HoldButton>
          }
          down={<div className="size-11" />}
        />
        <GameBoy.ActionButtons
          a={
            <FireButton label="Fire, A" onFire={onFire} onTap={onTap}>
              A
            </FireButton>
          }
          b={
            <FireButton label="Fire, B" onFire={onFire} onTap={onTap}>
              B
            </FireButton>
          }
        />
      </div>
      <GameBoy.Pills>
        <span
          aria-hidden
          className="inline-flex h-11 items-center justify-center rounded-full bg-gbc-button px-4 text-xs font-medium tracking-wide text-gbc-button-ink"
        >
          SELECT
        </span>
        <TapButton label={`${primaryLabel}, START`} className={pillButton} onPress={onPrimary}>
          START
        </TapButton>
      </GameBoy.Pills>
      <GameBoy.Speaker />
    </GameBoy.Frame>
  )
}
