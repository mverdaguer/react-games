export const SYMBOLS = ["🎮", "🎲", "🎯", "🚀", "🌟", "🎨", "🎵", "🏆"]

export type Card = {
  id: number
  symbol: string
  flipped: boolean
  matched: boolean
}

export type FlipResult =
  | { kind: "ignored" }
  | { kind: "opened"; cards: Card[] }
  | { kind: "matched"; cards: Card[] }
  | { kind: "mismatched"; cards: Card[]; pair: [number, number] }

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const next = items.slice()
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = next[index]
    next[index] = next[swap] as T
    next[swap] = current as T
  }
  return next
}

export function createDeck(random: () => number = Math.random): Card[] {
  const pairs = SYMBOLS.flatMap((symbol, index) => [
    { id: index * 2, symbol, flipped: false, matched: false },
    { id: index * 2 + 1, symbol, flipped: false, matched: false },
  ])
  return shuffle(pairs, random)
}

export function isWon(cards: readonly Card[]): boolean {
  return cards.every((card) => card.matched)
}

export function hideCards(cards: readonly Card[], ids: readonly number[]): Card[] {
  const hidden = new Set(ids)
  return cards.map((card) =>
    hidden.has(card.id) ? { ...card, flipped: false } : card,
  )
}

export function flipCard(cards: readonly Card[], id: number): FlipResult {
  const card = cards.find((item) => item.id === id)
  if (!card || card.flipped || card.matched) return { kind: "ignored" }

  const open = cards.filter((item) => item.flipped && !item.matched)
  if (open.length >= 2) return { kind: "ignored" }

  const next = cards.map((item) =>
    item.id === id ? { ...item, flipped: true } : item,
  )
  const opened = next.filter((item) => item.flipped && !item.matched)
  if (opened.length < 2) return { kind: "opened", cards: next }

  const [first, second] = opened
  if (!first || !second) return { kind: "ignored" }

  if (first.symbol === second.symbol) {
    return {
      kind: "matched",
      cards: next.map((item) =>
        item.id === first.id || item.id === second.id
          ? { ...item, matched: true }
          : item,
      ),
    }
  }

  return {
    kind: "mismatched",
    cards: next,
    pair: [first.id, second.id],
  }
}
