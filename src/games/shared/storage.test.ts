import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createBestStore, readRecord, writeRecord } from "@/games/shared/storage"

const KEY = "shared:record:v1"

function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key) {
      return store.get(key) ?? null
    },
    key(index) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key) {
      store.delete(key)
    },
    setItem(key, value) {
      store.set(key, value)
    },
  }
}

describe("shared storage", () => {
  let storage: Storage

  beforeEach(() => {
    storage = memoryStorage()
    vi.stubGlobal("localStorage", storage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns null when the key is missing", () => {
    expect(readRecord(KEY)).toBeNull()
  })

  it("returns null for corrupt JSON and for values that are not records", () => {
    storage.setItem(KEY, "{")
    expect(readRecord(KEY)).toBeNull()

    for (const raw of ["null", "42", "\"hi\"", "true", "[]"]) {
      storage.setItem(KEY, raw)
      expect(readRecord(KEY)).toBeNull()
    }
  })

  it("returns null when getItem throws", () => {
    storage.getItem = () => {
      throw new Error("denied")
    }
    expect(readRecord(KEY)).toBeNull()
  })

  it("round-trips a record", () => {
    writeRecord(KEY, { score: 4, sound: true })
    expect(readRecord(KEY)).toEqual({ score: 4, sound: true })
    expect(storage.getItem(KEY)).toBe(JSON.stringify({ score: 4, sound: true }))
  })

  it("does not throw when setItem throws", () => {
    storage.setItem = () => {
      throw new Error("quota")
    }
    expect(() => writeRecord(KEY, { score: 1 })).not.toThrow()
    expect(readRecord(KEY)).toBeNull()
  })

  it("keeps a higher score, ignores unknown keys and non-finite values, and skips an equal write", () => {
    const scores = createBestStore("shared:scores:v1", [1, 2] as const, (score, stored) => score > stored)
    storage.setItem("shared:scores:v1", "{\"1\":1e309,\"2\":\"4\",\"9\":7,\"extra\":1}")
    expect(scores.load()).toEqual({})

    const setItem = vi.spyOn(storage, "setItem")
    expect(scores.save(1, 10)).toEqual({ 1: 10 })
    expect(setItem).toHaveBeenCalledWith("shared:scores:v1", JSON.stringify({ 1: 10 }))

    setItem.mockClear()
    expect(scores.save(1, 10)).toEqual({ 1: 10 })
    expect(scores.save(1, 4)).toEqual({ 1: 10 })
    expect(setItem).not.toHaveBeenCalled()

    expect(scores.save(1, 15)).toEqual({ 1: 15 })
    expect(scores.load()).toEqual({ 1: 15 })
  })

  it("keeps a lower time", () => {
    const times = createBestStore(
      "shared:times:v1",
      ["beginner", "expert"] as const,
      (time, stored) => time < stored,
    )
    const setItem = vi.spyOn(storage, "setItem")

    expect(times.save("beginner", 20)).toEqual({ beginner: 20 })
    setItem.mockClear()
    expect(times.save("beginner", 20)).toEqual({ beginner: 20 })
    expect(times.save("beginner", 30)).toEqual({ beginner: 20 })
    expect(setItem).not.toHaveBeenCalled()

    expect(times.save("beginner", 10)).toEqual({ beginner: 10 })
    expect(times.load()).toEqual({ beginner: 10 })
  })

  it("returns the new best when setItem throws", () => {
    const scores = createBestStore("shared:scores:v1", [1] as const, (score, stored) => score > stored)
    storage.setItem = () => {
      throw new Error("quota")
    }
    expect(scores.save(1, 8)).toEqual({ 1: 8 })
    expect(scores.load()).toEqual({})
  })
})
