import { Link } from "react-router"

import { Button } from "@/components/ui/button"

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-3 py-16">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        That game is not on the shelf.
      </h1>
      <p className="text-sm text-muted-foreground">
        The address does not match a game in this arcade.
      </p>
      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </div>
  )
}
