import { afterEach, expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"

import MemoryMatch from "@/games/memory"
import { createDeck } from "@/games/memory/logic"

afterEach(() => {
  vi.restoreAllMocks()
})

function pairIndexes(symbol: string, deck: { symbol: string }[]) {
  return deck.flatMap((card, index) => (card.symbol === symbol ? [index] : []))
}

test("a matching pair counts as one move", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0)
  const deck = createDeck()
  const symbol = deck[0]?.symbol ?? ""
  const [first, second] = pairIndexes(symbol, deck)
  const screen = await render(<MemoryMatch />)
  const cards = screen.getByRole("group", { name: "Cards" }).getByRole("button")

  await cards.nth(first ?? 0).click()
  await cards.nth(second ?? 0).click()

  const matched = screen
    .getByRole("group", { name: "Cards" })
    .getByRole("button", { name: `Matched ${symbol}` })
  await expect.element(matched.nth(0)).toBeVisible()
  await expect.element(matched.nth(1)).toBeVisible()
  await expect.poll(() => matched.elements().length).toBe(2)
  await expect.element(screen.getByText("1 move")).toBeVisible()
})

test("a mismatched pair is shown and then hidden", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0)
  const deck = createDeck()
  const firstSymbol = deck[0]?.symbol ?? ""
  const secondIndex = deck.findIndex((card) => card.symbol !== firstSymbol)
  const screen = await render(<MemoryMatch />)
  const cards = screen.getByRole("group", { name: "Cards" }).getByRole("button")

  await cards.nth(0).click()
  await cards.nth(secondIndex).click()

  await expect.element(cards.nth(0)).toHaveAccessibleName(`Showing ${firstSymbol}`)
  await expect.element(cards.nth(secondIndex)).toHaveAccessibleName(
    `Showing ${deck[secondIndex]?.symbol}`,
  )
  await expect.element(cards.nth(0), { timeout: 2000 }).toHaveAccessibleName("Hidden card")
  await expect.element(cards.nth(secondIndex), { timeout: 2000 }).toHaveAccessibleName(
    "Hidden card",
  )
})

test("clearing every pair and restarting", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0)
  const deck = createDeck()
  const screen = await render(<MemoryMatch />)
  const cards = screen.getByRole("group", { name: "Cards" }).getByRole("button")
  const seen = new Set<string>()

  for (const card of deck) {
    if (seen.has(card.symbol)) continue
    seen.add(card.symbol)
    const [first, second] = pairIndexes(card.symbol, deck)
    await cards.nth(first ?? 0).click()
    await cards.nth(second ?? 0).click()
  }

  await expect.element(screen.getByText("Cleared in 8 moves")).toBeVisible()
  await screen.getByRole("button", { name: "Restart" }).click()
  await expect.element(screen.getByText("Flip a card to start")).toBeVisible()
})
