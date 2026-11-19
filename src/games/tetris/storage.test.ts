import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  DEFAULT_SETTINGS,
  loadBestScores,
  loadSettings,
  saveBestScore,
  saveSettings,
} from "@/games/tetris/storage"

const SCORES_KEY = "tetris:best-scores:v1"
const SETTINGS_KEY = "tetris:settings:v1"

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

describe("tetris storage", () => {
  let storage: Storage

  beforeEach(() => {
    storage = memoryStorage()
    vi.stubGlobal("localStorage", storage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("is empty when nothing is stored", () => {
    expect(loadBestScores()).toEqual({})
  })

  it("returns an empty map for corrupt JSON", () => {
    storage.setItem(SCORES_KEY, "{")
    expect(loadBestScores()).toEqual({})

    for (const raw of ["null", "42", '"hi"', "true", "[]"]) {
      storage.setItem(SCORES_KEY, raw)
      expect(loadBestScores()).toEqual({})
    }
  })

  it("ignores values that are not finite numbers and keys that are not start levels", () => {
    storage.setItem(
      SCORES_KEY,
      '{"0":5,"1":1e309,"2":"4","3":null,"9":3,"10":99,"-1":4,"fast":7}',
    )
    expect(loadBestScores()).toEqual({ 0: 5, 9: 3 })
  })

  it("keeps the higher score and does not write a lower or equal one", () => {
    const setItem = vi.spyOn(storage, "setItem")

    expect(saveBestScore(0, 10)).toEqual({ 0: 10 })
    expect(setItem).toHaveBeenCalledWith(SCORES_KEY, JSON.stringify({ 0: 10 }))
    expect(loadBestScores()).toEqual({ 0: 10 })

    setItem.mockClear()
    expect(saveBestScore(0, 10)).toEqual({ 0: 10 })
    expect(saveBestScore(0, 5)).toEqual({ 0: 10 })
    expect(setItem).not.toHaveBeenCalled()
    expect(loadBestScores()).toEqual({ 0: 10 })

    expect(saveBestScore(0, 15)).toEqual({ 0: 15 })
    expect(loadBestScores()).toEqual({ 0: 15 })
    expect(storage.getItem(SCORES_KEY)).toBe(JSON.stringify({ 0: 15 }))
  })

  it("writes a score and reads it back", () => {
    expect(saveBestScore(2, 4)).toEqual({ 2: 4 })
    expect(saveBestScore(5, 9)).toEqual({ 2: 4, 5: 9 })
    expect(saveBestScore(2, 1)).toEqual({ 2: 4, 5: 9 })
    expect(loadBestScores()).toEqual({ 2: 4, 5: 9 })
    expect(storage.getItem(SCORES_KEY)).toBe(JSON.stringify({ 2: 4, 5: 9 }))
  })

  it("returns default settings when nothing is stored", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(loadSettings()).toEqual({ startLevel: 0, sound: false, preview: true })
  })

  it("falls back when settings fields are invalid", () => {
    storage.setItem(SETTINGS_KEY, "{")
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)

    for (const raw of ["null", "42", '"hi"', "true", "[]"]) {
      storage.setItem(SETTINGS_KEY, raw)
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    }

    storage.setItem(SETTINGS_KEY, JSON.stringify({ startLevel: 10, sound: true, preview: false }))
    expect(loadSettings()).toEqual({ startLevel: 0, sound: true, preview: false })

    storage.setItem(SETTINGS_KEY, JSON.stringify({ startLevel: -1, sound: false, preview: true }))
    expect(loadSettings()).toEqual({ startLevel: 0, sound: false, preview: true })

    storage.setItem(SETTINGS_KEY, JSON.stringify({ startLevel: 1.5, sound: true, preview: false }))
    expect(loadSettings()).toEqual({ startLevel: 0, sound: true, preview: false })

    storage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ startLevel: "fast", sound: false, preview: false }),
    )
    expect(loadSettings()).toEqual({ startLevel: 0, sound: false, preview: false })

    storage.setItem(SETTINGS_KEY, JSON.stringify({ startLevel: 7, sound: "yes", preview: "no" }))
    expect(loadSettings()).toEqual({ startLevel: 7, sound: false, preview: true })

    storage.setItem(SETTINGS_KEY, JSON.stringify({ startLevel: 4, sound: true }))
    expect(loadSettings()).toEqual({ startLevel: 4, sound: true, preview: true })

    storage.setItem(SETTINGS_KEY, JSON.stringify({ startLevel: 0, sound: true, preview: false }))
    expect(loadSettings()).toEqual({ startLevel: 0, sound: true, preview: false })
  })

  it("round-trips settings", () => {
    const settings = { startLevel: 2 as const, sound: true, preview: false }
    expect(saveSettings(settings)).toEqual(settings)
    expect(loadSettings()).toEqual(settings)
    expect(storage.getItem(SETTINGS_KEY)).toBe(JSON.stringify(settings))
  })

  it("returns the new score when setItem throws", () => {
    storage.setItem = () => {
      throw new Error("quota")
    }
    expect(saveBestScore(3, 8)).toEqual({ 3: 8 })
    expect(loadBestScores()).toEqual({})
    expect(saveSettings({ startLevel: 6, sound: true, preview: false })).toEqual({
      startLevel: 6,
      sound: true,
      preview: false,
    })
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it("returns defaults when getItem throws", () => {
    storage.getItem = () => {
      throw new Error("denied")
    }
    expect(loadBestScores()).toEqual({})
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
