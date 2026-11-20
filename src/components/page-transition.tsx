import {
  addTransitionType,
  startTransition,
  ViewTransition,
  type MouseEvent,
  type ReactNode,
} from "react"
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  type LinkProps,
  type NavLinkProps,
} from "react-router"

type Direction = "nav-forward" | "nav-back" | "nav-lateral"

function directionFor(from: string, to: string): Direction {
  const fromGame = from.startsWith("/games/")
  const toGame = to.startsWith("/games/")
  if (fromGame && toGame && from !== to) return "nav-lateral"
  if (fromGame && !toGame) return "nav-back"
  if (!fromGame && toGame) return "nav-forward"
  return "nav-forward"
}

function useTypedNavigate() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (to: string) => {
    startTransition(() => {
      addTransitionType(directionFor(pathname, to))
      navigate(to)
    })
  }
}

function interceptClick(
  event: MouseEvent<HTMLAnchorElement>,
  to: LinkProps["to"],
  go: (to: string) => void,
) {
  if (event.defaultPrevented || typeof to !== "string") return
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return
  }
  event.preventDefault()
  go(to)
}

type PreloadProps = {
  preload?: () => Promise<unknown>
}

export function TransitionLink({
  to,
  preload,
  onClick,
  onMouseEnter,
  onFocus,
  ...props
}: LinkProps & PreloadProps) {
  const go = useTypedNavigate()

  return (
    <Link
      to={to}
      onMouseEnter={(event) => {
        preload?.().catch(() => {})
        onMouseEnter?.(event)
      }}
      onFocus={(event) => {
        preload?.().catch(() => {})
        onFocus?.(event)
      }}
      onClick={(event) => {
        onClick?.(event)
        interceptClick(event, to, go)
      }}
      {...props}
    />
  )
}

export function TransitionNavLink({
  to,
  preload,
  onClick,
  onMouseEnter,
  onFocus,
  ...props
}: NavLinkProps & PreloadProps) {
  const go = useTypedNavigate()

  return (
    <NavLink
      to={to}
      onMouseEnter={(event) => {
        preload?.().catch(() => {})
        onMouseEnter?.(event)
      }}
      onFocus={(event) => {
        preload?.().catch(() => {})
        onFocus?.(event)
      }}
      onClick={(event) => {
        onClick?.(event)
        interceptClick(event, to, go)
      }}
      {...props}
    />
  )
}

export function DirectionalTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        "nav-lateral": "fade-in",
        default: "none",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        "nav-lateral": "fade-out",
        default: "none",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  )
}
