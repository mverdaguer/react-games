import { afterEach, expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"

import TicTacToe from "@/games/tic-tac-toe"

afterEach(() => {
  vi.restoreAllMocks()
})

async function play(cells: number[]) {
  const screen = await render(<TicTacToe />)
  const board = screen.getByRole("group", { name: "Board" })
  for (const cell of cells) {
    await board.getByRole("button", { name: `Empty cell ${cell}` }).click()
  }
  return screen
}

test("X wins and a new round starts with X to move", async () => {
  const screen = await play([1, 4, 2, 5, 3])
  const board = screen.getByRole("group", { name: "Board" })

  await expect.element(screen.getByText("X wins this round")).toBeVisible()
  await expect.element(screen.getByText("X 1 · O 0")).toBeVisible()
  for (const cell of [6, 7, 8, 9]) {
    await expect.element(board.getByRole("button", { name: `Empty cell ${cell}` })).toBeDisabled()
  }

  await screen.getByRole("button", { name: "Play again" }).click()
  await expect.element(screen.getByText("X to move")).toBeVisible()
})

test("a full board with no line is a draw", async () => {
  const screen = await play([1, 2, 3, 5, 4, 6, 8, 7, 9])
  await expect.element(screen.getByText("This round is a draw")).toBeVisible()
})
