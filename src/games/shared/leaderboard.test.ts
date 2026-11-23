import { describe, expect, it } from "vitest"

import {
  BOARD_SIZE,
  checkName,
  parseClaimed,
  parseInputLevel,
  parseLog,
  parseSeed,
  pastTickLimit,
  qualifies,
  recordInput,
} from "@/games/shared/leaderboard"

describe("checkName", () => {
  it("trims three letters and stores them in capitals", () => {
    expect(checkName("  ada ")).toEqual({ ok: true, name: "ADA" })
    expect(checkName("ñoé")).toEqual({ ok: true, name: "ÑOÉ" })
    expect(checkName("AAS")).toEqual({ ok: true, name: "AAS" })
  })

  it("rejects the wrong length, a digit, and a blocked word", () => {
    expect(checkName("")).toEqual({ ok: false, reason: "format" })
    expect(checkName("AB")).toEqual({ ok: false, reason: "format" })
    expect(checkName("ABCD")).toEqual({ ok: false, reason: "format" })
    expect(checkName("A1B")).toEqual({ ok: false, reason: "format" })
    expect(checkName("ASS")).toEqual({ ok: false, reason: "rude" })
    expect(checkName(12)).toEqual({ ok: false, reason: "format" })
  })
})

describe("parseSeed and parseClaimed", () => {
  it("accepts the ends of the seed range and rejects the rest", () => {
    expect(parseSeed(0)).toBe(0)
    expect(parseSeed(0xffffffff)).toBe(0xffffffff)
    expect(parseSeed(-1)).toBeNull()
    expect(parseSeed(0x1_0000_0000)).toBeNull()
    expect(parseSeed(1.5)).toBeNull()
  })

  it("accepts a whole score and rejects a fraction", () => {
    expect(parseClaimed(0)).toBe(0)
    expect(parseClaimed(1.2)).toBeNull()
    expect(parseClaimed(-1)).toBeNull()
  })
})

describe("parseInputLevel", () => {
  it("checks each game's levels", () => {
    expect(parseInputLevel("snake", 1)).toBe(1)
    expect(parseInputLevel("snake", 9)).toBe(9)
    expect(parseInputLevel("snake", 0)).toBeNull()
    expect(parseInputLevel("tetris", 0)).toBe(0)
    expect(parseInputLevel("tetris", 10)).toBeNull()
    expect(parseInputLevel("pang", undefined)).toBe(0)
    expect(parseInputLevel("pang", 4)).toBe(4)
  })
})

describe("parseLog", () => {
  it("keeps an ordered snake log and rejects a third turn on the same tick", () => {
    expect(parseLog("snake", [[0, 0], [0, 1], [2, 3]])).toEqual([[0, 0], [0, 1], [2, 3]])
    expect(parseLog("snake", [[0, 0], [0, 1], [0, 2]])).toBeNull()
    expect(parseLog("snake", [[1, 0], [0, 1]])).toBeNull()
    expect(parseLog("snake", [[0, 4]])).toBeNull()
  })

  it("requires pang ticks to increase", () => {
    expect(parseLog("pang", [[0, 1], [2, 0]])).toEqual([[0, 1], [2, 0]])
    expect(parseLog("pang", [[1, 1], [1, 2]])).toBeNull()
    expect(parseLog("pang", [[0, 8]])).toBeNull()
  })

  it("accepts a tetris rotate and sixty-four actions on one tick", () => {
    const tick = Array.from({ length: 64 }, () => [0, 4])
    expect(parseLog("tetris", tick)).toEqual(tick)
    expect(parseLog("tetris", [...tick, [0, 4]])).toBeNull()
  })
})

describe("qualifies", () => {
  it("lets any score onto a short board and only a better score onto a full one", () => {
    const full = Array.from({ length: BOARD_SIZE }, (_, index) => ({ score: 100 - index }))
    expect(qualifies(0, [])).toBe(true)
    expect(qualifies(full[9].score + 1, full)).toBe(true)
    expect(qualifies(full[9].score, full)).toBe(false)
    expect(qualifies(full[9].score - 1, full)).toBe(false)
  })
})

describe("recordInput", () => {
  it("stops at the third snake turn in one tick and at the tick cap", () => {
    const log: [number, number][] = []
    expect(recordInput("snake", log, 0, 0)).toBe(true)
    expect(recordInput("snake", log, 0, 2)).toBe(true)
    expect(recordInput("snake", log, 0, 1)).toBe(false)
    expect(log).toEqual([
      [0, 0],
      [0, 2],
    ])
    expect(pastTickLimit("snake", 100_000)).toBe(false)
    expect(pastTickLimit("snake", 100_001)).toBe(true)
    expect(pastTickLimit("pang", 216_000)).toBe(false)
    expect(recordInput("snake", [], 100_000, 0)).toBe(false)
    const kept: [number, number][] = [[2, 0]]
    expect(recordInput("snake", kept, 1, 0)).toBe(false)
    expect(recordInput("snake", kept, 2, 9)).toBe(false)
    expect(recordInput("pang", [[1, 1]], 1, 0)).toBe(false)
    expect(kept).toEqual([[2, 0]])
  })
})
