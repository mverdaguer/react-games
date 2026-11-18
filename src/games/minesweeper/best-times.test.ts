import { afterEach, describe, expect, it, vi } from "vitest"

import { loadBestTimes, saveBestTime } from "@/games/minesweeper/best-times"

const KEY = "minesweeper:best-times:v1"

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

describe("best times", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("is empty when nothing is stored", () => {
    vi.stubGlobal("localStorage", memoryStorage())
    expect(loadBestTimes()).toEqual({})
  })

  it("ignores bad JSON, non-objects, and non-finite values", () => {
    const storage = memoryStorage()
    vi.stubGlobal("localStorage", storage)

    storage.setItem(KEY, "{")
    expect(loadBestTimes()).toEqual({})

    for (const raw of ["null", "42", "\"hi\"", "true", "[]"]) {
      storage.setItem(KEY, raw)
      expect(loadBestTimes()).toEqual({})
    }

    storage.setItem(KEY, "{\"beginner\":1e309,\"intermediate\":\"4\",\"expert\":null}")
    expect(loadBestTimes()).toEqual({})

    storage.setItem(KEY, "{\"beginner\":12.5,\"intermediate\":null,\"expert\":8,\"other\":3}")
    expect(loadBestTimes()).toEqual({ beginner: 12.5, expert: 8 })
  })

  it("saves a faster time and keeps the stored time when the new one is not faster", () => {
    const storage = memoryStorage()
    const setItem = vi.spyOn(storage, "setItem")
    vi.stubGlobal("localStorage", storage)

    expect(saveBestTime("beginner", 20)).toEqual({ beginner: 20 })
    expect(setItem).toHaveBeenCalledWith(KEY, JSON.stringify({ beginner: 20 }))
    expect(loadBestTimes()).toEqual({ beginner: 20 })

    setItem.mockClear()
    expect(saveBestTime("beginner", 20)).toEqual({ beginner: 20 })
    expect(saveBestTime("beginner", 30)).toEqual({ beginner: 20 })
    expect(setItem).not.toHaveBeenCalled()
    expect(loadBestTimes()).toEqual({ beginner: 20 })

    expect(saveBestTime("beginner", 10)).toEqual({ beginner: 10 })
    expect(loadBestTimes()).toEqual({ beginner: 10 })
    expect(storage.getItem(KEY)).toBe(JSON.stringify({ beginner: 10 }))
  })

  it("returns the new value when setItem throws", () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error("quota")
    }
    vi.stubGlobal("localStorage", storage)
    expect(saveBestTime("expert", 15)).toEqual({ expert: 15 })
    expect(loadBestTimes()).toEqual({})
  })
})
