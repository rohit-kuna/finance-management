"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Toggle } from "@/components/ui/toggle"

export function ModeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Toggle aria-label="Toggle theme" variant="outline" className="relative">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Toggle>
    )
  }

  const currentTheme = theme ?? "system"
  const activeTheme = currentTheme === "system" ? resolvedTheme : currentTheme
  const isDark = activeTheme === "dark"

  const handleToggle = () => {
    if (currentTheme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark")
      return
    }
    setTheme(currentTheme === "dark" ? "light" : "dark")
  }

  return (
    <Toggle
      aria-label="Toggle theme"
      variant="outline"
      className="relative"
      pressed={isDark}
      onPressedChange={handleToggle}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle theme</span>
    </Toggle>
  )
}
