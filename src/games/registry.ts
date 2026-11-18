import { lazy, type ComponentType, type LazyExoticComponent } from "react"
import { Bomb, Brain, Grid3x3, Worm, type LucideIcon } from "lucide-react"

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
const loadMinesweeper = () => import("@/games/minesweeper")
const loadSnake = () => import("@/games/snake")

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
  {
    slug: "minesweeper",
    name: "Minesweeper",
    description: "Clear the minefield without hitting a mine. Numbers count the mines around each square.",
    icon: Bomb,
    tags: ["Solo", "Logic"],
    component: lazy(loadMinesweeper),
    preload: loadMinesweeper,
  },
  {
    slug: "snake",
    name: "Snake",
    description:
      "Eat the food and grow without biting your own tail. Walls wrap around: leave one side and come back on the other.",
    icon: Worm,
    tags: ["Solo", "Arcade"],
    component: lazy(loadSnake),
    preload: loadSnake,
  },
]

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug)
}
