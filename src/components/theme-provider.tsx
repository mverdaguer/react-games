import { useEffect, useState, type ReactNode } from "react"

import { ThemeContext, type Theme } from "@/components/theme"

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "arcade-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const apply = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme
      root.classList.remove("light", "dark")
      root.classList.add(resolved)
    }

    apply()
    if (theme !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const value = {
    theme,
    setTheme: (next: Theme) => {
      localStorage.setItem(storageKey, next)
      setThemeState(next)
    },
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
