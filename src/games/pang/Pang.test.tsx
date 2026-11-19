import { beforeEach, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import Pang from "@/games/pang"

beforeEach(() => {
  localStorage.clear()
})

function label(screen: Awaited<ReturnType<typeof render>>) {
  return screen.getByRole("img", { name: /Pang board/ }).element().getAttribute("aria-label") ?? ""
}

function playerX(screen: Awaited<ReturnType<typeof render>>) {
  return Number(label(screen).match(/player (\d+)/)?.[1])
}

test("starts ready on stage 1", async () => {
  const screen = await render(<Pang />)
  await expect
    .element(screen.getByRole("img", { name: /Pang board, score 0, level 1, lives 3, balls 1, status ready/ }))
    .toBeVisible()
  await expect
    .element(screen.getByText("Arrows or A and D move, Space fires. Press Enter or Start."))
    .toBeVisible()
  await expect.element(screen.getByText("Best —")).toBeVisible()
})

test("start begins play, arrows move, and pause holds", async () => {
  const screen = await render(<Pang />)

  await screen.getByRole("button", { name: "Start" }).click()
  await expect.element(screen.getByText("Press Esc or Enter to pause.")).toBeVisible()
  await expect.poll(() => label(screen)).toMatch(/status playing/)

  const origin = playerX(screen)
  await userEvent.keyboard("{ArrowRight}")
  await expect.poll(() => playerX(screen)).toBeGreaterThan(origin)

  await userEvent.keyboard("{Enter}")
  await expect.element(screen.getByText("Paused. Press Esc or Enter to resume.")).toBeVisible()

  window.dispatchEvent(new Event("blur"))
  await userEvent.keyboard("{Enter}")
  await expect.element(screen.getByText("Press Esc or Enter to pause.")).toBeVisible()
  window.dispatchEvent(new Event("blur"))
  await expect.element(screen.getByText("Paused. Press Esc or Enter to resume.")).toBeVisible()
})

test("space still fires after a button click", async () => {
  const screen = await render(<Pang />)
  const sound = screen.getByRole("button", { name: "Sound" })

  await sound.click()
  await expect.element(sound).toHaveAttribute("aria-pressed", "true")
  await userEvent.keyboard("{Enter}")
  await expect.poll(() => label(screen)).toMatch(/status playing/)
  await userEvent.keyboard(" ")
  await expect.element(sound).toHaveAttribute("aria-pressed", "true")
  await expect.poll(() => label(screen)).toMatch(/status playing/)
})

test("escape pauses and resumes", async () => {
  const screen = await render(<Pang />)

  await screen.getByRole("button", { name: "Start" }).click()
  await expect.element(screen.getByText("Press Esc or Enter to pause.")).toBeVisible()

  await userEvent.keyboard("{Escape}")
  await expect.element(screen.getByText("Paused. Press Esc or Enter to resume.")).toBeVisible()

  await userEvent.keyboard("{Escape}")
  await expect.element(screen.getByText("Press Esc or Enter to pause.")).toBeVisible()
})

test("the sound toggle is saved", async () => {
  const screen = await render(<Pang />)
  const sound = screen.getByRole("button", { name: "Sound" })

  await expect.element(sound).toHaveAttribute("aria-pressed", "false")
  await sound.click()
  await expect.element(sound).toHaveAttribute("aria-pressed", "true")
  expect(JSON.parse(localStorage.getItem("pang:settings:v1") ?? "{}")).toMatchObject({ sound: true })
})
