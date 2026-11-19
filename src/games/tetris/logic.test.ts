import { describe, expect, it } from "vitest"

import {
  COLUMNS,
  ROWS,
  createGame,
  drawPiece,
  gravityMs,
  levelThreshold,
  move,
  pause,
  pieceCells,
  randomInt,
  rotate,
  softDrop,
  start,
  tick,
  type ActivePiece,
  type Game,
  type PieceKind,
  type Rotation,
} from "@/games/tetris/logic"

const ORDER = ["T", "J", "Z", "O", "S", "L", "I"] as const

const OFFSETS: Record<PieceKind, readonly (readonly (readonly [number, number])[])[]> = {
  T: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  J: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
  ],
  L: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  ],
  S: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  Z: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  ],
  O: [
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  I: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  ],
}

function findSeed(accept: (seed: number) => boolean): number {
  for (let seed = 0; seed <= 5000; seed += 1) {
    if (accept(seed)) return seed
  }
  throw new Error("no matching seed in 0..5000")
}

function playing(startLevel = 0, seed = 1): Game {
  return start(createGame(startLevel, seed))
}

function blankBoard(): (PieceKind | null)[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, () => null))
}

function punchRow(
  board: (PieceKind | null)[][],
  y: number,
  holes: readonly number[],
  kind: PieceKind,
) {
  const row = board[y]
  if (!row) return
  for (let x = 0; x < COLUMNS; x += 1) row[x] = holes.includes(x) ? null : kind
}

function cellsAt(kind: PieceKind, rotation: Rotation, x = 3, y = 0) {
  return OFFSETS[kind][rotation].map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
}

function withPiece(game: Game, active: ActivePiece, board = game.board): Game {
  return { ...game, active, board }
}

