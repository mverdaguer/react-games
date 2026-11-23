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
const CONTINUE_FETCH_ATTEMPTS = 3
const REQUEST_MS = 10_000

export async function fetchScores(game: GameId): Promise<BoardResult> {
  const loaded = await requestJson(`/api/scores?game=${game}`)
  if (loaded.status !== "ok") return { status: "unavailable" }
  const { response, body } = loaded
  if (!response.ok || !body || !("scores" in body)) return { status: "unavailable" }
  const scores = body.scores
  if (!Array.isArray(scores)) return { status: "unavailable" }
  return { status: "ok", scores: scores.flatMap(scoreRow) }
}

export async function submitRun(run: RecordedRun, name: string): Promise<SubmitResult> {
  const created = await requestJson("/api/runs", {
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
  if (created.status !== "ok") return { status: "unavailable" }
  const body = created.body
  if (!body || !("status" in body)) return { status: "unavailable" }
  if (body.status === "not-placed") return { status: "not-placed" }
  if (body.status === "rejected") return { status: "rejected" }
  if (body.status !== "running" || typeof body.id !== "string") return { status: "unavailable" }
  return await continueUntilDone(body.id)
}

async function continueUntilDone(id: string): Promise<SubmitResult> {
  for (let step = 0; step < CONTINUE_LIMIT; step += 1) {
    let loaded: Awaited<ReturnType<typeof requestJson>> | undefined
    for (let attempt = 1; attempt <= CONTINUE_FETCH_ATTEMPTS; attempt += 1) {
      loaded = await requestJson(`/api/runs/${id}/continue`, { method: "POST" })
      if (loaded.status === "expired") return { status: "unavailable" }
      if (loaded.status === "ok") break
      if (attempt === CONTINUE_FETCH_ATTEMPTS) return { status: "unavailable" }
    }
    if (!loaded || loaded.status !== "ok") return { status: "unavailable" }
    const body = loaded.body
    if (!body || !("status" in body) || typeof body.status !== "string") return { status: "unavailable" }
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

type JsonRequest =
  | { status: "ok"; response: Response; body: Record<string, unknown> | null }
  | { status: "expired" }
  | { status: "failed" }

async function requestJson(url: string, init?: RequestInit): Promise<JsonRequest> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return { status: "ok", response, body: await readJson(response) }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return { status: "expired" }
    return { status: "failed" }
  } finally {
    clearTimeout(timer)
  }
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  const type = response.headers.get("content-type") ?? ""
  if (!type.includes("application/json")) return null
  try {
    const body: unknown = await response.json()
    if (!body || typeof body !== "object") return null
    return body as Record<string, unknown>
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error
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
