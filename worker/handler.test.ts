import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { MAX_BODY_BYTES } from "@/games/shared/leaderboard"

import { handle } from "./index"

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "../migrations")

const CRASH_LOG = [
  [0, 0],
  [1, 2],
  [2, 1],
]

function database(): D1Database {
  const db = new DatabaseSync(":memory:")
  const files = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort()
  for (const name of files) db.exec(readFileSync(join(MIGRATIONS, name), "utf8"))
  return {
    prepare(query: string) {
      let binds: unknown[] = []
      const statement = {
        query,
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
            results: [],
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
        for (const statement of statements) {
          const prepared = statement as D1PreparedStatement & { query?: string }
          if (prepared.query && /^\s*SELECT\b/i.test(prepared.query)) {
            const selected = await prepared.all()
            results.push({ results: selected.results, meta: { changes: 0, last_row_id: 0 } })
          } else {
            results.push(await prepared.run())
          }
        }
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
      expect(await response.json()).toEqual({ status: "rejected", error: "name" })
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

  it("does not let a blocked name occupy a board slot", async () => {
    const db = database()
    for (let index = 0; index < 9; index += 1) {
      await db
        .prepare("INSERT INTO scores (game, level, name, score) VALUES (?, ?, ?, ?)")
        .bind("snake", 1, "Old", 0)
        .run()
    }
    await db
      .prepare("INSERT INTO scores (game, level, name, score) VALUES (?, ?, ?, ?)")
      .bind("snake", 1, "shit", 100)
      .run()

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
    expect(await finished.json()).toMatchObject({ status: "saved", score: 0, rank: 10 })

    const count = await db.prepare("SELECT COUNT(*) AS count FROM scores").first<{ count: number }>()
    expect(count?.count).toBe(10)
    const listed = await handle(new Request("https://games.local/api/scores?game=snake"), { DB: db })
    const body = (await listed.json()) as { scores: { name: string }[] }
    expect(body.scores.map((row) => row.name)).not.toContain("shit")
    expect(body.scores.some((row) => row.name === "ADA")).toBe(true)
  })

  it("returns the saved receipt when the same run is continued again", async () => {
    const db = database()
    const created = await post(db, "/api/runs", {
      game: "snake",
      level: 1,
      name: "Ada",
      seed: 1,
      claimed: 0,
      log: CRASH_LOG,
    })
    const { id } = (await created.json()) as { id: string }
    const finished = await settle(db, id)
    expect(finished.status).toBe(201)
    const saved = (await finished.json()) as { status: string; score: number; rank: number; level: number }

    const again = await post(db, `/api/runs/${id}/continue`)
    expect(again.status).toBe(201)
    expect(await again.json()).toEqual(saved)

    const count = await db.prepare("SELECT COUNT(*) AS count FROM scores").first<{ count: number }>()
    expect(count?.count).toBe(1)
  })

  it("does not replay a run older than an hour", async () => {
    const db = database()
    const created = await post(db, "/api/runs", {
      game: "snake",
      level: 1,
      name: "Ada",
      seed: 1,
      claimed: 0,
      log: CRASH_LOG,
    })
    const { id } = (await created.json()) as { id: string }
    await db.prepare("UPDATE runs SET created_at = datetime('now', '-2 hours') WHERE id = ?").bind(id).run()

    const continued = await post(db, `/api/runs/${id}/continue`)
    expect(continued.status).toBe(404)
    expect(await continued.json()).toEqual({ error: "missing" })
    const count = await db.prepare("SELECT COUNT(*) AS count FROM scores").first<{ count: number }>()
    expect(count?.count).toBe(0)
  })

  it("rejects a run when its name is blocked before the score is stored", async () => {
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
    const { id } = (await created.json()) as { id: string }
    await db.prepare("UPDATE runs SET name = ? WHERE id = ?").bind("ASS", id).run()

    const finished = await settle(db, id)
    expect(finished.status).toBe(422)
    expect(await finished.json()).toEqual({ status: "rejected" })
    const count = await db.prepare("SELECT COUNT(*) AS count FROM scores").first<{ count: number }>()
    expect(count?.count).toBe(10)
    const listed = await handle(new Request("https://games.local/api/scores?game=snake"), { DB: db })
    const body = (await listed.json()) as { scores: { name: string }[] }
    expect(body.scores.map((row) => row.name)).not.toContain("ASS")
  })

  it("returns the stored receipt when a finish loses the write", async () => {
    const inner = database()
    const created = await post(inner, "/api/runs", {
      game: "snake",
      level: 1,
      name: "Ada",
      seed: 1,
      claimed: 0,
      log: CRASH_LOG,
    })
    const { id } = (await created.json()) as { id: string }
    const db = {
      prepare(query: string) {
        const statement = inner.prepare(query)
        if (!query.startsWith("SELECT") || !query.includes("checkpoint")) return statement
        return {
          bind(...values: unknown[]) {
            return {
              async first<T>() {
                const row = await statement.bind(...values).first<T>()
                await inner.prepare("DELETE FROM runs WHERE id = ?").bind(id).run()
                await inner
                  .prepare(
                    `INSERT INTO run_results (id, status, score, rank, level, created_at)
                     VALUES (?, 'saved', 0, 3, 1, datetime('now'))`,
                  )
                  .bind(id)
                  .run()
                return row
              },
            }
          },
        }
      },
      batch: (statements: D1PreparedStatement[]) => inner.batch(statements),
    } as D1Database

    const finished = await post(db, `/api/runs/${id}/continue`)
    expect(finished.status).toBe(201)
    expect(await finished.json()).toEqual({ status: "saved", score: 0, rank: 3, level: 1 })
    const count = await inner.prepare("SELECT COUNT(*) AS count FROM scores").first<{ count: number }>()
    expect(count?.count).toBe(0)
  })

  it("rejects a body over 512 KiB before parsing it", async () => {
    const db = database()
    const response = await handle(
      new Request("https://games.local/api/runs", {
        method: "POST",
        body: "a".repeat(MAX_BODY_BYTES + 1),
      }),
      { DB: db },
    )
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: "body" })
  })

  it("rejects a multibyte body whose UTF-16 length is within the limit", async () => {
    const db = database()
    const text = "á".repeat(300_000)
    expect(text.length).toBeLessThan(MAX_BODY_BYTES)
    expect(new TextEncoder().encode(text).byteLength).toBeGreaterThan(MAX_BODY_BYTES)
    const response = await handle(
      new Request("https://games.local/api/runs", { method: "POST", body: text }),
      { DB: db },
    )
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: "body" })
  })

  it("forgets a receipt after the retry window", async () => {
    const db = database()
    const created = await post(db, "/api/runs", {
      game: "snake",
      level: 1,
      name: "Ada",
      seed: 1,
      claimed: 0,
      log: CRASH_LOG,
    })
    const { id } = (await created.json()) as { id: string }
    const finished = await settle(db, id)
    expect(finished.status).toBe(201)
    await db.prepare("UPDATE run_results SET created_at = datetime('now', '-2 hours') WHERE id = ?").bind(id).run()

    const again = await post(db, `/api/runs/${id}/continue`)
    expect(again.status).toBe(404)
    expect(await again.json()).toEqual({ error: "missing" })
  })
})
