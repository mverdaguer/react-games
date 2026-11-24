import { beforeEach, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import Arkanoid from "@/games/arkanoid"

beforeEach(() => {
  localStorage.clear()
})

test("renders ready", async () => {
  const screen = await render(<Arkanoid />)
  await expect
    .element(
      screen.getByRole("img", {
        name: /Arkanoid board, score 0, round 1, lives 3, balls 1, stuck yes/,
      }),
    )
    .toBeVisible()
  await expect
    .element(screen.getByText("Arrows or A and D move, Space launches the ball. Press Enter or Start."))
    .toBeVisible()
  await expect.element(screen.getByText("Best —")).toBeVisible()
})

test("start and pause", async () => {
  const screen = await render(<Arkanoid />)

  await userEvent.keyboard("{Enter}")
  await expect.element(screen.getByText("Press Esc or Enter to pause.")).toBeVisible()

  await userEvent.keyboard("{Escape}")
  await expect.element(screen.getByText("Paused. Press Esc or Enter to resume.")).toBeVisible()

  await userEvent.keyboard("{Enter}")
  await expect.element(screen.getByText("Press Esc or Enter to pause.")).toBeVisible()
})

test("launch", async () => {
  const screen = await render(<Arkanoid />)

  await userEvent.keyboard("{Enter}")
  await expect.element(screen.getByText("Press Esc or Enter to pause.")).toBeVisible()

  await userEvent.keyboard(" ")
  await expect.element(screen.getByRole("img", { name: /stuck no/ })).toBeVisible()
})

test("sound", async () => {
  const screen = await render(<Arkanoid />)
  const sound = screen.getByRole("button", { name: "Sound" })

  await sound.click()
  expect(JSON.parse(localStorage.getItem("arkanoid:settings:v1") ?? "null")).toEqual({ sound: true })
  await expect.element(sound).toHaveAttribute("aria-pressed", "true")

  await sound.click()
  expect(JSON.parse(localStorage.getItem("arkanoid:settings:v1") ?? "null")).toEqual({ sound: false })
  await expect.element(sound).toHaveAttribute("aria-pressed", "false")
})
