import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { useRef, type PointerEvent, type ReactNode } from "react"

type HoldDir = "left" | "right" | "down"

type Gesture = {
  x: number
  y: number
  pointerId: number
  leftoverX: number
  leftoverY: number
  dragged: boolean
}

const directionButton =
  "inline-flex size-11 cursor-pointer items-center justify-center rounded-md bg-gbc-button text-gbc-button-ink"

const roundButton =
  "inline-flex size-12 cursor-pointer items-center justify-center rounded-full bg-gbc-button text-xs font-medium text-gbc-button-ink"

const pillButton =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gbc-button px-4 text-xs font-medium tracking-wide text-gbc-button-ink"

function stopPointer(event: PointerEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
}

function press(event: PointerEvent<HTMLButtonElement>, action: () => void) {
  stopPointer(event)
  action()
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

function TapButton({
  label,
  className,
  pressed,
  onPress,
  children,
}: {
  label: string
  className: string
  pressed?: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      aria-pressed={pressed}
      className={className}
      onPointerDown={(event) => press(event, onPress)}
      onClick={(event) => {
        if (event.detail === 0) onPress()
      }}
    >
      {children}
    </button>
  )
}

function HoldButton({
  label,
  dir,
  onHoldStart,
  onHoldEnd,
  children,
}: {
  label: string
  dir: HoldDir
  onHoldStart: (dir: HoldDir) => void
  onHoldEnd: (dir: HoldDir) => void
  children: ReactNode
}) {
  function end(event: PointerEvent<HTMLButtonElement>) {
    stopPointer(event)
    onHoldEnd(dir)
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      className={directionButton}
      onPointerDown={(event) => press(event, () => onHoldStart(dir))}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      onClick={(event) => {
        if (event.detail === 0) {
          onHoldStart(dir)
          onHoldEnd(dir)
        }
      }}
    >
      {children}
    </button>
  )
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
    <div className="mx-auto w-full max-w-sm rounded-4xl bg-gbc-shell p-2 shadow-lg ring-1 ring-gbc-shell-edge">
      <div
        className="flex touch-none flex-col gap-1 rounded-2xl bg-gbc-bezel p-2 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <div aria-hidden className="size-2 rounded-full bg-gbc-led" />
        <div className="overflow-hidden rounded-md bg-gbc-screen p-1">{screen}</div>
      </div>
      <span className="block text-center text-xs font-medium tracking-widest text-gbc-button-ink">
        GAME BOY COLOR
      </span>
      <div className="flex items-start justify-between pt-2">
        <div className="grid grid-cols-3 gap-1">
          <div className="size-11" />
          <TapButton label="Up" className={directionButton} onPress={() => onRotate("cw")}>
            <ChevronUp aria-hidden className="size-4" />
          </TapButton>
          <div className="size-11" />
          <HoldButton label="Left" dir="left" onHoldStart={onHoldStart} onHoldEnd={onHoldEnd}>
            <ChevronLeft aria-hidden className="size-4" />
          </HoldButton>
          <div aria-hidden className="size-11 rounded-md bg-gbc-button" />
          <HoldButton label="Right" dir="right" onHoldStart={onHoldStart} onHoldEnd={onHoldEnd}>
            <ChevronRight aria-hidden className="size-4" />
          </HoldButton>
          <div className="size-11" />
          <HoldButton label="Down" dir="down" onHoldStart={onHoldStart} onHoldEnd={onHoldEnd}>
            <ChevronDown aria-hidden className="size-4" />
          </HoldButton>
          <div className="size-11" />
        </div>
        <div className="flex items-end gap-3">
          <div className="mb-4">
            <TapButton
              label="Rotate clockwise"
              className={roundButton}
              onPress={() => onRotate("cw")}
            >
              A
            </TapButton>
          </div>
          <TapButton
            label="Rotate counter-clockwise"
            className={roundButton}
            onPress={() => onRotate("ccw")}
          >
            B
          </TapButton>
        </div>
      </div>
      <div className="flex justify-center gap-6 pt-2">
        <TapButton label="Preview" className={pillButton} pressed={previewOn} onPress={onPreview}>
          SELECT
        </TapButton>
        <TapButton label={primaryLabel} className={pillButton} onPress={onPrimary}>
          START
        </TapButton>
      </div>
      <div aria-hidden className="flex justify-end gap-1 pt-1">
        <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
        <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
        <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
        <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
        <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
        <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
      </div>
    </div>
  )
}
