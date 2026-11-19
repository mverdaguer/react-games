import { lazy, type ComponentType, type LazyExoticComponent } from "react"
import { Blocks, Bomb, Brain, Grid3x3, Worm, type LucideIcon } from "lucide-react"

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
const loadTetris = () => import("@/games/tetris")

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
  {
    slug: "tetris",
    name: "Tetris",
    description:
      "Stack the pieces and clear lines. No hold and no hard drop: rotate, slide, and soft drop, the way the 1989 game did.",
    icon: Blocks,
    tags: ["Solo", "Arcade"],
    component: lazy(loadTetris),
    preload: loadTetris,
  },
]

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug)
}
