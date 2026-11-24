export type BrickKind = "color" | "silver" | "gold"
export type ColorId = 0 | 1 | 2 | 3 | 4 | 5

export type Brick = {
  col: number
  row: number
  kind: BrickKind
  color: ColorId
  hits: number
}

export const ROUNDS: readonly (readonly string[])[] = [
  ["1111111111111", "2222222222222", "3333333333333", "4444444444444", "5555555555555", "6666666666666"],
  ["......1......", ".....222.....", "....33333....", "...4444444...", "..555555555..", ".66666666666."],
  ["1.1.1.1.1.1.1", ".2.2.2.2.2.2.", "3.3.3.3.3.3.3", ".4.4.4.4.4.4.", "5.5.5.5.5.5.5", ".6.6.6.6.6.6."],
  ["6666666666666", "5...........5", "4...........4", "3...........3", "2...........2", "1111111111111"],
  [
    "......6......",
    ".....555.....",
    "....44444....",
    "...3333333...",
    "..222222222..",
    ".11111111111.",
    "..222222222..",
    "...3333333...",
    "....44444....",
    ".....555.....",
    "......6......",
  ],
  ["1111111111111", "1111111111111", "11111...11111", "1111111111111", "2222222222222", "2222222222222"],
  ["sssssssssssss", "1111111111111", "sssssssssssss", "2222222222222", "sssssssssssss", "3333333333333"],
  ["ggggggggggggg", "1...........1", "2...........2", "3...........3", "4...........4", "5555555555555"],
  ["1616161616161", "2525252525252", "3434343434343", "4343434343434", "5252525252525", "6161616161616"],
  ["6666666666666", ".55555555555.", "..444444444..", "...3333333...", "....22222....", ".....111....."],
  [
    "1............",
    "12...........",
    "123..........",
    "1234.........",
    "12345........",
    "123456.......",
    ".23456s......",
    "..3456s......",
    "...456s......",
    "....56s......",
    ".....6s......",
    "......s......",
  ],
  ["g66666666666g", "6sssssssssss6", "6s.........s6", "6s.........s6", "6sssssssssss6", "g66666666666g"],
]

export function layoutFor(level: number): readonly string[] {
  const round = Math.max(1, Math.floor(level))
  const index = (round - 1) % ROUNDS.length
  return ROUNDS[index] ?? ROUNDS[0]
}

export function bricksFor(level: number): Brick[] {
  const round = Math.max(1, Math.floor(level))
  const rows = layoutFor(round)
  const silverHits = 2 + Math.floor(round / 8)
  const bricks: Brick[] = []
  for (let row = 0; row < rows.length; row += 1) {
    const line = rows[row] ?? ""
    for (let col = 0; col < line.length; col += 1) {
      const cell = line[col]
      if (cell === undefined || cell === ".") continue
      if (cell === "s") {
        bricks.push({ col, row, kind: "silver", color: 0, hits: silverHits })
        continue
      }
      if (cell === "g") {
        bricks.push({ col, row, kind: "gold", color: 0, hits: 1 })
        continue
      }
      const color = line.charCodeAt(col) - 49
      if (color < 0 || color > 5) continue
      bricks.push({ col, row, kind: "color", color: color as ColorId, hits: 1 })
    }
  }
  return bricks
}
