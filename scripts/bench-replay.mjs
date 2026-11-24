import { registerHooks } from "node:module"
import { pathToFileURL } from "node:url"

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      specifier = pathToFileURL(`${process.cwd()}/src/${specifier.slice(2)}.ts`).href
    }
    return next(specifier, context)
  },
})

const { GAME_RULES } = await import("../src/games/shared/leaderboard.ts")
const snake = await import("../src/games/snake/replay.ts")
const tetrisReplay = await import("../src/games/tetris/replay.ts")
const tetris = await import("../src/games/tetris/logic.ts")
const pang = await import("../src/games/pang/replay.ts")
const arkanoid = await import("../src/games/arkanoid/replay.ts")

const SAMPLES = 5
const LIMIT_MS = 8

function measure(label, budget, checkpoint, advance, log) {
  advance(checkpoint, log, budget)
  const samples = []
  for (let index = 0; index < SAMPLES; index += 1) {
    const started = performance.now()
    const outcome = advance(checkpoint, log, budget)
    samples.push(performance.now() - started)
    const advanced = outcome.status === "running" ? outcome.checkpoint.tick - checkpoint.tick : 0
    if (advanced !== budget) {
      console.error(`${label} advanced ${advanced} of ${budget} ticks`)
      process.exitCode = 1
    }
  }
  const worst = Math.max(...samples)
  console.log(`${label} ${samples.map((ms) => ms.toFixed(2)).join(" ")} ms`)
  if (worst > LIMIT_MS) {
    console.error(`${label} took ${worst.toFixed(2)} ms. Lower that game's chunk size.`)
    process.exitCode = 1
  }
}

function resumed(begin, advance, log, budget) {
  const outcome = advance(begin, log, budget)
  if (outcome.status !== "running" || outcome.checkpoint.tick !== begin.tick + budget) {
    throw new Error(`setup advanced to ${outcome.status === "running" ? outcome.checkpoint.tick : outcome.status}`)
  }
  return outcome.checkpoint
}

// Hold left. A fresh chunk and a later resumed chunk both finish before the run ends.
const pangLog = [[0, 1]]
const pangFresh = pang.begin(0, 1)
const pangLater = resumed(pang.begin(0, 1), pang.advance, pangLog, 2_000)

// An empty log leaves the ball stuck, so the run stays playing for a full chunk.
const arkanoidLog = []
const arkanoidFresh = arkanoid.begin(0, 1)
const arkanoidLater = resumed(arkanoid.begin(0, 1), arkanoid.advance, arkanoidLog, 2_000)

// One turn on the first tick, then a second chunk from the checkpoint that leaves.
const snakeLog = [[0, 0]]
const snakeFresh = snake.begin(9, 1)
const snakeLater = resumed(snake.begin(9, 1), snake.advance, snakeLog, GAME_RULES.snake.chunk)

const tetrisLog = tetrisSurvivalLog(1, GAME_RULES.tetris.chunk * 2)
const tetrisFresh = tetrisReplay.begin(0, 1)
const tetrisLater = resumed(tetrisReplay.begin(0, 1), tetrisReplay.advance, tetrisLog, GAME_RULES.tetris.chunk)

measure("snake fresh", GAME_RULES.snake.chunk, snakeFresh, snake.advance, snakeLog)
measure("snake resumed", GAME_RULES.snake.chunk, snakeLater, snake.advance, snakeLog)
measure("tetris fresh", GAME_RULES.tetris.chunk, tetrisFresh, tetrisReplay.advance, tetrisLog)
measure("tetris resumed", GAME_RULES.tetris.chunk, tetrisLater, tetrisReplay.advance, tetrisLog)
measure("pang fresh", GAME_RULES.pang.chunk, pangFresh, pang.advance, pangLog)
measure("pang resumed", GAME_RULES.pang.chunk, pangLater, pang.advance, pangLog)
measure("arkanoid fresh", GAME_RULES.arkanoid.chunk, arkanoidFresh, arkanoid.advance, arkanoidLog)
measure("arkanoid resumed", GAME_RULES.arkanoid.chunk, arkanoidLater, arkanoid.advance, arkanoidLog)

function tetrisSurvivalLog(seed, ticks) {
  const weights = { aggregate: 1, holes: 30, bump: 1, max: 3, wells: 4, lines: -35 }
  let game = tetris.start(tetris.createGame(0, seed))
  let tick = 0
  let planned = false
  const log = []
  while (game.status === "playing" && tick < ticks) {
    if (!planned) {
      for (const code of bestPlacement(game, weights)) {
        const next = tetris.apply(game, ["left", "right", "down", "cw"][code])
        if (next === game) break
        log.push([tick, code])
        game = next
      }
      planned = true
    }
    const next = tetris.tick(game)
    if (next.board !== game.board) planned = false
    game = next
    tick += 1
  }
  if (game.status !== "playing" || tick < ticks) {
    throw new Error(`tetris log ended at ${tick} with ${game.status}`)
  }
  return log
}

function bestPlacement(game, weights) {
  let bestScore = Infinity
  let bestActions = []
  for (let rotation = 0; rotation < 4; rotation += 1) {
    for (let target = -2; target < tetris.COLUMNS; target += 1) {
      const moved = movesTo(game, rotation, target)
      if (!moved) continue
      const after = landed(moved.sim)
      if (after.status !== "playing") continue
      const score = placementCost(after.board, after.lines - game.lines, weights)
      if (score < bestScore) {
        bestScore = score
        bestActions = moved.actions
      }
    }
  }
  return bestActions
}

function movesTo(game, rotation, target) {
  let sim = game
  const actions = []
  for (let turn = 0; turn < rotation; turn += 1) {
    const next = tetris.apply(sim, "cw")
    if (next === sim) return null
    sim = next
    actions.push(3)
  }
  let guard = 0
  while (sim.active.x !== target && guard < 12) {
    const dir = target < sim.active.x ? "left" : "right"
    const next = tetris.apply(sim, dir)
    if (next === sim) return null
    sim = next
    actions.push(dir === "left" ? 0 : 1)
    guard += 1
  }
  return sim.active.x === target ? { sim, actions } : null
}

function landed(game) {
  let current = game
  let falls = 0
  while (current.status === "playing" && falls < 40) {
    const next = tetris.tick(current)
    falls += 1
    if (next.board !== current.board || next.status !== "playing") return next
    current = next
  }
  return current
}

function placementCost(board, linesGained, weights) {
  let holes = 0
  let aggregate = 0
  let bump = 0
  let maxHeight = 0
  let wells = 0
  const heights = []
  for (let x = 0; x < tetris.COLUMNS; x += 1) {
    let height = 0
    let seen = false
    for (let y = 0; y < tetris.ROWS; y += 1) {
      if (board[y][x]) {
        if (!seen) height = tetris.ROWS - y
        seen = true
      } else if (seen) holes += 1
    }
    heights.push(height)
    aggregate += height
    if (height > maxHeight) maxHeight = height
  }
  for (let index = 0; index < heights.length; index += 1) {
    const left = index === 0 ? 99 : heights[index - 1]
    const right = index === heights.length - 1 ? 99 : heights[index + 1]
    const well = Math.min(left, right) - heights[index]
    if (well > 2) wells += well
    if (index < heights.length - 1) bump += Math.abs(heights[index] - heights[index + 1])
  }
  return (
    aggregate * weights.aggregate +
    holes * weights.holes +
    bump * weights.bump +
    maxHeight * weights.max +
    wells * weights.wells +
    linesGained * weights.lines
  )
}
