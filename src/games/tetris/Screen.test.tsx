import { expect, test } from "vitest"
import { render } from "vitest-browser-react"

import { createGame, start, type Game } from "@/games/tetris/logic"
import { Screen } from "@/games/tetris/Screen"

test("a cleared line does not stay painted over the rows that fell into its place", async () => {
  const game = start(createGame(0, 1))
  const board = game.board.map((row) => row.slice())
  board[19] = board[19].map(() => "T")
  const settled: Game = {
    ...game,
    board,
    lastClear: { rows: [19], id: 1 },
  }

  const screen = await render(<Screen game={settled} preview />)
  const svg = screen.getByRole("img", { name: /Tetris board/ }).element()
  const covering = [...svg.querySelectorAll("rect")].filter((rect) => {
    return (
      rect.classList.contains("animate-lcd-blink") &&
      rect.getAttribute("width") === "70" &&
      rect.getAttribute("y") === "135"
    )
  })

  expect(covering).toHaveLength(0)
  const painted = [...svg.querySelectorAll("rect")].filter(
    (rect) => rect.getAttribute("y") === "135" && rect.classList.contains("fill-tetris-t"),
  )
  expect(painted.length).toBeGreaterThan(0)
})
