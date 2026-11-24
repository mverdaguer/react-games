import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  DEFAULT_SETTINGS,
  loadBest,
  loadSettings,
  saveBest,
  saveSettings,
} from "@/games/arkanoid/storage"

const BEST_KEY = "arkanoid:best:v1"
const SETTINGS_KEY = "arkanoid:settings:v1"

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

describe("arkanoid storage", () => {
  let storage: Storage

  beforeEach(() => {
    storage = memoryStorage()
    vi.stubGlobal("localStorage", storage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("is empty when nothing is stored", () => {
    expect(loadBest()).toBeNull()
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it("rejects corrupt records", () => {
    for (const raw of ["{", "null", "42", '"hi"', "[]", "true"]) {
      storage.setItem(BEST_KEY, raw)
      expect(loadBest()).toBeNull()
      storage.setItem(SETTINGS_KEY, raw)
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    }
  })

  it("ignores scores and levels that are not usable numbers", () => {
    storage.setItem(BEST_KEY, JSON.stringify({ score: -1, level: 2 }))
    expect(loadBest()).toBeNull()
    storage.setItem(BEST_KEY, JSON.stringify({ score: 10, level: 0 }))
    expect(loadBest()).toBeNull()
    storage.setItem(BEST_KEY, JSON.stringify({ score: "4", level: 2 }))
    expect(loadBest()).toBeNull()
    storage.setItem(SETTINGS_KEY, JSON.stringify({ sound: "yes" }))
    expect(loadSettings()).toEqual({ sound: false })
  })

  it("keeps the higher score and the further level", () => {
    expect(saveBest(100, 2)).toEqual({ score: 100, level: 2 })
    expect(saveBest(40, 3)).toEqual({ score: 100, level: 3 })
    expect(saveBest(250, 1)).toEqual({ score: 250, level: 3 })
    expect(loadBest()).toEqual({ score: 250, level: 3 })

    const setItem = vi.spyOn(storage, "setItem")
    expect(saveBest(250, 3)).toEqual({ score: 250, level: 3 })
    expect(setItem).not.toHaveBeenCalled()
  })

  it("round-trips settings", () => {
    expect(saveSettings({ sound: true })).toEqual({ sound: true })
    expect(loadSettings()).toEqual({ sound: true })
    expect(storage.getItem(SETTINGS_KEY)).toBe(JSON.stringify({ sound: true }))
  })

  it("returns the new values when storage throws", () => {
    storage.setItem = () => {
      throw new Error("quota")
    }
    expect(saveBest(8, 1)).toEqual({ score: 8, level: 1 })
    expect(loadBest()).toBeNull()
    expect(saveSettings({ sound: true })).toEqual({ sound: true })
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it("returns defaults when getItem throws", () => {
    storage.getItem = () => {
      throw new Error("denied")
    }
    expect(loadBest()).toBeNull()
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
