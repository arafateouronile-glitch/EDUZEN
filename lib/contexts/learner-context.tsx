'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useLearner } from '@/lib/hooks/use-learner'

interface LearnerContextType {
  student: ReturnType<typeof useLearner>['student']
  studentId: string | undefined
  isLoading: boolean
  hasStudent: boolean
  organizationId: string | null
}

const LearnerContext = createContext<LearnerContextType | null>(null)

export function LearnerProvider({ children }: { children: ReactNode }) {
  const learner = useLearner()

  return (
    <LearnerContext.Provider value={learner}>
      {children}
    </LearnerContext.Provider>
  )
}

export function useLearnerContext() {
  const context = useContext(LearnerContext)
  if (!context) {
    throw new Error('useLearnerContext must be used within LearnerProvider')
  }
  return context
}



