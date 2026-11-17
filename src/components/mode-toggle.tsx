import { Monitor, Moon, Sun } from "lucide-react"

import { useTheme, type Theme } from "@/components/theme"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const options: { theme: Theme; label: string; icon: typeof Sun }[] = [
  { theme: "light", label: "Light", icon: Sun },
  { theme: "dark", label: "Dark", icon: Moon },
  { theme: "system", label: "System", icon: Monitor },
]

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Toggle theme"
        >
          <Sun
            aria-hidden="true"
            className="scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90"
          />
          <Moon
            aria-hidden="true"
            className="absolute scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map(({ theme, label, icon: Icon }) => (
          <DropdownMenuItem key={theme} onClick={() => setTheme(theme)}>
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
