import { beforeEach, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import Tetris from "@/games/tetris"

beforeEach(() => {
  localStorage.clear()
})

function boardLabel(screen: Awaited<ReturnType<typeof render>>) {
  return screen.getByRole("img", { name: /Tetris board/ }).element().getAttribute("aria-label") ?? ""
}

test("starts ready at level 0", async () => {
  const screen = await render(<Tetris />)
  await expect
    .element(
      screen.getByRole("img", {
        name: /Tetris board, score 0, level 0, lines 0, next [A-Z], piece [A-Z] at 3,0 rotation 0/,
      }),
    )
    .toBeVisible()
  await expect
    .element(
      screen.getByText("Arrows move, Up rotates, Down soft drops. Press Space or Start."),
    )
    .toBeVisible()
  await expect.element(screen.getByText("Level 0")).toBeVisible()
})

test("the level stepper saves the chosen level and stops at the ends", async () => {
  const screen = await render(<Tetris />)

  await screen.getByRole("button", { name: "Higher" }).click()
  await expect.element(screen.getByText("Level 1")).toBeVisible()
  expect(JSON.parse(localStorage.getItem("tetris:settings:v1") ?? "{}")).toMatchObject({ startLevel: 1 })

  const lower = screen.getByRole("button", { name: "Lower" })
  for (let step = 0; step < 9; step += 1) {
    if (lower.element().hasAttribute("disabled")) break
    await lower.click()
  }
  await expect.element(screen.getByText("Level 0")).toBeVisible()
  await expect.element(lower).toBeDisabled()

  const higher = screen.getByRole("button", { name: "Higher" })
  for (let step = 0; step < 9; step += 1) {
    if (higher.element().hasAttribute("disabled")) break
    await higher.click()
  }
  await expect.element(screen.getByText("Level 9")).toBeVisible()
  await expect.element(higher).toBeDisabled()
})

test("space starts and pauses, and leaving the window pauses", async () => {
  const screen = await render(<Tetris />)

  await userEvent.keyboard(" ")
  await expect
    .element(screen.getByText("Press Space or Start to pause. Select hides the next piece."))
    .toBeVisible()

  await userEvent.keyboard(" ")
  await expect.element(screen.getByText("Paused. Press Space or Start to resume.")).toBeVisible()

  await userEvent.keyboard(" ")
  await expect
    .element(screen.getByText("Press Space or Start to pause. Select hides the next piece."))
    .toBeVisible()

  window.dispatchEvent(new Event("blur"))
  await expect.element(screen.getByText("Paused. Press Space or Start to resume.")).toBeVisible()
})

test("the d-pad moves the piece and rotate changes its rotation", async () => {
  const screen = await render(<Tetris />)

  await screen.getByRole("button", { name: "Start, START" }).click()
  await expect
    .element(screen.getByText("Press Space or Start to pause. Select hides the next piece."))
    .toBeVisible()

  const started = /at (\d+),(\d+) rotation (\d)/.exec(boardLabel(screen))
  const x = Number(started?.[1])

  await screen.getByRole("button", { name: "Left" }).click()
  await expect.poll(() => {
    const match = /at (\d+),/.exec(boardLabel(screen))
    return match ? Number(match[1]) : null
  }).toBe(x - 1)

  await screen.getByRole("button", { name: "Rotate clockwise, A" }).click()
  await expect.poll(() => boardLabel(screen)).toMatch(/rotation 1/)

  await screen.getByRole("button", { name: "Right" }).click()
  await expect.poll(() => boardLabel(screen)).toMatch(/at 3,/)
})

test("select hides the next piece", async () => {
  const screen = await render(<Tetris />)
  const preview = screen.getByRole("button", { name: "Preview, SELECT" })

  await preview.click()
  await expect.element(preview).toHaveAttribute("aria-pressed", "false")
  await expect.element(screen.getByRole("img", { name: /next hidden/ })).toBeVisible()
  expect(JSON.parse(localStorage.getItem("tetris:settings:v1") ?? "{}")).toMatchObject({ preview: false })

  await preview.click()
  await expect.element(preview).toHaveAttribute("aria-pressed", "true")
  await expect.element(screen.getByRole("img", { name: /next [A-Z]/ })).toBeVisible()
  expect(JSON.parse(localStorage.getItem("tetris:settings:v1") ?? "{}")).toMatchObject({ preview: true })
})

test("topping out records a best score", async () => {
  localStorage.setItem("tetris:gravity-ms", "20")
  localStorage.setItem(
    "tetris:settings:v1",
    JSON.stringify({ startLevel: 0, sound: false, preview: true }),
  )
  const screen = await render(<Tetris />)

  await screen.getByRole("button", { name: "Start, START" }).click()
  await expect
    .poll(() => screen.getByText(/Game over/).element().textContent ?? "", { timeout: 30_000 })
    .toMatch(/Game over · \d+ points · New best!/)

  const stored = JSON.parse(localStorage.getItem("tetris:best-scores:v1") ?? "{}") as Record<string, unknown>
  expect(typeof stored["0"]).toBe("number")
}, 30_000)

test("the sound toggle is saved", async () => {
  const screen = await render(<Tetris />)
  const sound = screen.getByRole("button", { name: "Sound" })

  await expect.element(sound).toHaveAttribute("aria-pressed", "false")
  await sound.click()
  await expect.element(sound).toHaveAttribute("aria-pressed", "true")
  expect(JSON.parse(localStorage.getItem("tetris:settings:v1") ?? "{}")).toMatchObject({ sound: true })
})
