import type { ReactNode } from "react"

type GameShellProps = {
  toolbar?: ReactNode
  children: ReactNode
}

export function GameShell({ toolbar, children }: GameShellProps) {
  return (
    <div className="contents">
      {toolbar != null ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:col-start-2 sm:row-start-1 sm:self-end">
          {toolbar}
        </div>
      ) : null}
      <div className="col-span-full flex items-start justify-center">
        {children}
      </div>
    </div>
  )
}
