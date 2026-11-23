import { describe, expect, it } from "vitest"

import { isAllowedName } from "@/games/shared/name-filter"

describe("isAllowedName", () => {
  it("blocks a listed word in its plain, loud, accented, swapped, spaced, and stretched forms", () => {
    for (const name of ["shit", "SHIT", "shít", "sh1t", "s h i t", "shiiit", "sh-it"]) {
      expect(`${name} ${isAllowedName(name)}`).toBe(`${name} false`)
    }
  })

  it("blocks Spanish and Catalan insults, including disguises", () => {
    for (const name of ["puta", "PÚTA", "put4", "mierda", "cabrón", "gilipollas", "merda", "collons"]) {
      expect(`${name} ${isAllowedName(name)}`).toBe(`${name} false`)
    }
  })

  it("allows ordinary names, including ones that contain a short blocked word", () => {
    for (const name of [
      "Núria",
      "Cassandra",
      "Scunthorpe",
      "peacock",
      "classic",
      "Dickens",
      "Assisi",
      "analyst",
      "Cockburn",
    ]) {
      expect(`${name} ${isAllowedName(name)}`).toBe(`${name} true`)
    }
  })

  it("blocks a short word used on its own or split across the whole name", () => {
    expect(isAllowedName("ass")).toBe(false)
    expect(isAllowedName("f u c k")).toBe(false)
    expect(isAllowedName("f-u-c-k")).toBe(false)
  })

  it("blocks a long word hidden inside a longer name", () => {
    expect(isAllowedName("xxmierdaxx")).toBe(false)
    expect(isAllowedName("super bitch")).toBe(false)
  })
})
