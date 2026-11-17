import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { themeStorageKey, ThemeContext, type Theme } from "@/components/theme"

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const themeColors = {
  light: "#ffffff",
  dark: "#252525",
} as const

function readTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored
    }
    const legacy = localStorage.getItem("arcade-theme")
    if (legacy === "light" || legacy === "dark" || legacy === "system") {
      localStorage.setItem(storageKey, legacy)
      localStorage.removeItem("arcade-theme")
      return legacy
    }
  } catch {
    return fallback
  }
  return fallback
}

function paintTheme(theme: Theme) {
  const root = document.documentElement
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  root.style.colorScheme = resolved
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", themeColors[resolved])
  return media
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = themeStorageKey,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    readTheme(storageKey, defaultTheme),
  )

  useEffect(() => {
    const media = paintTheme(theme)
    if (theme !== "system") return
    const apply = () => paintTheme("system")
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const setTheme = useCallback(
    (next: Theme) => {
      try {
        localStorage.setItem(storageKey, next)
      } catch {
        // Private mode and disabled storage still apply the theme in memory.
      }
      setThemeState(next)
    },
    [storageKey],
  )

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
