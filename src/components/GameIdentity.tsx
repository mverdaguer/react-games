import { ViewTransition, type ReactNode } from "react"

import type { GameDefinition } from "@/games/registry"

export function GameIdentity({
  game,
  title,
}: {
  game: GameDefinition
  title: ReactNode
}) {
  const Icon = game.icon

  return (
    <ViewTransition name={`game-${game.slug}`} share="text-morph" default="none">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden="true" />
        </div>
        {title}
      </div>
    </ViewTransition>
  )
}
