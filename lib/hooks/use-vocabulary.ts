'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { getVocabulary, type OrganizationType, type Vocabulary } from '@/lib/utils/vocabulary'

/**
 * Hook React pour utiliser le vocabulaire adaptatif selon le type d'organisation
 */
export function useVocabulary(): Vocabulary {
  const { user } = useAuth()
  const supabase = createClient()

  // Récupérer le type d'organisation
  const { data: organizationType } = useQuery<OrganizationType>({
    queryKey: ['organization-type', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return 'school'

      try {
        // Timeout de 3 secondes pour éviter les blocages
        const timeoutPromise = new Promise<OrganizationType>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 3000)
        })

        const queryPromise = supabase
          .from('organizations')
          .select('organization_type')
          .eq('id', user.organization_id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              // Si la colonne n'existe pas, c'est que la migration n'a pas été exécutée
              if (error.code === '42703' || error.message?.includes('does not exist')) {
                return 'school'
              }
              return 'school' // Par défaut
            }
            return (data?.organization_type as OrganizationType) || 'school'
          })

        return await Promise.race([queryPromise, timeoutPromise])
      } catch (error) {
        // En cas d'erreur ou de timeout, retourner la valeur par défaut
        return 'school'
      }
    },
    enabled: !!user?.organization_id,
    staleTime: 1000 * 60 * 5, // Cache pendant 5 minutes
    retry: false, // Ne pas réessayer si la colonne n'existe pas
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // Toujours retourner un vocabulaire valide, même si la requête échoue
  return getVocabulary(organizationType || 'school')
}
