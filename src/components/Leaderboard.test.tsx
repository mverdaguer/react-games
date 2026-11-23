import { useState } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import { Leaderboard } from "@/components/Leaderboard"
import type { RecordedRun } from "@/games/shared/leaderboard"

const run: RecordedRun = {
  game: "snake",
  level: 4,
  seed: 1,
  score: 12,
  log: [[0, 0]],
  unranked: null,
}

const calls: string[] = []

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  calls.length = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function stub(handler: (request: Request) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const url = request.url
    if (url.includes("/api/runs")) calls.push(url.includes("/continue") ? "continue" : "post")
    return Promise.resolve(handler(request))
  })
}

test("shows the top scores for the game", async () => {
  stub(() =>
    json({
      scores: [
        { id: 1, name: "Ada", score: 40, level: 9 },
        { id: 2, name: "Bea", score: 10, level: 2 },
      ],
    }),
  )
  const screen = await render(<Leaderboard game="snake" run={null} />)
  await expect.element(screen.getByText("1. Ada")).toBeVisible()
  await expect.element(screen.getByText("40 · Level 9")).toBeVisible()
  await expect.element(screen.getByText("2. Bea")).toBeVisible()
})

test("says the leaderboard is unavailable when the response is not JSON", async () => {
  vi.stubGlobal(
    "fetch",
    () => Promise.resolve(new Response("<html></html>", { headers: { "content-type": "text/html" } })),
  )
  const screen = await render(<Leaderboard game="snake" run={null} />)
  await expect.element(screen.getByText("Leaderboard unavailable")).toBeVisible()
})

test("keeps the initials to three letters", async () => {
  stub(() => json({ scores: [] }))
  const screen = await render(<Leaderboard game="snake" run={run} />)
  const initials = screen.getByRole("textbox", { name: "Initials" })
  await userEvent.fill(initials, "abcde")
  await expect.element(initials).toHaveValue("ABC")
})

test("asks for a name when the score would place", async () => {
  stub(() => json({ scores: [{ id: 1, name: "Ada", score: 4, level: 1 }] }))
  const screen = await render(<Leaderboard game="snake" run={run} />)
  await expect.element(screen.getByRole("dialog", { name: "Save your score" })).toBeVisible()
  await expect.element(screen.getByRole("textbox", { name: "Initials" })).toBeVisible()
})

test("closes the initials dialog and opens it again", async () => {
  stub(() => json({ scores: [] }))
  const screen = await render(<Leaderboard game="snake" run={run} />)
  await expect.element(screen.getByRole("textbox", { name: "Initials" })).toBeVisible()
  await screen.getByRole("button", { name: "Close" }).click()
  expect(screen.getByRole("textbox", { name: "Initials" }).elements()).toHaveLength(0)
  await screen.getByRole("button", { name: "Enter initials" }).click()
  await expect.element(screen.getByRole("textbox", { name: "Initials" })).toBeVisible()
})

test("does not ask when the board is full and the score only ties it", async () => {
  stub(() =>
    json({
      scores: Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        name: "Ada",
        score: 100 - index,
        level: 1,
      })),
    }),
  )
  const screen = await render(<Leaderboard game="snake" run={{ ...run, score: 91 }} />)
  await expect.element(screen.getByText("1. Ada")).toBeVisible()
  expect(screen.getByRole("textbox", { name: "Initials" }).elements()).toHaveLength(0)
})

test("submits the run and keeps checking until it is saved", async () => {
  let continued = 0
  const posts: { method: string; url: string; body: unknown }[] = []
  stub(async (request) => {
    const url = new URL(request.url)
    if (request.method === "POST" && url.pathname === "/api/runs") {
      posts.push({ method: request.method, url: url.pathname, body: await request.json() })
      return json({ status: "running", id: "run-1" }, 202)
    }
    if (request.method === "POST" && url.pathname === "/api/runs/run-1/continue") {
      posts.push({ method: request.method, url: url.pathname, body: null })
      continued += 1
      if (continued === 1) return json({ status: "running", id: "run-1" })
      return json({ status: "saved", rank: 2, score: 12 }, 201)
    }
    return json({ scores: [] })
  })

  const screen = await render(<Leaderboard game="snake" run={run} />)
  await userEvent.fill(screen.getByRole("textbox", { name: "Initials" }), "Ada")
  await screen.getByRole("button", { name: "Submit" }).click()
  await expect.element(screen.getByText("Saved at rank 2.")).toBeVisible()
  expect(posts.map((post) => `${post.method} ${post.url}`)).toEqual([
    "POST /api/runs",
    "POST /api/runs/run-1/continue",
    "POST /api/runs/run-1/continue",
  ])
  expect(posts[0]?.body).toMatchObject({ game: "snake", name: "ADA", claimed: 12, log: [[0, 0]] })
  expect(calls.filter((call) => call === "continue")).toHaveLength(2)
})

