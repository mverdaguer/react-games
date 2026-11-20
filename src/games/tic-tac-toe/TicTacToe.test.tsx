import { afterEach, expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"

import TicTacToe from "@/games/tic-tac-toe"

afterEach(() => {
  vi.restoreAllMocks()
})

async function play(cells: number[]) {
  const screen = await render(<TicTacToe />)
  await screen.getByRole("button", { name: "Two players" }).click()
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

test("Hard plays out a full game and never loses", async () => {
  const screen = await render(<TicTacToe />)
  await screen.getByRole("button", { name: "Hard" }).click()
  const board = screen.getByRole("group", { name: "Board" })

  for (let move = 0; move < 5; move += 1) {
    const status = screen.getByText(/Your move|Computer wins this round|This round is a draw/)
    await expect.element(status).toBeVisible()
    if (status.element().textContent !== "Your move") break
    await board.getByRole("button", { name: /^Empty cell / }).first().click()
  }

  await expect
    .element(screen.getByText(/Computer wins this round|This round is a draw/))
    .toBeVisible()
})

test("New round during the computer's wait leaves a fresh board", async () => {
  const screen = await render(<TicTacToe />)
  const board = screen.getByRole("group", { name: "Board" })

  await board.getByRole("button", { name: "Empty cell 1" }).click()
  await expect.element(screen.getByText("Computer to move")).toBeVisible()
  await screen.getByRole("button", { name: "New round" }).click()
  await new Promise((resolve) => setTimeout(resolve, 600))

  for (let cell = 1; cell <= 9; cell += 1) {
    await expect
      .element(board.getByRole("button", { name: `Empty cell ${cell}` }))
      .toBeEnabled()
  }
  await expect.element(screen.getByText("Your move")).toBeVisible()
  await expect.element(screen.getByText("You 0 · Computer 0")).toBeVisible()
})
