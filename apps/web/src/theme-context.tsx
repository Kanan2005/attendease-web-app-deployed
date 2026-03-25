"use client"

import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
})

const STORAGE_KEY = "attendease-theme"

export function ThemeProvider(props: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (saved === "light" || saved === "dark") {
      setTheme(saved)
      document.documentElement.setAttribute("data-theme", saved)
    } else if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      setTheme("light")
      document.documentElement.setAttribute("data-theme", "light")
    }
    setMounted(true)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark"
      document.documentElement.setAttribute("data-theme-transition", "")
      document.documentElement.setAttribute("data-theme", next)
      localStorage.setItem(STORAGE_KEY, next)
      setTimeout(() => {
        document.documentElement.removeAttribute("data-theme-transition")
      }, 400)
      return next
    })
  }, [])

  if (!mounted) {
    return <>{props.children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{props.children}</ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

export interface ChartColors {
  accent: string
  accentHover: string
  text: string
  textMuted: string
  border: string
  surfaceRaised: string
  success: string
  danger: string
  warning: string
}

const chartColorsDark: ChartColors = {
  accent: "#A78BFA",
  accentHover: "#C4B5FD",
  text: "#FAFAFA",
  textMuted: "#A1A1AA",
  border: "rgba(255, 255, 255, 0.06)",
  surfaceRaised: "#18181B",
  success: "#34D399",
  danger: "#F87171",
  warning: "#FBBF24",
}

const chartColorsLight: ChartColors = {
  accent: "#6D5AE6",
  accentHover: "#5B47D0",
  text: "#111827",
  textMuted: "#5F6B7A",
  border: "rgba(0, 0, 0, 0.07)",
  surfaceRaised: "#FFFFFF",
  success: "#059669",
  danger: "#DC2626",
  warning: "#D97706",
}

export function useChartColors(): ChartColors {
  const { theme } = useTheme()
  return theme === "light" ? chartColorsLight : chartColorsDark
}
