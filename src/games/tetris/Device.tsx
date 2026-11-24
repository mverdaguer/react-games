import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { useRef, type PointerEvent, type ReactNode } from "react"

import {
  directionButton,
  GameBoy,
  HoldButton,
  pillButton,
  roundButton,
  TapButton,
} from "@/games/shared/game-boy"

type Gesture = {
  x: number
  y: number
  pointerId: number
  leftoverX: number
  leftoverY: number
  dragged: boolean
}

function cellSize(bezel: HTMLElement): { width: number; height: number } {
  const svg = bezel.querySelector("svg")
  if (!svg) return { width: 16, height: 16 }
  const bounds = svg.getBoundingClientRect()
  const width = (bounds.width / 160) * 7
  const height = (bounds.height / 144) * 7
  if (width <= 0 || height <= 0) return { width: 16, height: 16 }
  return { width, height }
}

export function Device({
  screen,
  primaryLabel,
  previewOn,
  onHoldStart,
  onHoldEnd,
  onRotate,
  onPrimary,
  onPreview,
  onScreenTap,
  onDrag,
}: {
  screen: ReactNode
  primaryLabel: string
  previewOn: boolean
  onHoldStart: (dir: "left" | "right" | "down") => void
  onHoldEnd: (dir: "left" | "right" | "down") => void
  onRotate: (dir: "cw" | "ccw") => void
  onPrimary: () => void
  onPreview: () => void
  onScreenTap: () => void
  onDrag: (delta: { columns: number; rows: number }) => void
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
      leftoverX: 0,
      leftoverY: 0,
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
    if (dx === 0 && dy === 0) return

    const { width: cellWidth, height: cellHeight } = cellSize(event.currentTarget)

    if (Math.abs(dx) >= Math.abs(dy)) {
      current.x = event.clientX
      current.leftoverX += dx
      while (Math.abs(current.leftoverX) >= cellWidth) {
        const columns = current.leftoverX > 0 ? 1 : -1
        current.leftoverX -= columns * cellWidth
        current.dragged = true
        onDrag({ columns, rows: 0 })
      }
      return
    }

    current.y = event.clientY
    if (dy < 0) {
      current.leftoverY = Math.max(0, current.leftoverY + dy)
      return
    }
    current.leftoverY += dy
    while (current.leftoverY >= cellHeight) {
      current.leftoverY -= cellHeight
      current.dragged = true
      onDrag({ columns: 0, rows: 1 })
    }
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const dragged = current.dragged
    gesture.current = null
    if (!dragged) onScreenTap()
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
          up={
            <TapButton label="Up" className={directionButton} onPress={() => onRotate("cw")}>
              <ChevronUp aria-hidden className="size-4" />
            </TapButton>
          }
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
          down={
            <HoldButton label="Down" dir="down" onHoldStart={onHoldStart} onHoldEnd={onHoldEnd}>
              <ChevronDown aria-hidden className="size-4" />
            </HoldButton>
          }
        />
        <GameBoy.ActionButtons
          a={
            <TapButton
              label="Rotate clockwise, A"
              className={roundButton}
              onPress={() => onRotate("cw")}
            >
              A
            </TapButton>
          }
          b={
            <TapButton
              label="Rotate counter-clockwise, B"
              className={roundButton}
              onPress={() => onRotate("ccw")}
            >
              B
            </TapButton>
          }
        />
      </div>
      <GameBoy.Pills>
        <TapButton
          label="Preview, SELECT"
          className={pillButton}
          pressed={previewOn}
          onPress={onPreview}
        >
          SELECT
        </TapButton>
        <TapButton label={`${primaryLabel}, START`} className={pillButton} onPress={onPrimary}>
          START
        </TapButton>
      </GameBoy.Pills>
      <GameBoy.Speaker />
    </GameBoy.Frame>
  )
}
