import { describe, expect, it } from "vitest"

import {
  SYMBOLS,
  createDeck,
  flipCard,
  hideCards,
  isWon,
  shuffle,
  type Card,
} from "@/games/memory/logic"

function card(id: number, symbol: string, extra: Partial<Card> = {}): Card {
  return { id, symbol, flipped: false, matched: false, ...extra }
}

describe("createDeck", () => {
  it("deals 16 face-down cards, each symbol twice, with unique ids", () => {
    const deck = createDeck(() => 0)
    expect(deck).toHaveLength(16)
    expect(new Set(deck.map((item) => item.id)).size).toBe(16)
    for (const symbol of SYMBOLS) {
      expect(deck.filter((item) => item.symbol === symbol)).toHaveLength(2)
    }
    expect(deck.every((item) => !item.flipped && !item.matched)).toBe(true)
  })
})

describe("shuffle", () => {
  it("is a deterministic permutation and does not mutate its input", () => {
    const input = [1, 2, 3, 4]
    const original = [...input]
    expect(shuffle(input, () => 0)).toEqual([2, 3, 4, 1])
    expect(shuffle(input, () => 0)).toEqual([2, 3, 4, 1])
    expect(input).toEqual(original)
    const shuffled = shuffle(input, () => 0)
    expect(shuffled.toSorted()).toEqual(original.toSorted())
  })
})

describe("flipCard", () => {
  it("ignores an unknown id, a card already up, a matched card, and a third flip", () => {
    const faceDown = [card(1, "a"), card(2, "b")]
    expect(flipCard(faceDown, 9)).toEqual({ kind: "ignored" })
    expect(flipCard([card(1, "a", { flipped: true })], 1)).toEqual({ kind: "ignored" })
    expect(flipCard([card(1, "a", { flipped: true, matched: true })], 1)).toEqual({
      kind: "ignored",
    })
    const twoOpen = [card(1, "a", { flipped: true }), card(2, "b", { flipped: true }), card(3, "c")]
    expect(flipCard(twoOpen, 3)).toEqual({ kind: "ignored" })
  })

  it("opens the first card", () => {
    const cards = [card(1, "a"), card(2, "b")]
    const result = flipCard(cards, 2)
    expect(result.kind).toBe("opened")
    if (result.kind !== "opened") return
    expect(result.cards.map((item) => item.flipped)).toEqual([false, true])
    expect(cards.map((item) => item.flipped)).toEqual([false, false])
  })

  it("matches the second card when the symbols agree", () => {
    const cards = [card(1, "a", { flipped: true }), card(2, "a")]
    const result = flipCard(cards, 2)
    expect(result.kind).toBe("matched")
    if (result.kind !== "matched") return
    expect(result.cards.every((item) => item.flipped && item.matched)).toBe(true)
  })

  it("reports a mismatch and the pair ids when the symbols differ", () => {
    const cards = [card(4, "a", { flipped: true }), card(7, "b"), card(8, "c")]
    const result = flipCard(cards, 7)
    expect(result).toEqual({
      kind: "mismatched",
      cards: [card(4, "a", { flipped: true }), card(7, "b", { flipped: true }), card(8, "c")],
      pair: [4, 7],
    })
  })
})

describe("hideCards", () => {
  it("turns the given cards face down", () => {
    const cards = [card(1, "a", { flipped: true }), card(2, "b", { flipped: true }), card(3, "c")]
    expect(hideCards(cards, [1, 2])).toEqual([card(1, "a"), card(2, "b"), card(3, "c")])
    expect(cards[0]?.flipped).toBe(true)
  })
})

describe("isWon", () => {
  it("is true only when every card is matched", () => {
    expect(isWon([card(1, "a"), card(2, "a", { matched: true })])).toBe(false)
    expect(isWon([card(1, "a", { matched: true }), card(2, "a", { matched: true })])).toBe(true)
  })
})
