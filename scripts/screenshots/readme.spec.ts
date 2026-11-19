import { expect, test, type Page } from "@playwright/test"

const PHONE = { width: 390, height: 844 }

function installSeededRandom() {
  let state = 1
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function prepare(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
  await page.addInitScript((nextTheme: string) => {
    localStorage.setItem("arcade-theme:v1", nextTheme)
    localStorage.setItem("tetris:gravity-ms", "120")
    let state = 1
    Math.random = () => {
      state = (state + 0x6d2b79f5) | 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }, theme)
}

async function shoot(page: Page, name: string) {
  await page.evaluate(
    () =>
      (globalThis as unknown as { document: { fonts: { ready: Promise<void> } } }).document.fonts
        .ready,
  )
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    animations: "disabled",
    fullPage: true,
  })
}

test("home in light mode", async ({ page }) => {
  await prepare(page, "light")
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "A small shelf of games, ready to play." }),
  ).toBeVisible()
  await shoot(page, "home-light")
})

test("home in dark mode", async ({ page }) => {
  await prepare(page, "dark")
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "A small shelf of games, ready to play." }),
  ).toBeVisible()
  await shoot(page, "home-dark")
})

test("tetris after a few pieces", async ({ page }) => {
  await prepare(page, "dark")
  await page.goto("/games/tetris")
  await expect(page.getByRole("heading", { level: 1, name: "Tetris" })).toBeVisible()
  await page.getByRole("button", { name: "Start" }).click()

  const board = page.getByRole("img", { name: /Tetris board/ })
  let locks = 0
  let previousY: number | null = null
  await expect
    .poll(
      async () => {
        const label = (await board.getAttribute("aria-label")) ?? ""
        const y = Number(label.match(/piece \w+ at \d+,(\d+)/)?.[1])
        if (previousY !== null && y + 2 < previousY) locks += 1
        if (Number.isInteger(y)) previousY = y
        return locks
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThanOrEqual(3)

  await page.getByRole("button", { name: "Pause" }).click()
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible()
  await shoot(page, "tetris-dark")
})

test("minesweeper with an opened square", async ({ page }) => {
  await prepare(page, "light")
  await page.goto("/games/minesweeper")
  await expect(page.getByRole("heading", { level: 1, name: "Minesweeper" })).toBeVisible()
  await page.evaluate(installSeededRandom)
  await page.getByRole("button", { name: "Hidden, row 8 column 5" }).click()
  await expect(page.getByRole("button", { name: /adjacent mines|Empty,/ }).first()).toBeVisible()
  await shoot(page, "minesweeper-light")
})

test("snake on a phone", async ({ page }) => {
  await page.setViewportSize(PHONE)
  await prepare(page, "dark")
  await page.goto("/games/snake")
  await expect(page.getByRole("heading", { level: 1, name: "Snake" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Up" })).toBeVisible()
  await shoot(page, "snake-mobile-dark")
})
