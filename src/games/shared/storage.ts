export function readRecord(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

export function writeRecord(key: string, value: object): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or a full quota: the game carries on without saving.
  }
}

export function createBestStore<Level extends string | number>(
  key: string,
  levels: readonly Level[],
  beats: (candidate: number, stored: number) => boolean,
) {
  type Bests = Partial<Record<Level, number>>

  function load(): Bests {
    const record = readRecord(key)
    const bests: Bests = {}
    if (!record) return bests
    for (const level of levels) {
      const value = record[String(level)]
      if (typeof value === "number" && Number.isFinite(value)) bests[level] = value
    }
    return bests
  }

  function save(level: Level, value: number): Bests {
    const current = load()
    const stored = current[level]
    if (stored !== undefined && !beats(value, stored)) return current
    const next: Bests = { ...current, [level]: value }
    writeRecord(key, next)
    return next
  }

  return { load, save }
}
