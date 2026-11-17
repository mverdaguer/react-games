import { Suspense } from "react"
import { useParams } from "react-router"

import { getGame } from "@/games/registry"
import { NotFound } from "@/pages/NotFound"

export function GamePage() {
  const { slug } = useParams()
  const game = slug ? getGame(slug) : undefined

  if (!game) return <NotFound />

  const Game = game.component

  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading game…</p>
      }
    >
      <Game />
    </Suspense>
  )
}
