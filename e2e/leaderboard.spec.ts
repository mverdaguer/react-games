import { expect, test } from "@playwright/test"

test("snake still plays when the leaderboard is unreachable", async ({ page }) => {
  await page.goto("/games/snake")
  const main = page.getByRole("main")

  await expect(main.getByRole("heading", { name: "Top scores" })).toBeVisible()
  await expect(main.getByText("Leaderboard unavailable")).toBeVisible()

  await main.getByRole("button", { name: "Start, 5" }).click()
  await expect(main.getByText("Walls wrap around. Press Space or 5 to pause.")).toBeVisible()

  const head = main.locator("[data-head]")
  const start = await head.getAttribute("data-head")
  await expect.poll(async () => head.getAttribute("data-head")).not.toBe(start)
})
