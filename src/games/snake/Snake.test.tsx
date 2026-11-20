import { beforeEach, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import Snake from "@/games/snake"

beforeEach(() => {
  localStorage.clear()
})

test("starts ready at level 4 with a right-heading snake", async () => {
  const screen = await render(<Snake />)
  await expect.element(screen.getByRole("img", { name: /Snake board, score 0, heading right/ })).toBeVisible()
  await expect.element(screen.getByText("Level 4")).toBeVisible()
  await expect
    .element(
      screen.getByText("Steer with the arrow keys, swipes or the keypad. Press Space or 5 to start."),
    )
    .toBeVisible()
})

test("the level stepper saves the chosen level and stops at the ends", async () => {
  const screen = await render(<Snake />)

  await screen.getByRole("button", { name: "Faster" }).click()
  await expect.element(screen.getByText("Level 5")).toBeVisible()
  expect(JSON.parse(localStorage.getItem("snake:settings:v1") ?? "{}")).toMatchObject({ level: 5 })

  await screen.getByRole("button", { name: "Slower" }).click()
  await screen.getByRole("button", { name: "Slower" }).click()
  await screen.getByRole("button", { name: "Slower" }).click()
  await screen.getByRole("button", { name: "Slower" }).click()
  await expect.element(screen.getByText("Level 1")).toBeVisible()
  await expect.element(screen.getByRole("button", { name: "Slower" })).toBeDisabled()
})

test("space starts and pauses, and leaving the window pauses", async () => {
  const screen = await render(<Snake />)

  await userEvent.keyboard(" ")
  await expect.element(screen.getByText("Walls wrap around. Press Space or 5 to pause.")).toBeVisible()

  await userEvent.keyboard(" ")
  await expect.element(screen.getByText("Paused. Press Space or 5 to resume.")).toBeVisible()

  await userEvent.keyboard(" ")
  await expect.element(screen.getByText("Walls wrap around. Press Space or 5 to pause.")).toBeVisible()

  window.dispatchEvent(new Event("blur"))
  await expect.element(screen.getByText("Paused. Press Space or 5 to resume.")).toBeVisible()
})

test("the keypad starts the game and turns the snake", async () => {
  const screen = await render(<Snake />)

  await screen.getByRole("button", { name: "Start, 5" }).click()
  await expect.element(screen.getByText("Walls wrap around. Press Space or 5 to pause.")).toBeVisible()

  await screen.getByRole("button", { name: "Up, 2" }).click()
  await expect.poll(() => screen.getByRole("img").element().getAttribute("aria-label")).toMatch(/heading up/)
})

test("crashing into the snake records a best score", async () => {
  localStorage.setItem("snake:settings:v1", JSON.stringify({ level: 1, sound: false }))
  const screen = await render(<Snake />)

  await userEvent.keyboard("{ArrowUp}")
  await expect.poll(() => screen.getByRole("img").element().getAttribute("aria-label")).toMatch(/heading up/)

  await userEvent.keyboard("{ArrowLeft}")
  await expect.poll(() => screen.getByRole("img").element().getAttribute("aria-label")).toMatch(/heading left/)

  await userEvent.keyboard("{ArrowDown}")
  await expect.element(screen.getByText(/Game over · \d+ points · New best!/)).toBeVisible()

  const stored = localStorage.getItem("snake:best-scores:v1")
  expect(stored).toBeTruthy()
  expect(JSON.parse(stored ?? "{}")).toHaveProperty("1")
}, 10_000)

test("the sound toggle is saved", async () => {
  const screen = await render(<Snake />)
  const sound = screen.getByRole("button", { name: "Sound" })

  await expect.element(sound).toHaveAttribute("aria-pressed", "false")
  await sound.click()
  await expect.element(sound).toHaveAttribute("aria-pressed", "true")
  expect(JSON.parse(localStorage.getItem("snake:settings:v1") ?? "{}")).toMatchObject({ sound: true })
})
