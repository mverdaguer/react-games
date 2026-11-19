import { useRef, type PointerEvent, type ReactNode } from "react"

type Held = (held: boolean) => void

const directionButton =
  "inline-flex size-12 cursor-pointer items-center justify-center rounded-md bg-pang-button text-xs font-medium text-pang-button-ink"

const fireButton =
  "inline-flex size-16 cursor-pointer items-center justify-center rounded-full bg-pang-fire text-xs font-bold tracking-wide text-pang-fire-ink"

const startButton =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-pang-button px-4 text-xs font-medium tracking-wide text-pang-button-ink"

function stopPointer(event: PointerEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
}

function HoldButton({
  label,
  className,
  onHeld,
  children,
}: {
  label: string
  className: string
  onHeld: Held
  children: ReactNode
}) {
  function end(event: PointerEvent<HTMLButtonElement>) {
    stopPointer(event)
    onHeld(false)
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      className={className}
      onPointerDown={(event) => {
        stopPointer(event)
        onHeld(true)
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      onClick={(event) => {
        if (event.detail === 0) {
          onHeld(true)
          onHeld(false)
        }
      }}
    >
      {children}
    </button>
  )
}

function TapButton({
  label,
  className,
  onPress,
  children,
}: {
  label: string
  className: string
  onPress: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      className={className}
      onPointerDown={(event) => {
        stopPointer(event)
        onPress()
      }}
      onClick={(event) => {
        if (event.detail === 0) onPress()
      }}
    >
      {children}
    </button>
  )
}

export function Cabinet({
  screen,
  primaryLabel,
  onMove,
  onFire,
  onPrimary,
  onScreen,
}: {
  screen: ReactNode
  primaryLabel: string
  onMove: (dir: "left" | "right", held: boolean) => void
  onFire: Held
  onPrimary: () => void
  onScreen: Held
}) {
  const pointer = useRef<number | null>(null)

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    pointer.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    onScreen(true)
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== event.pointerId) return
    event.preventDefault()
    pointer.current = null
    onScreen(false)
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-t-xl rounded-b-3xl bg-pang-cabinet p-3 shadow-lg ring-1 ring-pang-cabinet-edge">
      <div className="mb-2 rounded-md bg-pang-marquee px-3 py-2 text-center ring-2 ring-pang-trim">
        <span className="text-lg font-bold tracking-widest text-pang-marquee-ink">PANG</span>
      </div>
      <div
        className="relative rounded-md bg-pang-bezel p-2"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="relative overflow-hidden rounded-sm">
          {screen}
          <div className="pang-crt pointer-events-none absolute inset-0" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-3">
        <div className="flex items-center gap-2">
          <HoldButton label="Left" className={directionButton} onHeld={(held) => onMove("left", held)}>
            L
          </HoldButton>
          <div aria-hidden className="size-6 rounded-full bg-pang-trim" />
          <HoldButton label="Right" className={directionButton} onHeld={(held) => onMove("right", held)}>
            R
          </HoldButton>
        </div>
        <div className="flex items-center gap-3">
          <TapButton label={primaryLabel} className={startButton} onPress={onPrimary}>
            {primaryLabel}
          </TapButton>
          <HoldButton label="Fire" className={fireButton} onHeld={onFire}>
            FIRE
          </HoldButton>
        </div>
      </div>
    </div>
  )
}