test("keeps the loaded scores when a submission cannot be checked", async () => {
  stub((request) => {
    if (request.method === "POST") return json({ error: "body" }, 400)
    return json({ scores: [{ id: 1, name: "Ada", score: 4, level: 1 }] })
  })
  const screen = await render(<Leaderboard game="snake" run={run} />)
  await expect.element(screen.getByText("1. Ada")).toBeVisible()
  await userEvent.fill(screen.getByRole("textbox", { name: "Initials" }), "Ada")
  await screen.getByRole("button", { name: "Submit" }).click()
  await expect.element(screen.getByRole("alert")).toHaveTextContent(
    "The leaderboard could not be reached. Try again.",
  )
  await expect.element(screen.getByText("1. Ada")).toBeVisible()
  await expect.element(screen.getByRole("textbox", { name: "Initials" })).toBeVisible()
})

test("loads the scores again from the unavailable board", async () => {
  let recovered = false
  vi.stubGlobal("fetch", () => {
    if (!recovered) {
      return Promise.resolve(new Response("<html></html>", { headers: { "content-type": "text/html" } }))
    }
    return Promise.resolve(json({ scores: [{ id: 1, name: "Ada", score: 4, level: 1 }] }))
  })
  const screen = await render(<Leaderboard game="snake" run={run} />)
  await expect.element(screen.getByText("Leaderboard unavailable")).toBeVisible()
  expect(screen.getByRole("textbox", { name: "Initials" }).elements()).toHaveLength(0)
  recovered = true
  await screen.getByRole("button", { name: "Try again" }).click()
  await expect.element(screen.getByText("1. Ada")).toBeVisible()
  await expect.element(screen.getByRole("textbox", { name: "Initials" })).toBeVisible()
})

test("lets a newer run be submitted while an earlier check is still running", async () => {
  let release: ((response: Response) => void) | undefined
  stub((request) => {
    if (request.method === "POST") {
      return new Promise((resolve) => {
        release = resolve
      })
    }
    return json({ scores: [] })
  })

  function Board() {
    const [current, setCurrent] = useState(run)
    return (
      <>
        <button type="button" onClick={() => setCurrent({ ...run, seed: 2, score: 30 })}>
          Next run
        </button>
        <Leaderboard game="snake" run={current} />
      </>
    )
  }

  const screen = await render(<Board />)
  await userEvent.fill(screen.getByRole("textbox", { name: "Initials" }), "Ada")
  await screen.getByRole("button", { name: "Submit" }).click()
  await expect.element(screen.getByRole("button", { name: "Checking score…" })).toBeVisible()
  await screen.getByRole("button", { name: "Next run" }).click()
  await expect.element(screen.getByRole("button", { name: "Submit" })).toBeEnabled()
  release?.(json({ status: "not-placed" }))
})

test("clears the format error when a letter is removed", async () => {
  stub(() => json({ scores: [] }))
  const screen = await render(<Leaderboard game="snake" run={run} />)
  const initials = screen.getByRole("textbox", { name: "Initials" })
  await userEvent.fill(initials, "AB")
  await screen.getByRole("button", { name: "Submit" }).click()
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Use 3 letters.")
  await userEvent.fill(initials, "A")
  await expect.element(initials).toHaveValue("A")
  expect(screen.getByRole("alert").elements()).toHaveLength(0)
})

test("rejects a blocked name before sending it", async () => {
  stub(() => json({ scores: [] }))
  const screen = await render(<Leaderboard game="snake" run={run} />)
  await userEvent.fill(screen.getByRole("textbox", { name: "Initials" }), "ass")
  await screen.getByRole("button", { name: "Submit" }).click()
  await expect.element(screen.getByRole("alert")).toHaveTextContent("That name isn't allowed. Try another.")
  expect(calls).not.toContain("post")
})
