/**
 * Requêtes Supabase mises en cache avec React.cache()
 *
 * React.cache() déduplique les appels identiques au sein d'un même arbre de rendu
 * server-side (Server Components). Chaque requête n'est exécutée qu'une seule fois
 * par render, même si plusieurs composants l'appellent avec les mêmes arguments.
 *
 * Usage dans un Server Component :
 *   const user = await getCachedUser()
 *   const org  = await getCachedOrganization(user.organization_id)
 *
 * NE PAS utiliser dans les API Routes — chaque requête est indépendante et le cache
 * React ne s'applique pas (pas d'arbre de rendu).
 */

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Retourne l'utilisateur Supabase Auth authentifié.
 * Dédupliqué par render — idéal pour layout + page qui appellent tous les deux getUser().
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
})

/**
 * Retourne le profil utilisateur depuis public.users.
 */
export const getCachedUserProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('id, organization_id, role, full_name, email, avatar_url')
    .eq('id', userId)
    .single()
  return data
})

/**
 * Retourne les infos essentielles de l'organisation.
 */
export const getCachedOrganization = cache(async (organizationId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizations')
    .select('id, name, email, settings, subscription_status')
    .eq('id', organizationId)
    .single()
  return data
})

/**
 * Retourne l'abonnement actif de l'organisation.
 */
export const getCachedSubscription = cache(async (organizationId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('id, status, trial_end_at, current_period_end')
    .eq('organization_id', organizationId)
    .maybeSingle()
  return data
})