describe("createGame", () => {
  it("deals a ready game at the chosen start level", () => {
    for (const startLevel of [0, 5, 9, 19]) {
      const seed = 4
      const game = createGame(startLevel, seed)
      const active = drawPiece(seed, null)
      const next = drawPiece(active.seed, active.index)
      expect(game).toEqual(createGame(startLevel, seed))
      expect(game.status).toBe("ready")
      expect(game.score).toBe(0)
      expect(game.lines).toBe(0)
      expect(game.level).toBe(startLevel)
      expect(game.startLevel).toBe(startLevel)
      expect(game.lastClear).toBeNull()
      expect(game.active).toEqual({ kind: active.kind, rotation: 0, x: 3, y: 0 })
      expect(game.next).toBe(next.kind)
      expect(game.previousIndex).toBe(next.index)
      expect(game.seed).toBe(next.seed)
      expect(game.board).toHaveLength(ROWS)
      for (const row of game.board) {
        expect(row).toHaveLength(COLUMNS)
        expect(row.every((cell) => cell === null)).toBe(true)
      }
    }
  })

  it("spawns a T on the NES offsets and skips a repeat when the next draw is not a reroll", () => {
    let tSeed: number | null = null
    for (let seed = 0; seed <= 50; seed += 1) {
      if (createGame(0, seed).active.kind === "T") {
        tSeed = seed
        break
      }
    }
    expect(tSeed).not.toBeNull()
    const game = createGame(0, tSeed ?? 0)
    expect(game.active).toEqual({ kind: "T", rotation: 0, x: 3, y: 0 })
    expect(pieceCells(game.active)).toEqual([
      { x: 4, y: 0 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
    ])

    let foundDistinct = false
    for (let seed = 0; seed <= 50; seed += 1) {
      const active = drawPiece(seed, null)
      const [roll] = randomInt(active.seed, 8)
      if (roll === 7 || roll === active.index) continue
      const dealt = createGame(0, seed)
      expect(dealt.next).not.toBe(dealt.active.kind)
      expect(dealt.next).toBe(ORDER[roll])
      foundDistinct = true
    }
    expect(foundDistinct).toBe(true)
  })
})

describe("drawPiece", () => {
  it("rerolls a 7 into 0-6 and repeats for the same seed", () => {
    const seed = findSeed((value) => randomInt(value, 8)[0] === 7)
    const [roll, afterRoll] = randomInt(seed, 8)
    expect(roll).toBe(7)
    const [reroll, afterReroll] = randomInt(afterRoll, 7)
    const drawn = drawPiece(seed, null)
    expect(drawn.index).toBe(reroll)
    expect(drawn.seed).toBe(afterReroll)
    expect(drawn.kind).toBe(ORDER[drawn.index])
    expect(drawn.index).toBeGreaterThanOrEqual(0)
    expect(drawn.index).toBeLessThan(7)
    expect(drawPiece(seed, null)).toEqual(drawn)
  })

  it("rerolls when the first roll matches the previous piece", () => {
    const seed = findSeed((value) => randomInt(value, 8)[0] !== 7)
    const [roll, afterRoll] = randomInt(seed, 8)
    expect(roll).not.toBe(7)
    const [reroll, afterReroll] = randomInt(afterRoll, 7)
    const drawn = drawPiece(seed, roll)
    expect(drawn).toEqual({ kind: ORDER[reroll], index: reroll, seed: afterReroll })
    expect(drawn.index).not.toBe(7)
    expect(drawPiece(seed, roll)).toEqual(drawn)
  })

  it("never returns index 7 from a reroll", () => {
    const indexes: number[] = []
    for (let seed = 0; seed <= 5000; seed += 1) {
      const [roll] = randomInt(seed, 8)
      const drawn = roll === 7 ? drawPiece(seed, null) : drawPiece(seed, roll)
      indexes.push(drawn.index)
    }
    expect(indexes).toHaveLength(5001)
    expect(indexes.every((index) => index >= 0 && index < 7)).toBe(true)
  })
})

describe("move", () => {
  it("shifts while playing and refuses the walls and a game that has not started", () => {
    const ready = createGame(0, 1)
    expect(move(ready, -1)).toBe(ready)
    expect(move(ready, 1)).toBe(ready)

    let left = withPiece(playing(), { kind: "T", rotation: 0, x: 3, y: 0 })
    for (let step = 0; step < 3; step += 1) {
      const next = move(left, -1)
      expect(next).not.toBe(left)
      expect(next.active.x).toBe(left.active.x - 1)
      left = next
    }
    expect(left.active.x).toBe(0)
    expect(pieceCells(left.active).some((cell) => cell.x === 0)).toBe(true)
    expect(move(left, -1)).toBe(left)

    let right = withPiece(playing(), { kind: "T", rotation: 0, x: 3, y: 0 })
    for (let step = 0; step < 4; step += 1) {
      const next = move(right, 1)
      expect(next).not.toBe(right)
      expect(next.active.x).toBe(right.active.x + 1)
      right = next
    }
    expect(right.active.x).toBe(7)
    expect(pieceCells(right.active).some((cell) => cell.x === COLUMNS - 1)).toBe(true)
    expect(move(right, 1)).toBe(right)
  })
})

describe("rotate", () => {
  it("turns every kind clockwise and counter-clockwise without kicks", () => {
    const base = playing()
    for (const kind of ORDER) {
      for (const rotation of [0, 1, 2, 3] as const) {
        const game = withPiece(base, { kind, rotation, x: 3, y: 0 })
        const cw = rotate(game, "cw")
        const ccw = rotate(game, "ccw")
        const cwRotation = ((rotation + 1) % 4) as Rotation
        const ccwRotation = ((rotation + 3) % 4) as Rotation
        expect(cw.active).toEqual({ kind, rotation: cwRotation, x: 3, y: 0 })
        expect(pieceCells(cw.active)).toEqual(cellsAt(kind, cwRotation))
        expect(ccw.active).toEqual({ kind, rotation: ccwRotation, x: 3, y: 0 })
        expect(pieceCells(ccw.active)).toEqual(cellsAt(kind, ccwRotation))
      }
    }
  })

  it("matches the T and I rotation tables", () => {
    const tee = withPiece(playing(), { kind: "T", rotation: 0, x: 3, y: 0 })
    expect(pieceCells(rotate(tee, "cw").active)).toEqual([
      { x: 4, y: 0 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 4, y: 2 },
    ])
    expect(pieceCells(rotate(tee, "ccw").active)).toEqual([
      { x: 4, y: 0 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 4, y: 2 },
    ])

    const bar = withPiece(playing(), { kind: "I", rotation: 0, x: 3, y: 0 })
    expect(pieceCells(rotate(bar, "cw").active)).toEqual([
      { x: 5, y: 0 },
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    ])
  })

  it("changes the O rotation index and keeps the same cells", () => {
    const game = withPiece(playing(), { kind: "O", rotation: 0, x: 3, y: 0 })
    const turned = rotate(game, "cw")
    expect(turned.active.rotation).toBe(1)
    expect(pieceCells(turned.active)).toEqual(pieceCells(game.active))
  })

  it("returns the same game when the turn hits a wall or a stacked block", () => {
    const ready = createGame(0, 1)
    expect(rotate(ready, "cw")).toBe(ready)

    const againstWall = withPiece(playing(), { kind: "T", rotation: 1, x: -1, y: 5 })
    expect(
      pieceCells(againstWall.active).every(
        (cell) => cell.x >= 0 && cell.x < COLUMNS && cell.y >= 0 && cell.y < ROWS,
      ),
    ).toBe(true)
    expect(rotate(againstWall, "cw")).toBe(againstWall)

    const board = blankBoard()
    const stacked = board[7]
    if (stacked) stacked[4] = "J"
    const againstStack = withPiece(playing(), { kind: "T", rotation: 0, x: 3, y: 5 }, board)
    expect(rotate(againstStack, "cw")).toBe(againstStack)
  })
})

describe("tick", () => {
  it("drops one row without scoring when the space below is empty", () => {
    const ready = createGame(0, 1)
    const game = playing()
    expect(tick(ready)).toBe(ready)
    const next = tick(game)
    expect(next).not.toBe(game)
    expect(next.active).toEqual({ ...game.active, y: game.active.y + 1 })
    expect(next.score).toBe(game.score)
    expect(next.board).toBe(game.board)
    expect(next.lines).toBe(0)
    expect(next.level).toBe(game.level)
  })

  it("locks the piece onto the board when the cell below is blocked", () => {
    const board = blankBoard()
    const game = withPiece(playing(), { kind: "L", rotation: 0, x: 3, y: 18 }, board)
    const parked = { ...game, lastClear: { rows: [1], id: 2 } }
    const locked = tick(parked)
    expect(board[18]?.[5]).toBeNull()
    expect(locked.board[18]?.[5]).toBe("L")
    expect(locked.board[19]?.[3]).toBe("L")
    expect(locked.board[19]?.[4]).toBe("L")
    expect(locked.board[19]?.[5]).toBe("L")
    expect(locked.lastClear).toBeNull()
    expect(locked.score).toBe(0)
    expect(locked.lines).toBe(0)
    expect(locked.active).toEqual({ kind: parked.next, rotation: 0, x: 3, y: 0 })
    const drawn = drawPiece(parked.seed, parked.previousIndex)
    expect(locked.next).toBe(drawn.kind)
    expect(locked.previousIndex).toBe(drawn.index)
    expect(locked.seed).toBe(drawn.seed)
  })
})

describe("line clears", () => {
  it("scores a single at level 0 and lets the rows above fall", () => {
    const board = blankBoard()
    punchRow(board, 19, [3, 4, 5], "J")
    board[0][0] = "Z"
    const game = {
      ...withPiece(playing(), { kind: "T", rotation: 0, x: 3, y: 18 }, board),
      lastClear: { rows: [2], id: 3 },
    }
    const next = tick(game)
    expect(next.lines).toBe(1)
    expect(next.score).toBe(40)
    expect(next.level).toBe(0)
    expect(next.status).toBe("playing")
    expect(next.lastClear).toEqual({ rows: [19], id: 4 })
    expect(next.board[1]?.[0]).toBe("Z")
    expect(next.board[0]?.every((cell) => cell === null)).toBe(true)
    expect(next.board[19]?.[4]).toBe("T")
    expect(next.board[19]?.[0]).toBeNull()
    expect(next.board).toHaveLength(ROWS)
  })

  it("clears two non-adjacent rows as one double", () => {
    const board = blankBoard()
    punchRow(board, 5, [], "J")
    punchRow(board, 19, [3, 4, 5], "J")
    board[4][0] = "Z"
    board[18][1] = "S"
    const game = withPiece(playing(), { kind: "T", rotation: 0, x: 3, y: 18 }, board)
    const next = tick(game)
    expect(next.lines).toBe(2)
    expect(next.score).toBe(100)
    expect(next.level).toBe(0)
    expect(next.lastClear).toEqual({ rows: [5, 19], id: 1 })
    expect(next.board[6]?.[0]).toBe("Z")
    expect(next.board[19]?.[1]).toBe("S")
    expect(next.board[19]?.[4]).toBe("T")
    expect(next.board.some((row) => row.every((cell) => cell === "J"))).toBe(false)
  })

  it("scores a triple", () => {
    const board = blankBoard()
    punchRow(board, 17, [4], "J")
    punchRow(board, 18, [4, 5], "J")
    punchRow(board, 19, [4], "J")
    board[16][0] = "Z"
    const game = withPiece(playing(), { kind: "T", rotation: 1, x: 3, y: 17 }, board)
    const next = tick(game)
    expect(next.lines).toBe(3)
    expect(next.score).toBe(300)
    expect(next.level).toBe(0)
    expect(next.lastClear).toEqual({ rows: [17, 18, 19], id: 1 })
    expect(next.board[19]?.[0]).toBe("Z")
    expect(next.board.some((row) => row.includes("T"))).toBe(false)
  })

  it("scores a tetris at level 0 without leveling up", () => {
    const board = blankBoard()
    for (const y of [16, 17, 18, 19]) punchRow(board, y, [5], "J")
    board[15][1] = "Z"
    const game = withPiece(playing(), { kind: "I", rotation: 1, x: 3, y: 16 }, board)
    const next = tick(game)
    expect(next.lines).toBe(4)
    expect(next.score).toBe(1200)
    expect(next.level).toBe(0)
    expect(next.startLevel).toBe(0)
    expect(next.lastClear).toEqual({ rows: [16, 17, 18, 19], id: 1 })
    expect(next.board[19]?.[1]).toBe("Z")
    expect(next.board.some((row) => row.includes("I"))).toBe(false)
    expect(next.board[0]?.every((cell) => cell === null)).toBe(true)
  })

  it("scores a single and a tetris at level 9", () => {
    const singleBoard = blankBoard()
    punchRow(singleBoard, 19, [3, 4, 5], "J")
    const single = tick(
      withPiece(playing(9), { kind: "T", rotation: 0, x: 3, y: 18 }, singleBoard),
    )
    expect(single.lines).toBe(1)
    expect(single.score).toBe(400)
    expect(single.level).toBe(9)

    const tetrisBoard = blankBoard()
    for (const y of [16, 17, 18, 19]) punchRow(tetrisBoard, y, [5], "J")
    const tetris = tick(
      withPiece(playing(9), { kind: "I", rotation: 1, x: 3, y: 16 }, tetrisBoard),
    )
    expect(tetris.lines).toBe(4)
    expect(tetris.score).toBe(12000)
    expect(tetris.level).toBe(9)
  })
})

describe("level", () => {
  it("reports the NES line thresholds", () => {
    expect(levelThreshold(0, 0)).toBe(0)
    expect(levelThreshold(0, 1)).toBe(10)
    expect(levelThreshold(0, 2)).toBe(20)
    expect(levelThreshold(0, 3)).toBe(30)
    expect(levelThreshold(5, 5)).toBe(0)
    expect(levelThreshold(5, 6)).toBe(60)
    expect(levelThreshold(5, 7)).toBe(70)
    expect(levelThreshold(9, 10)).toBe(100)
    expect(levelThreshold(19, 19)).toBe(0)
    expect(levelThreshold(19, 20)).toBe(140)
    expect(levelThreshold(19, 21)).toBe(150)
  })

  it("levels up from the line total after the clear and scores the old level", () => {
    const board = blankBoard()
    punchRow(board, 19, [3, 4, 5], "J")
    const game = {
      ...withPiece(playing(), { kind: "T", rotation: 0, x: 3, y: 18 }, board),
      lines: 9,
      level: 0,
      startLevel: 0,
    }
    const next = tick(game)
    expect(next.lines).toBe(10)
    expect(next.level).toBe(1)
    expect(next.score).toBe(40)
  })

  it("can cross more than one threshold on a single clear", () => {
    const board = blankBoard()
    for (const y of [16, 17, 18, 19]) punchRow(board, y, [5], "J")
    const game = {
      ...withPiece(playing(), { kind: "I", rotation: 1, x: 3, y: 16 }, board),
      lines: 16,
      level: 0,
      startLevel: 0,
    }
    const next = tick(game)
    expect(next.lines).toBe(20)
    expect(next.level).toBe(2)
    expect(next.score).toBe(1200)
  })
})

describe("softDrop", () => {
  it("adds one point per row and does not lock on the floor", () => {
    const game = playing()
    const dropped = softDrop(game)
    expect(dropped.active.y).toBe(game.active.y + 1)
    expect(dropped.score).toBe(game.score + 1)
    expect(dropped.level).toBe(game.level)
    expect(dropped.lines).toBe(game.lines)
    expect(dropped.board).toBe(game.board)

    const ready = createGame(0, 1)
    expect(softDrop(ready)).toBe(ready)

    const board = blankBoard()
    const grounded = withPiece(playing(), { kind: "T", rotation: 0, x: 3, y: 18 }, board)
    expect(softDrop(grounded)).toBe(grounded)
    expect(board.every((row) => row.every((cell) => cell === null))).toBe(true)
    const locked = tick(grounded)
    expect(locked.board[18]?.[4]).toBe("T")
    expect(locked.board[19]?.[3]).toBe("T")
    expect(locked.board[19]?.[4]).toBe("T")
    expect(locked.board[19]?.[5]).toBe("T")
  })
})

describe("top out", () => {
  it("ends the game when the next piece spawns into filled cells", () => {
    const base = playing()
    const board = blankBoard()
    for (const cell of pieceCells({ kind: base.next, rotation: 0, x: 3, y: 0 })) {
      const row = board[cell.y]
      if (row) row[cell.x] = "J"
    }
    const game = withPiece(base, { kind: "O", rotation: 0, x: 3, y: 18 }, board)
    const ended = tick(game)
    expect(ended.status).toBe("over")
    expect(ended.active).toEqual({ kind: base.next, rotation: 0, x: 3, y: 0 })
    expect(tick(ended)).toBe(ended)
    expect(ended.board[18]?.[4]).toBe("O")
    expect(ended.board[19]?.[5]).toBe("O")
  })
})

describe("pause and start", () => {
  it("toggles playing and paused and ignores the other statuses", () => {
    const ready = createGame(0, 3)
    expect(pause(ready)).toBe(ready)
    const playingGame = start(ready)
    expect(playingGame).not.toBe(ready)
    expect(playingGame.status).toBe("playing")
    expect(start(playingGame)).toBe(playingGame)

    const paused = pause(playingGame)
    expect(paused.status).toBe("paused")
    expect(pause(paused)).toBe(paused)
    expect(start(paused).status).toBe("playing")

    const over = { ...playingGame, status: "over" as const }
    expect(start(over)).toBe(over)
    expect(pause(over)).toBe(over)
  })
})

describe("gravityMs", () => {
  it("converts NES frames at 60fps", () => {
    expect(gravityMs(0)).toBe(800)
    expect(gravityMs(1)).toBe(717)
    expect(gravityMs(9)).toBe(100)
    expect(gravityMs(18)).toBe(50)
    expect(gravityMs(19)).toBe(33)
    expect(gravityMs(29)).toBe(17)
    expect(gravityMs(100)).toBe(17)
  })
})
