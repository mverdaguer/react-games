import { createContext, use } from "react"

export const themeStorageKey = "arcade-theme:v1"

export type Theme = "dark" | "light" | "system"

export type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeState | undefined>(undefined)

export function useTheme() {
  const context = use(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
