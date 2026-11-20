import { DirectionalTransition, TransitionLink } from "@/components/page-transition"
import { Button } from "@/components/ui/button"

export function NotFound() {
  return (
    <DirectionalTransition>
      <div className="mx-auto flex max-w-md flex-col items-start gap-3 py-16">
        <p className="text-sm font-medium text-primary-ink">404</p>
        <h1 className="scroll-mt-16 font-heading text-3xl font-semibold tracking-tight text-balance">
          That game is not on the shelf.
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          The address does not match a game in this arcade. Go back to the
          shelf and pick another.
        </p>
        <Button asChild>
          <TransitionLink to="/">Back to the shelf</TransitionLink>
        </Button>
      </div>
    </DirectionalTransition>
  )
}
