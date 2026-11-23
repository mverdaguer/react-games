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
const tetris = await import("../src/games/tetris/replay.ts")
const pang = await import("../src/games/pang/replay.ts")

function time(label, run) {
  run()
  const started = performance.now()
  const repeats = 5
  for (let index = 0; index < repeats; index += 1) run()
  const ms = (performance.now() - started) / repeats
  console.log(`${label} ${ms.toFixed(2)} ms`)
  return ms
}

const snakeMs = time("snake", () => snake.advance(snake.begin(9, 1), [], GAME_RULES.snake.chunk))
const tetrisMs = time("tetris", () => tetris.advance(tetris.begin(0, 1), [], GAME_RULES.tetris.chunk))
const pangMs = time("pang", () => pang.advance(pang.begin(0, 1), [], GAME_RULES.pang.chunk))

if (snakeMs > 8 || tetrisMs > 8 || pangMs > 8) {
  console.error("A chunk is over 8 ms. Lower that game's chunk size.")
  process.exitCode = 1
}
