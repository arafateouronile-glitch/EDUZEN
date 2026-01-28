'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface FocusModeContextType {
  isFocusMode: boolean
  toggleFocusMode: () => void
  setFocusMode: (value: boolean) => void
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined)

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState(false)

  // Charger la préférence depuis localStorage au montage
  useEffect(() => {
    const saved = localStorage.getItem('editor-focus-mode')
    if (saved === 'true') {
      setIsFocusMode(true)
    }
  }, [])

  // Sauvegarder la préférence dans localStorage
  useEffect(() => {
    localStorage.setItem('editor-focus-mode', String(isFocusMode))
  }, [isFocusMode])

  const toggleFocusMode = () => {
    setIsFocusMode((prev) => !prev)
  }

  const setFocusMode = (value: boolean) => {
    setIsFocusMode(value)
  }

  return (
    <FocusModeContext.Provider value={{ isFocusMode, toggleFocusMode, setFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  )
}

export function useFocusMode() {
  const context = useContext(FocusModeContext)
  if (context === undefined) {
    throw new Error('useFocusMode must be used within a FocusModeProvider')
  }
  return context
}
