import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import Minesweeper from "@/games/minesweeper"
import { createGame, reveal, type Game } from "@/games/minesweeper/logic"

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function cellName(index: number, columns: number) {
  const row = Math.floor(index / columns) + 1
  const column = (index % columns) + 1
  return `Hidden, row ${row} column ${column}`
}

async function clickHidden(
  screen: Awaited<ReturnType<typeof render>>,
  index: number,
  columns: number,
) {
  await screen.getByRole("button", { name: cellName(index, columns) }).click()
}

test("level buttons change the board size and which one is pressed", async () => {
  const screen = await render(<Minesweeper />)
  const cells = () => screen.getByRole("button", { name: /row \d+ column \d+/ }).elements().length

  await expect.poll(cells).toBe(81)
  await expect.element(screen.getByRole("button", { name: "Beginner" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  await screen.getByRole("button", { name: "Intermediate" }).click()
  await expect.poll(cells).toBe(256)
  await expect.element(screen.getByRole("button", { name: "Intermediate" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect.element(screen.getByRole("button", { name: "Beginner" })).toHaveAttribute(
    "aria-pressed",
    "false",
  )

  await screen.getByRole("button", { name: "Expert" }).click()
  await expect.poll(cells).toBe(480)
  await expect.element(screen.getByRole("button", { name: "Expert" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect.element(screen.getByRole("button", { name: "Intermediate" })).toHaveAttribute(
    "aria-pressed",
    "false",
  )
})

test("right click and the f key flag a cell", async () => {
  const screen = await render(<Minesweeper />)
  await screen.getByRole("button", { name: "Hidden, row 1 column 1" }).click({ button: "right" })
  await expect.element(screen.getByRole("button", { name: "Flagged, row 1 column 1" })).toBeVisible()
  await expect.element(screen.getByLabelText("Mines: 9")).toBeVisible()

  const second = screen.getByRole("button", { name: "Hidden, row 1 column 2" })
  await expect.element(second).toBeVisible()
  second.element().focus()
  await userEvent.keyboard("f")
  await expect.element(screen.getByRole("button", { name: "Flagged, row 1 column 2" })).toBeVisible()
})

test("opening a mine shows the lost status", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0)
  const predicted = reveal(createGame("beginner"), 0)
  const mineIndex = predicted.cells.findIndex((cell) => cell.mine && !cell.revealed)
  expect(mineIndex).toBeGreaterThanOrEqual(0)

  const screen = await render(<Minesweeper />)
  await clickHidden(screen, 0, predicted.columns)
  await clickHidden(screen, mineIndex, predicted.columns)
  await expect.element(screen.getByText("Boom! Try again")).toBeVisible()
})

test("clearing the safe cells records a best time", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0)
  const screen = await render(<Minesweeper />)
  let game: Game = createGame("beginner")
  const columns = game.columns

  await clickHidden(screen, 0, columns)
  game = reveal(game, 0)

  while (game.status === "playing") {
    const index = game.cells.findIndex(
      (cell) => !cell.revealed && !cell.mine && cell.mark !== "flag",
    )
    expect(index).toBeGreaterThanOrEqual(0)
    await clickHidden(screen, index, columns)
    game = reveal(game, index)
  }

  expect(game.status).toBe("won")
  const status = screen.getByText(/Cleared in \d+s · New best!/)
  await expect.element(status).toBeVisible()
  const seconds = status.element().textContent?.match(/Cleared in (\d+)s/)?.[1]
  await expect.element(screen.getByText(`Best ${seconds}s`)).toBeVisible()
  const stored = localStorage.getItem("minesweeper:best-times:v1")
  expect(stored).toBeTruthy()
  expect(JSON.parse(stored ?? "{}")).toMatchObject({ beginner: Number(seconds) })
}, 20_000)
