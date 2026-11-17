import { ArrowRight, Gamepad2 } from "lucide-react"
import { Link } from "react-router"

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <section className="space-y-4">
        <Badge variant="secondary">
          <Gamepad2 />
          Local arcade
        </Badge>
        <h1 className="max-w-xl font-heading text-4xl font-semibold tracking-tight text-balance">
          A small shelf of games, ready to play.
        </h1>
        <p className="max-w-lg text-muted-foreground">
          Choose a game from the sidebar or from the cards below. Each game has
          its own address, so a link and the back button both land in the right
          place.
        </p>
      </section>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
        {games.map((game) => (
          <Link
            key={game.slug}
            to={`/games/${game.slug}`}
            className="group flex min-w-0 flex-col rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full w-full flex-1 transition duration-200 group-hover:-translate-y-0.5 group-hover:ring-primary/40">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <game.icon />
                </div>
                <CardTitle>{game.name}</CardTitle>
                <CardDescription>{game.description}</CardDescription>
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
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
