'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>

// Clé versionnée : si on change la config, l'ancien cache est ignoré.
const CACHE_KEY = '__supabaseBrowserClient_v2'
const g = globalThis as typeof globalThis & { [CACHE_KEY]?: BrowserClient }

export const createClient = (): BrowserClient => {
  if (!g[CACHE_KEY]) {
    const client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // @supabase/supabase-js v2.38.x ne supporte pas l'option auth.lock au constructeur.
    // On patche directement la méthode lock sur l'instance GoTrueClient.
    // Sans ce patch, les appels concurrents à getSession() se bloquent mutuellement
    // via l'API Web Locks et génèrent des NavigatorLockAcquireTimeoutError après 10s.
    const auth = client.auth as unknown as { lock?: (name: string, timeout: number, fn: () => Promise<unknown>) => Promise<unknown> }
    if (typeof auth.lock === 'function') {
      auth.lock = (_name: string, _timeout: number, fn: () => Promise<unknown>) => fn()
    }

    g[CACHE_KEY] = client
  }
  return g[CACHE_KEY]!
}
