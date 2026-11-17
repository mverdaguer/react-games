import { ArrowRight, Gamepad2 } from "lucide-react"

import { GameIdentity } from "@/components/GameIdentity"
import {
  DirectionalTransition,
  TransitionLink,
} from "@/components/page-transition"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { games } from "@/games/registry"

export function Home() {
  return (
    <DirectionalTransition>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <section className="space-y-4">
          <Badge variant="secondary">
            <Gamepad2 aria-hidden="true" />
            Local arcade
          </Badge>
          <h1 className="max-w-xl scroll-mt-16 font-heading text-4xl font-semibold tracking-tight text-balance">
            A small shelf of games, ready to play.
          </h1>
          <p className="max-w-lg text-pretty text-muted-foreground">
            Choose a game from the sidebar or from the cards below. Each game
            has its own address, so a link and the back button both land in the
            right place.
          </p>
        </section>
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
          {games.map((game) => (
            <TransitionLink
              key={game.slug}
              to={`/games/${game.slug}`}
              preload={game.preload}
              className="group flex min-w-0 flex-col rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="h-full w-full flex-1 transition duration-200 group-hover:-translate-y-0.5 group-hover:ring-primary/40">
                <CardHeader>
                  <GameIdentity
                    game={game}
                    title={<CardTitle>{game.name}</CardTitle>}
                  />
                  <CardDescription className="text-pretty">
                    {game.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex-wrap justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {game.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                    Play
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </CardFooter>
              </Card>
            </TransitionLink>
          ))}
        </section>
      </div>
    </DirectionalTransition>
  )
}
