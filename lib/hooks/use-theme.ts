'use client'

import React, { useEffect, useState } from 'react'
import { useLocalStorage } from './use-local-storage'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './use-auth'
import { analytics } from '@/lib/utils/analytics'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setThemeState] = useLocalStorage<Theme>('theme', 'system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const supabase = createClient()
  const { user } = useAuth()

  // Sauvegarder la préférence dans la base de données si l'utilisateur est connecté
  const saveThemePreference = async (newTheme: Theme) => {
    if (!user?.id) return

    try {
      await supabase
        .from('users')
        .update({ theme_preference: newTheme })
        .eq('id', user.id)
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  // Charger la préférence depuis la base de données au montage
  useEffect(() => {
    if (!user?.id) return

    const loadThemePreference = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('theme_preference')
          .eq('id', user.id)
          .single()

        if (data?.theme_preference) {
          setThemeState(data.theme_preference as Theme)
        }
      } catch (error) {
        console.error('Error loading theme preference:', error)
      }
    }

    loadThemePreference()
  }, [user?.id, setThemeState, supabase])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Get system preference
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    
    // Determine resolved theme
    const resolved = theme === 'system' ? systemTheme : theme
    setResolvedTheme(resolved)

    // Apply theme to document
    const root = document.documentElement
    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newResolved = e.matches ? 'dark' : 'light'
        setResolvedTheme(newResolved)
        if (newResolved === 'dark') {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const updateTheme = (newTheme: Theme) => {
    // Only run on client side
    if (typeof window === 'undefined') return

    setThemeState(newTheme)
    saveThemePreference(newTheme)
    
    // Track le changement de thème
    analytics.theme.changed(newTheme)

    // Update resolved theme
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      setResolvedTheme(systemTheme)
    } else {
      setResolvedTheme(newTheme)
    }

    // Apply theme to document
    const root = document.documentElement
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      if (systemTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    } else {
      if (newTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  return {
    theme,
    resolvedTheme,
    setTheme: updateTheme,
    toggleTheme: () => {
      const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
      updateTheme(newTheme)
    },
  }
}

