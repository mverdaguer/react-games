# Arcade

A small single-page app for playing web games in the browser. A sidebar lists the games, and the one you pick opens in the main frame at its own URL.

## Games

| Game | URL | How to play |
| --- | --- | --- |
| Tic-Tac-Toe | `/games/tic-tac-toe` | Two players, one device. Line up three marks. The score carries across rounds. |
| Memory Match | `/games/memory` | Flip cards on a 4×4 board and find every pair. Moves and time are tracked. |
| Minesweeper | `/games/minesweeper` | Clear every safe square. Left click opens, right click flags. Beginner, Intermediate, and Expert. |

`/` is the shelf of games. Any other address shows a not-found page.

## Scripts

```bash
pnpm dev      # start the dev server
pnpm build    # typecheck and build for production
pnpm preview  # serve the production build
pnpm lint     # run oxlint
```

## Stack

Vite, React, and TypeScript. Tailwind CSS for styling, shadcn/ui for the interface, and React Router for the per-game URLs. Light, dark, and system themes are saved in the browser.

## Adding a game

Games are registered in [`src/games/registry.ts`](src/games/registry.ts). The sidebar and the routes both read that list.

1. Add a component under `src/games/<slug>/index.tsx` and export it as the default. Wrap the board in `GameShell` so the title, description, and toolbar match the other games.
2. Add an entry to `games` with a slug, name, description, icon, tags, and a `lazy` import of that component.

The game is then available at `/games/<slug>`.
