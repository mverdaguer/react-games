import { Suspense, ViewTransition } from "react"
import { useParams } from "react-router"

import { GameIdentity } from "@/components/GameIdentity"
import { DirectionalTransition } from "@/components/page-transition"
import { Badge } from "@/components/ui/badge"
import { getGame } from "@/games/registry"
import { NotFound } from "@/pages/NotFound"

export function GamePage() {
  const { slug } = useParams()
  const game = slug ? getGame(slug) : undefined

  if (!game) return <NotFound />

  const Game = game.component

  return (
    <DirectionalTransition>
      <div className="mx-auto grid w-full max-w-3xl content-start grid-cols-1 items-end gap-x-4 gap-y-6 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <GameIdentity
            game={game}
            title={
              <h1 className="scroll-mt-16 font-heading text-2xl font-semibold tracking-tight text-balance">
                {game.name}
              </h1>
            }
          />
          <p className="max-w-xl text-pretty text-sm text-muted-foreground">
            {game.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <Suspense
          fallback={
            <ViewTransition exit="slide-down">
              <p className="col-span-full text-sm text-muted-foreground">
                Loading game…
              </p>
            </ViewTransition>
          }
        >
          <ViewTransition enter="slide-up" default="none">
            <Game />
          </ViewTransition>
        </Suspense>
      </div>
    </DirectionalTransition>
  )
}
