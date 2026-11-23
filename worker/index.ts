import { isAllowedName } from "@/games/shared/name-filter"
import { isGameId, MAX_BODY_BYTES } from "@/games/shared/leaderboard"
import { continueRun, createRun, listScores, type RunResult } from "./store"
import { validateSubmission } from "./validate"

type ApiEnv = {
  DB: D1Database
  ASSETS?: Fetcher
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env)
  },
}

export async function handle(request: Request, env: ApiEnv): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === "GET" && url.pathname === "/api/scores") {
    const game = url.searchParams.get("game")
    if (!isGameId(game)) return json({ error: "game" }, 422)
    const scores = await listScores(env.DB, game)
    return json({ scores })
  }

  if (request.method === "POST" && url.pathname === "/api/runs") {
    return submit(request, env)
  }

  const continued = /^\/api\/runs\/([0-9a-f-]{36})\/continue$/.exec(url.pathname)
  if (request.method === "POST" && continued?.[1]) {
    const result = await continueRun(env.DB, continued[1])
    return runResponse(result)
  }

  if (request.method === "GET" && !isApiPath(url.pathname) && env.ASSETS) {
    return env.ASSETS.fetch(new Request(new URL("/index.html", url), request))
  }

  return json({ error: "not found" }, 404)
}

async function submit(request: Request, env: ApiEnv): Promise<Response> {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return json({ error: "body" }, 413)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return json({ error: "body" }, 400)
  }
  const validation = validateSubmission(parsed)
  if (!validation.ok) return json({ status: "rejected", error: validation.error }, 422)
  if (!isAllowedName(validation.submission.name)) return json({ status: "rejected", error: "name" }, 422)
  const result = await createRun(env.DB, crypto.randomUUID(), validation.submission)
  return runResponse(result)
}

function runResponse(result: RunResult): Response {
  switch (result.status) {
    case "running":
      return json({ status: "running", id: result.id }, 202)
    case "saved":
      return json(
        { status: "saved", score: result.score, rank: result.rank, level: result.level },
        201,
      )
    case "not-placed":
      return json({ status: "not-placed" }, 200)
    case "rejected":
      return json({ status: "rejected" }, 422)
    case "missing":
      return json({ error: "missing" }, 404)
    case "conflict":
      return json({ status: "conflict" }, 409)
  }
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/")
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  })
}
