/**
 * Управление темой (light / dark).
 *
 * Тема хранится в localStorage под ключом ege_theme.
 * По умолчанию — 'light' (светлая мята).
 *
 * Класс 'dark' ставится на <html> — Tailwind darkMode: 'class' это подхватывает.
 *
 * Использование:
 *   const { theme, toggle } = useTheme()
 */

import { useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'ege_theme'
const DEFAULT_THEME: Theme = 'light'

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* localStorage недоступен */
  }
  return DEFAULT_THEME
}

function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

// Применяем тему ДО загрузки React — чтобы избежать вспышки светлой темы
applyTheme(readStoredTheme())

export function useTheme(): {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
} {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const toggle = useCallback(() => {
    setThemeState((t) => (t === 'light' ? 'dark' : 'light'))
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
  }, [])

  return { theme, toggle, setTheme }
}
