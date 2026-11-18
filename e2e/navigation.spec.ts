import { expect, test } from "@playwright/test"

test("home lists the games and opens Tic-Tac-Toe", async ({ page }) => {
  await page.goto("/")
  const main = page.getByRole("main")
  await expect(main.getByRole("link", { name: "Tic-Tac-Toe" })).toBeVisible()
  await expect(main.getByRole("link", { name: "Memory Match" })).toBeVisible()
  await expect(main.getByRole("link", { name: "Minesweeper" })).toBeVisible()
  await expect(main.getByRole("link", { name: "Snake" })).toBeVisible()

  await main.getByRole("link", { name: "Tic-Tac-Toe" }).click()
  await expect(page).toHaveURL(/\/games\/tic-tac-toe$/)
  await expect(main.getByRole("heading", { level: 1, name: "Tic-Tac-Toe" })).toBeVisible()
})

test("the sidebar moves between games and back returns to the previous one", async ({ page }) => {
  await page.goto("/")
  const sidebar = page.locator('[data-sidebar="sidebar"]')

  await sidebar.getByRole("link", { name: "Tic-Tac-Toe" }).click()
  await expect(page).toHaveURL(/\/games\/tic-tac-toe$/)

  await sidebar.getByRole("link", { name: "Memory Match" }).click()
  await expect(page).toHaveURL(/\/games\/memory$/)

  await page.goBack()
  await expect(page).toHaveURL(/\/games\/tic-tac-toe$/)
})

test("the sidebar closes after choosing a game on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")

  await page.getByRole("button", { name: "Toggle Sidebar" }).click()
  const sidebar = page.locator('[data-sidebar="sidebar"]')
  await expect(sidebar).toBeVisible()

  await sidebar.getByRole("link", { name: "Snake" }).click()
  await expect(page).toHaveURL(/\/games\/snake$/)
  await expect(sidebar).toBeHidden()
})

test("minesweeper loads from its own address", async ({ page }) => {
  await page.goto("/games/minesweeper")
  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 1, name: "Minesweeper" })).toBeVisible()
  await expect(main.getByRole("button", { name: "Beginner" })).toBeVisible()
})

test("snake loads from its own address", async ({ page }) => {
  await page.goto("/games/snake")
  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 1, name: "Snake" })).toBeVisible()
  await expect(main.getByRole("img", { name: /Snake board/ })).toBeVisible()
})

test("an unknown game links back to the shelf", async ({ page }) => {
  await page.goto("/games/nope")
  await expect(
    page.getByRole("heading", { name: "That game is not on the shelf." }),
  ).toBeVisible()
  await page.getByRole("link", { name: "Back to the shelf" }).click()
  await expect(page).toHaveURL(/\/$/)
})
