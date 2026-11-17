import { Outlet, useLocation } from "react-router"

import { AppSidebar } from "@/components/layout/AppSidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { games } from "@/games/registry"

export function AppLayout() {
  const { pathname } = useLocation()
  const game = games.find((item) => pathname === `/games/${item.slug}`)
  const title = game?.name ?? (pathname === "/" ? "Home" : "Arcade")

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="arcade-canvas">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
          <ModeToggle />
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
