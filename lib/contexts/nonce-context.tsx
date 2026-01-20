'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Contexte pour le nonce CSP
 *
 * Le nonce est généré dans le middleware et passé aux composants
 * via ce contexte pour permettre l'exécution de scripts inline sécurisés.
 */

interface NonceContextValue {
  nonce: string | undefined
}

const NonceContext = createContext<NonceContextValue>({ nonce: undefined })

/**
 * Hook pour accéder au nonce CSP
 */
export function useNonce(): string | undefined {
  const context = useContext(NonceContext)
  return context.nonce
}

/**
 * Provider pour le nonce CSP
 */
export function NonceProvider({
  nonce,
  children,
}: {
  nonce: string | undefined
  children: ReactNode
}) {
  return (
    <NonceContext.Provider value={{ nonce }}>
      {children}
    </NonceContext.Provider>
  )
}
