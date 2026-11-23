import { describe, expect, it } from "vitest"

import { handle } from "./index"

describe("spa asset fallback", () => {
  it("returns the index document for a non-api GET", async () => {
    const index = new Response("snake-app", { status: 200 })
    const response = await handle(new Request("https://games.local/games/snake"), {
      DB: {} as D1Database,
      ASSETS: {
        fetch(input: RequestInfo) {
          const assetRequest = input instanceof Request ? input : new Request(input)
          if (new URL(assetRequest.url).pathname === "/index.html") return Promise.resolve(index)
          return Promise.resolve(new Response("missing", { status: 404 }))
        },
      } as Fetcher,
    })

    expect(response).toBe(index)
  })

  it("keeps an unknown game as JSON and does not fetch assets", async () => {
    let calls = 0
    const response = await handle(new Request("https://games.local/api/scores?game=nope"), {
      DB: {} as D1Database,
      ASSETS: {
        fetch(input: RequestInfo) {
          void input
          calls += 1
          return Promise.resolve(new Response("index"))
        },
      } as Fetcher,
    })

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: "game" })
    expect(calls).toBe(0)
  })
})
