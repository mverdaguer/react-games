import { lazy, type ComponentType, type LazyExoticComponent } from "react"
import { Brain, Grid3x3, type LucideIcon } from "lucide-react"

export type GameDefinition = {
  slug: string
  name: string
  description: string
  icon: LucideIcon
  tags: string[]
  component: LazyExoticComponent<ComponentType>
  preload: () => Promise<unknown>
}

const loadTicTacToe = () => import("@/games/tic-tac-toe")
const loadMemory = () => import("@/games/memory")

export const games: GameDefinition[] = [
  {
    slug: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    description: "Take turns on a 3×3 grid. Line up three marks to win.",
    icon: Grid3x3,
    tags: ["Two player", "Quick"],
    component: lazy(loadTicTacToe),
    preload: loadTicTacToe,
  },
  {
    slug: "memory",
    name: "Memory Match",
    description: "Flip cards and find every matching pair.",
    icon: Brain,
    tags: ["Solo", "Puzzle"],
    component: lazy(loadMemory),
    preload: loadMemory,
  },
]

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug)
}
