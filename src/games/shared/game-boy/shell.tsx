import type { PointerEvent, ReactNode } from "react"

type FrameProps = { children: ReactNode }

export function Frame({ children }: FrameProps) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-4xl bg-gbc-shell p-2 shadow-lg ring-1 ring-gbc-shell-edge">
      {children}
    </div>
  )
}

type ScreenProps = {
  children: ReactNode
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerCancel?: (event: PointerEvent<HTMLDivElement>) => void
}

export function Screen({
  children,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: ScreenProps) {
  return (
    <>
      <div
        className="flex touch-none flex-col gap-1 rounded-2xl bg-gbc-bezel p-2 select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div aria-hidden className="size-2 rounded-full bg-gbc-led" />
        <div className="overflow-hidden rounded-md bg-gbc-screen p-1">{children}</div>
      </div>
      <span className="block text-center text-xs font-medium tracking-widest text-gbc-bezel">
        GAME BOY COLOR
      </span>
    </>
  )
}

type DPadProps = {
  up: ReactNode
  left: ReactNode
  right: ReactNode
  down: ReactNode
}

export function DPad({ up, left, right, down }: DPadProps) {
  return (
    <div className="grid grid-cols-3 gap-1">
      <div className="size-11" />
      {up}
      <div className="size-11" />
      {left}
      <div aria-hidden className="size-11 rounded-md bg-gbc-button" />
      {right}
      <div className="size-11" />
      {down}
      <div className="size-11" />
    </div>
  )
}

type ActionButtonsProps = { a: ReactNode; b: ReactNode }

export function ActionButtons({ a, b }: ActionButtonsProps) {
  return (
    <div className="flex items-end gap-3">
      <div className="mb-4">{a}</div>
      {b}
    </div>
  )
}

export function Pills({ children }: { children: ReactNode }) {
  return <div className="flex justify-center gap-6 pt-2">{children}</div>
}

export function Speaker() {
  return (
    <div aria-hidden className="flex justify-end gap-1 pt-1">
      <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
      <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
      <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
      <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
      <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
      <span className="h-1 w-6 rounded-full bg-gbc-shell-edge" />
    </div>
  )
}
