export type LogEntry = readonly [tick: number, code: number]

export type Checkpoint<Game> = {
  game: Game
  tick: number
  cursor: number
}

export type AdvanceResult<Game> =
  | { status: "running"; checkpoint: Checkpoint<Game> }
  | { status: "done"; score: number; level: number }
  | { status: "rejected"; reason: string }

export type Replay<Game> = {
  begin(level: number, seed: number): Checkpoint<Game>
  advance(
    checkpoint: Checkpoint<Game>,
    log: readonly LogEntry[],
    budget: number,
  ): AdvanceResult<Game>
}

export function finishReplay<Game>(
  replay: Replay<Game>,
  level: number,
  seed: number,
  log: readonly LogEntry[],
  budget: number,
): AdvanceResult<Game> {
  let checkpoint = replay.begin(level, seed)
  let outcome = replay.advance(checkpoint, log, budget)
  while (outcome.status === "running") {
    if (outcome.checkpoint.tick <= checkpoint.tick) return { status: "rejected", reason: "stalled" }
    checkpoint = outcome.checkpoint
    outcome = replay.advance(checkpoint, log, budget)
  }
  return outcome
}
