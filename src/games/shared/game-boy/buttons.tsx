import type { PointerEvent, ReactNode } from "react"

export type HoldDir = "left" | "right" | "down" | "up"

export const directionButton =
  "inline-flex size-11 cursor-pointer items-center justify-center rounded-md bg-gbc-button text-gbc-button-ink"

export const roundButton =
  "inline-flex size-12 cursor-pointer items-center justify-center rounded-full bg-gbc-button text-xs font-medium text-gbc-button-ink"

export const pillButton =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gbc-button px-4 text-xs font-medium tracking-wide text-gbc-button-ink"

type TapButtonProps = {
  label: string
  className: string
  pressed?: boolean
  onPress: () => void
  children: ReactNode
}

type HoldButtonProps<D extends HoldDir> = {
  label: string
  dir: D
  onHoldStart: (dir: D) => void
  onHoldEnd: (dir: D) => void
  children: ReactNode
}

function stopPointer(event: PointerEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
}

function press(event: PointerEvent<HTMLButtonElement>, action: () => void) {
  stopPointer(event)
  action()
}

export function TapButton({ label, className, pressed, onPress, children }: TapButtonProps) {
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

export function HoldButton<D extends HoldDir>({
  label,
  dir,
  onHoldStart,
  onHoldEnd,
  children,
}: HoldButtonProps<D>) {
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
