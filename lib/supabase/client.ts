'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

/**
 * Client Supabase côté navigateur.
 * En cas de NavigatorLockAcquireTimeoutError : souvent dû à plusieurs onglets ou appels auth concurrents.
 * Tenir @supabase/ssr et @supabase/supabase-js à jour pour les correctifs de lock.
 */
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

