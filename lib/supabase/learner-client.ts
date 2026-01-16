'use client'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Cache in-memory pour éviter de recréer plusieurs GoTrueClient/SupabaseClient
// (souvent déclenché en dev par React StrictMode et/ou les re-renders).
const learnerClientCache = new Map<string, ReturnType<typeof createSupabaseClient<Database>>>()

/**
 * Client Supabase pour l'espace apprenant (accès sans login).
 * On injecte le studentId dans un header afin de pouvoir l'utiliser en RLS (PostgREST).
 */
export function createLearnerClient(studentId?: string) {
  const cacheKey = studentId || 'anonymous'
  const cached = learnerClientCache.get(cacheKey)
  if (cached) return cached

  const headers: Record<string, string> = {}
  if (studentId) headers['x-learner-student-id'] = studentId

  // Empêche toute réutilisation d'une session admin stockée dans le navigateur.
  const noopStorage = {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
  }

  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: noopStorage as any,
        // Évite le warning "Multiple GoTrueClient instances" en isolant la clé.
        storageKey: `sb-learner-auth-token-${cacheKey}`,
      },
    }
  )

  learnerClientCache.set(cacheKey, client)
  return client
}


