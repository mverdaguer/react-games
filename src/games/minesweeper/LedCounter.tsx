function formatLed(value: number) {
  const clamped = Math.max(-99, Math.min(999, Math.trunc(value)))
  if (clamped < 0) {
    return `-${String(Math.abs(clamped)).padStart(2, "0")}`
  }
  return String(clamped).padStart(3, "0")
}

export function LedCounter({ value, label }: { value: number; label: string }) {
  return (
    <div
      aria-label={`${label}: ${value}`}
      className="border-2 border-t-mine-bevel-dark border-r-mine-bevel-light border-b-mine-bevel-light border-l-mine-bevel-dark bg-black px-1 font-mono text-2xl leading-none tracking-tight text-red-500 tabular-nums"
    >
      <span aria-hidden="true">{formatLed(value)}</span>
    </div>
  )
}
