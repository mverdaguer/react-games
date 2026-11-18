import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import type { PointerEvent, ReactNode } from "react"
import type { Direction } from "./logic"

const directionIcon = {
  up: ChevronUp,
  down: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
} as const

type KeyCell =
  | { kind: "dead"; label: string }
  | { kind: "move"; label: string; direction: Direction; name: string }
  | { kind: "primary"; label: string }

const cells: KeyCell[] = [
  { kind: "dead", label: "1" },
  { kind: "move", label: "2", direction: "up", name: "Up" },
  { kind: "dead", label: "3" },
  { kind: "move", label: "4", direction: "left", name: "Left" },
  { kind: "primary", label: "5" },
  { kind: "move", label: "6", direction: "right", name: "Right" },
  { kind: "dead", label: "7" },
  { kind: "move", label: "8", direction: "down", name: "Down" },
  { kind: "dead", label: "9" },
  { kind: "dead", label: "*" },
  { kind: "dead", label: "0" },
  { kind: "dead", label: "#" },
]

const keyShape =
  "flex h-12 items-center justify-center gap-1 rounded-full bg-phone-key text-sm font-medium text-phone-key-ink"

function press(event: PointerEvent<HTMLButtonElement>, action: () => void) {
  event.preventDefault()
  action()
}

function KeyButton({
  digit,
  label,
  icon,
  onPress,
}: {
  digit: string
  label: string
  icon: ReactNode
  onPress: () => void
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      className={`${keyShape} cursor-pointer active:translate-y-px`}
      onPointerDown={(event) => press(event, onPress)}
      onClick={(event) => {
        if (event.detail === 0) onPress()
      }}
    >
      {digit}
      {icon}
    </button>
  )
}

export function Keypad({
  onDirection,
  onPrimary,
  primaryLabel,
}: {
  onDirection: (dir: Direction) => void
  onPrimary: () => void
  primaryLabel: string
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {cells.map((cell) => {
        if (cell.kind === "dead") {
          return (
            <div key={cell.label} aria-hidden className={`${keyShape} opacity-40`}>
              {cell.label}
            </div>
          )
        }

        if (cell.kind === "primary") {
          return (
            <KeyButton
              key={cell.label}
              digit={cell.label}
              label={primaryLabel}
              onPress={onPrimary}
              icon={
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
              }
            />
          )
        }

        const Icon = directionIcon[cell.direction]
        return (
          <KeyButton
            key={cell.label}
            digit={cell.label}
            label={cell.name}
            onPress={() => onDirection(cell.direction)}
            icon={<Icon aria-hidden className="size-4" />}
          />
        )
      })}
    </div>
  )
}
