import type { GameId, RecordedRun } from "@/games/shared/leaderboard"

export type ScoreRow = {
  id: number
  name: string
  score: number
  level: number
}

export type BoardResult = { status: "ok"; scores: ScoreRow[] } | { status: "unavailable" }

export type SubmitResult =
  | { status: "saved"; rank: number; score: number }
  | { status: "not-placed" }
  | { status: "rejected" }
  | { status: "unavailable" }

const CONTINUE_LIMIT = 200

export async function fetchScores(game: GameId): Promise<BoardResult> {
  try {
    const response = await fetch(`/api/scores?game=${game}`)
    const body = await readJson(response)
    if (!response.ok || !body || typeof body !== "object" || !("scores" in body)) {
      return { status: "unavailable" }
    }
    const scores = body.scores
    if (!Array.isArray(scores)) return { status: "unavailable" }
    return { status: "ok", scores: scores.flatMap(scoreRow) }
  } catch {
    return { status: "unavailable" }
  }
}

export async function submitRun(run: RecordedRun, name: string): Promise<SubmitResult> {
  try {
    const created = await fetch("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        game: run.game,
        level: run.level,
        name,
        seed: run.seed,
        claimed: run.score,
        log: run.log,
      }),
    })
    const body = await readJson(created)
    if (!body || typeof body !== "object" || !("status" in body)) return { status: "unavailable" }
    if (body.status === "not-placed") return { status: "not-placed" }
    if (body.status === "rejected") return { status: "rejected" }
    if (body.status !== "running" || typeof body.id !== "string") return { status: "unavailable" }
    return continueUntilDone(body.id)
  } catch {
    return { status: "unavailable" }
  }
}

async function continueUntilDone(id: string): Promise<SubmitResult> {
  for (let step = 0; step < CONTINUE_LIMIT; step += 1) {
    const response = await fetch(`/api/runs/${id}/continue`, { method: "POST" })
    const body = await readJson(response)
    if (!body || typeof body !== "object" || !("status" in body) || typeof body.status !== "string") {
      return { status: "unavailable" }
    }
    if (body.status === "running") continue
    if (body.status === "saved" && typeof body.rank === "number" && typeof body.score === "number") {
      return { status: "saved", rank: body.rank, score: body.score }
    }
    if (body.status === "not-placed") return { status: "not-placed" }
    if (body.status === "rejected") return { status: "rejected" }
    if (body.status === "conflict") continue
    return { status: "unavailable" }
  }
  return { status: "unavailable" }
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  const type = response.headers.get("content-type") ?? ""
  if (!type.includes("application/json")) return null
  try {
    const body: unknown = await response.json()
    if (!body || typeof body !== "object") return null
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

function scoreRow(value: unknown): ScoreRow[] {
  if (!value || typeof value !== "object") return []
  const row = value as { id?: unknown; name?: unknown; score?: unknown; level?: unknown }
  if (typeof row.id !== "number" || typeof row.name !== "string") return []
  if (typeof row.score !== "number" || typeof row.level !== "number") return []
  return [{ id: row.id, name: row.name, score: row.score, level: row.level }]
}
