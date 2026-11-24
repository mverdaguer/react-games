import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const routes = [
  "/",
  "/games/tic-tac-toe",
  "/games/memory",
  "/games/minesweeper",
  "/games/snake",
  "/games/tetris",
  "/games/pang",
  "/games/arkanoid",
  "/games/nope",
]

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]

function scan(page: Page) {
  return new AxeBuilder({ page }).withTags(tags).analyze()
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme, reducedMotion: "reduce" })

    for (const route of routes) {
      test(`${route} has no accessibility violations axe can detect`, async ({ page }) => {
        await page.goto(route)
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
        await expect(page.getByText("Loading game…")).toBeHidden()

        expect((await scan(page)).violations).toEqual([])
      })
    }

    test("a finished two-player Tic-Tac-Toe round has no violations", async ({ page }) => {
      await page.goto("/games/tic-tac-toe")
      const main = page.getByRole("main")
      await main.getByRole("button", { name: "Two players" }).click()
      await expect(main.getByRole("button", { name: "Two players" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      for (const cell of [1, 4, 2, 5, 3]) {
        await main.getByRole("button", { name: `Empty cell ${cell}` }).click()
      }
      await expect(main.getByText("X wins this round")).toBeVisible()
      await expect(main.getByRole("button", { name: "Play again" })).toBeVisible()

      expect((await scan(page)).violations).toEqual([])
    })
  })
}
