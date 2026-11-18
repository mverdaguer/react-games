import type { Direction } from "./logic"

export const body = ["###", "###", "###"] as const

export const meal = ["###", "#.#", "###"] as const

export const apple = [".#.", "#.#", ".#."] as const

const headClosedRight = ["##.", "###", "##."] as const
const headOpenRight = ["###", "#..", "###"] as const
const tailRight = [".##", "###", ".##"] as const

function rotateClockwise(bitmap: readonly string[]): readonly string[] {
  const next = ["", "", ""]
  for (let y = 0; y < 3; y += 1) {
    let row = ""
    for (let x = 0; x < 3; x += 1) {
      row += bitmap[2 - x]?.[y] ?? "."
    }
    next[y] = row
  }
  return next
}

function facing(bitmap: readonly string[]): Record<Direction, readonly string[]> {
  const right = bitmap
  const down = rotateClockwise(right)
  const left = rotateClockwise(down)
  const up = rotateClockwise(left)
  return { right, down, left, up }
}

export const head: Record<"closed" | "open", Record<Direction, readonly string[]>> = {
  closed: facing(headClosedRight),
  open: facing(headOpenRight),
}

export const tail: Record<Direction, readonly string[]> = facing(tailRight)

export const critters: readonly (readonly string[])[] = [
  ["#.#.#.#", ".#####.", "#.#.#.#"],
  ["..##.#.", "######.", "##....."],
  ["##..#..", ".######", "##..#.."],
  ["#.....#", ".#####.", "#.#...#"],
]
