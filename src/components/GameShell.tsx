import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"

type GameShellProps = {
  title: string
  description: string
  tags?: string[]
  toolbar?: ReactNode
  children: ReactNode
}

export function GameShell({
  title,
  description,
  tags,
  toolbar,
  children,
}: GameShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {toolbar && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {toolbar}
          </div>
        )}
      </div>
      <div className="flex flex-1 items-start justify-center">{children}</div>
    </div>
  )
}
