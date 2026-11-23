import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vitest"

import { handle } from "./index"

const MIGRATION = readFileSync(new URL("../migrations/0001_scores.sql", import.meta.url), "utf8")

const CRASH_LOG = [
  [0, 0],
  [1, 2],
  [2, 1],
]

function database(): D1Database {
  const db = new DatabaseSync(":memory:")
  db.exec(MIGRATION)
  return {
    prepare(query: string) {
      let binds: unknown[] = []
      const statement = {
        bind(...values: unknown[]) {
          binds = values
          return statement
        },
        async first<T>() {
          const row = db.prepare(query).get(...(binds as never[]))
          return (row as T | undefined) ?? null
        },
        async all<T>() {
          return { results: db.prepare(query).all(...(binds as never[])) as T[] }
        },
        async run() {
          const info = db.prepare(query).run(...(binds as never[]))
          return {
            meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) },
          }
        },
      }
      return statement as unknown as D1PreparedStatement
    },
    async batch(statements: D1PreparedStatement[]) {
      db.exec("BEGIN")
      try {
        const results = []
        for (const statement of statements) results.push(await statement.run())
        db.exec("COMMIT")
        return results
      } catch (error) {
        db.exec("ROLLBACK")
        throw error
      }
    },
  } as D1Database
}

function post(db: D1Database, path: string, body?: unknown) {
  return handle(
    new Request(`https://games.local${path}`, {
      method: "POST",
      body: body === undefined ? "" : JSON.stringify(body),
    }),
    { DB: db },
  )
}

async function settle(db: D1Database, id: string) {
  let response: Response | null = null
  for (let step = 0; step < 20; step += 1) {
    response = await post(db, `/api/runs/${id}/continue`)
    const payload = (await response.clone().json()) as { status?: string }
    if (payload.status !== "running") return response
  }
  throw new Error("run did not finish")
}

describe("scores api", () => {
  it("saves a replayed snake score and then keeps only the top ten", async () => {
    const db = database()
    for (let index = 0; index < 10; index += 1) {
      await db
        .prepare("INSERT INTO scores (game, level, name, score) VALUES (?, ?, ?, ?)")
        .bind("snake", 1, "Old", -1)
        .run()
    }

    const created = await post(db, "/api/runs", {
      game: "snake",
      level: 1,
      name: "Ada",
      seed: 1,
      claimed: 0,
      log: CRASH_LOG,
    })
    expect(created.status).toBe(202)
    const { id } = (await created.json()) as { id: string }

    const finished = await settle(db, id)
    expect(finished.status).toBe(201)
    const saved = (await finished.json()) as { status: string; score: number; rank: number }
    expect(saved).toMatchObject({ status: "saved", score: 0 })
    expect(saved.rank).toBe(1)

    const listed = await handle(new Request("https://games.local/api/scores?game=snake"), { DB: db })
    const body = (await listed.json()) as { scores: { name: string; score: number }[] }
    expect(body.scores).toHaveLength(10)
    expect(body.scores[0]).toMatchObject({ name: "ADA", score: 0 })
    expect(body.scores.filter((row) => row.score === -1)).toHaveLength(9)
  })

  it("does not store a score that only ties the tenth", async () => {
    const db = database()
    for (let index = 0; index < 10; index += 1) {
      await db
        .prepare("INSERT INTO scores (game, level, name, score) VALUES (?, ?, ?, ?)")
        .bind("snake", 1, "Old", 0)
        .run()
    }
    const response = await post(db, "/api/runs", {
      game: "snake",
      level: 1,
      name: "Ada",
      seed: 1,
      claimed: 0,
      log: CRASH_LOG,
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: "not-placed" })
    const count = await db.prepare("SELECT COUNT(*) AS count FROM scores").first<{ count: number }>()
    expect(count?.count).toBe(10)
  })

  it("rejects a claimed score that the replay does not produce", async () => {
    const db = database()
    const created = await post(db, "/api/runs", {
      game: "snake",
      level: 1,
      name: "Ada",
      seed: 1,
      claimed: 50,
      log: CRASH_LOG,
    })
    const { id } = (await created.json()) as { id: string }
    const finished = await settle(db, id)
    expect(finished.status).toBe(422)
    expect(await finished.json()).toEqual({ status: "rejected" })
    const count = await db.prepare("SELECT COUNT(*) AS count FROM scores").first<{ count: number }>()
    expect(count?.count).toBe(0)
  })

  it("rejects names that are the wrong length, not letters, or blocked", async () => {
    const db = database()
    for (const name of ["", "AB", "ABCD", "A1B", "ASS"]) {
      const response = await post(db, "/api/runs", {
        game: "snake",
        level: 1,
        name,
        seed: 1,
        claimed: 0,
        log: CRASH_LOG,
      })
      expect(`${name} ${response.status}`).toBe(`${name} 422`)
      expect(await response.json()).toEqual({ error: "name" })
    }

    const accepted = await post(db, "/api/runs", {
      game: "snake",
      level: 1,
      name: "ABC",
      seed: 1,
      claimed: 0,
      log: CRASH_LOG,
    })
    expect(accepted.status).toBe(202)
  })

  it("hides a stored name that the filter no longer allows", async () => {
    const db = database()
    await db
      .prepare("INSERT INTO scores (game, level, name, score) VALUES (?, ?, ?, ?)")
      .bind("snake", 1, "shit", 9)
      .run()
    await db
      .prepare("INSERT INTO scores (game, level, name, score) VALUES (?, ?, ?, ?)")
      .bind("snake", 1, "Ada", 3)
      .run()
    const response = await handle(new Request("https://games.local/api/scores?game=snake"), { DB: db })
    const body = (await response.json()) as { scores: { name: string }[] }
    expect(body.scores.map((row) => row.name)).toEqual(["Ada"])
  })
})
