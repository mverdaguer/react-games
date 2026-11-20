import { Component, type ErrorInfo, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

type Props = { children: ReactNode }
type State = { failed: boolean }

export class GameErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="col-span-full flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          This game did not load. The site may have been updated since you opened it.
        </p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    )
  }
}
