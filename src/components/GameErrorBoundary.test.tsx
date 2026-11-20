import { afterEach, expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"

import { GameErrorBoundary } from "@/components/GameErrorBoundary"

afterEach(() => {
  vi.restoreAllMocks()
})

function BrokenGame(): never {
  throw new Error("chunk failed")
}

test("a game that throws shows an alert and a reload button", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {})

  const screen = await render(
    <GameErrorBoundary>
      <BrokenGame />
    </GameErrorBoundary>,
  )

  await expect.element(screen.getByRole("alert")).toBeVisible()
  await expect
    .element(screen.getByRole("button", { name: "Reload" }))
    .toBeVisible()
})
