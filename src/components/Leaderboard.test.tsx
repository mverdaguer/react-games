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
  ranked: true,
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

function stub(handler: (url: string) => Response) {
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    if (url.includes("/api/runs")) calls.push(url.includes("/continue") ? "continue" : "post")
    return Promise.resolve(handler(url))
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

test("asks for a name when the score would place", async () => {
  stub(() => json({ scores: [{ id: 1, name: "Ada", score: 4, level: 1 }] }))
  const screen = await render(<Leaderboard game="snake" run={run} />)
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
  stub((url) => {
    if (url.includes("/continue")) {
      continued += 1
      if (continued === 1) return json({ status: "running", id: "run-1" })
      return json({ status: "saved", rank: 2, score: 12 }, 201)
    }
    if (url.includes("/api/runs")) return json({ status: "running", id: "run-1" }, 202)
    return json({ scores: [] })
  })

  const screen = await render(<Leaderboard game="snake" run={run} />)
  await userEvent.fill(screen.getByRole("textbox", { name: "Initials" }), "Ada")
  await screen.getByRole("button", { name: "Submit" }).click()
  await expect.element(screen.getByText("Saved. You are rank 2.")).toBeVisible()
  expect(calls.filter((call) => call === "continue")).toHaveLength(2)
})

test("rejects a blocked name before sending it", async () => {
  stub(() => json({ scores: [] }))
  const screen = await render(<Leaderboard game="snake" run={run} />)
  await userEvent.fill(screen.getByRole("textbox", { name: "Initials" }), "ass")
  await screen.getByRole("button", { name: "Submit" }).click()
  await expect.element(screen.getByRole("alert")).toHaveTextContent("That name isn't allowed. Try another.")
  expect(calls).not.toContain("post")
})
