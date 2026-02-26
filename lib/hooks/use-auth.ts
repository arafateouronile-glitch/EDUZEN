'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { useEffect } from 'react'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { logger } from '@/lib/utils/logger'

type UserRow = Database['public']['Tables']['users']['Row'] | null
type Organization = TableRow<'organizations'>

export function useAuth() {
  const supabase = createClient()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Récupérer l'utilisateur authentifié via getUser() (vérifié côté serveur Auth, pas getSession())
  // refetchOnMount: true pour récupérer la session après hard refresh (cache vidé)
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const fetchSession = async (): Promise<{ user: User } | null> => {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          const isSessionMissing =
            error?.name === 'AuthSessionMissingError' ||
            (error as { message?: string })?.message?.includes('Auth session missing')
          const isRateLimit = (error as { status?: number })?.status === 429
          if (!isSessionMissing && !isRateLimit) {
            logger.error('Auth getUser error', error as Error)
          }
          if (isRateLimit) {
            logger.warn('Auth rate limit (429), returning null for session')
          }
          return null
        }
        return user ? { user } : null
      }

      const timeoutMs = 10000 // 10s pour éviter les faux timeouts (réseau lent, cold start)
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Session fetch timeout')), timeoutMs)
      })

      try {
        const sessionPromise = (async () => {
          let result = await fetchSession()
          if (!result && typeof window !== 'undefined') {
            await new Promise((r) => setTimeout(r, 400))
            result = await fetchSession()
          }
          return result
        })()
        const result = await Promise.race([sessionPromise, timeoutPromise])
        return result ?? null
      } catch (error) {
        const err = error as Error
        const isTimeout = err?.message === 'Session fetch timeout'
        if (isTimeout) {
          logger.debug(`Session fetch timed out after ${timeoutMs / 1000}s (réseau lent ou non connecté)`)
        } else {
          logger.warn('Session fetch failed', err)
        }
        return null
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Important : recharger la session au montage (ex. après Cmd+Shift+R)
    staleTime: 1000 * 60 * 5, // Cache pendant 5 minutes
  })

  // Récupérer l'utilisateur depuis la table users
  const { data: user, isLoading: userLoading } = useQuery<UserRow>({
    queryKey: ['user', session?.user?.id],
    queryFn: async (): Promise<UserRow> => {
      if (!session?.user?.id) {
        return null
      }
      
      try {
        // Timeout de 3 secondes pour éviter les blocages
        const timeoutPromise = new Promise<UserRow>((_, reject) => {
          setTimeout(() => reject(new Error('User fetch timeout')), 3000)
        })

        const userPromise = supabase
          .from('users')
          .select('id, organization_id, email, full_name, phone, avatar_url, role, permissions, is_active, last_login_at, created_at, updated_at, theme_preference')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(async ({ data, error }) => {
            if (error) {
              // Si l'utilisateur n'existe pas, retourner null sans erreur
              if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
                return null
              }
              return null
            }

            // Si l'utilisateur n'existe pas dans public.users mais qu'il y a une session,
            // synchroniser automatiquement depuis auth.users
            if (!data && session?.user?.id) {
              logger.info('User not found in public.users, attempting to sync from auth.users...')
              
              try {
                // Appeler la fonction RPC pour synchroniser
                const { data: syncResult, error: syncError } = await supabase.rpc(
                  'sync_user_from_auth',
                  { user_id: session.user.id }
                )

                if (syncError) {
                  logger.error('Error syncing user:', syncError)
                  // Ne pas throw, on continue avec null pour éviter de bloquer l'app
                } else if ((syncResult as { success?: boolean })?.success) {
                  logger.info('User synced successfully, refetching...', { syncResult })
                  
                  // Attendre un peu pour s'assurer que l'utilisateur est disponible
                  await new Promise(resolve => setTimeout(resolve, 100))
                  
                  // Refetch l'utilisateur après synchronisation
                  const { data: syncedUser, error: refetchError } = await supabase
                    .from('users')
                    .select('id, organization_id, email, full_name, phone, avatar_url, role, permissions, is_active, last_login_at, created_at, updated_at, theme_preference')
                    .eq('id', session.user.id)
                    .maybeSingle()
                  
                  if (refetchError) {
                    logger.error('Error refetching synced user:', refetchError)
                    // Invalider le cache pour forcer un nouveau fetch
                    queryClient.invalidateQueries({ queryKey: ['user', session.user.id] })
                    return null
                  } else if (syncedUser) {
                    logger.info('Synced user retrieved successfully:', { id: syncedUser.id, email: syncedUser.email, hasOrg: !!syncedUser.organization_id })
                    // Retourner l'utilisateur synchronisé - React Query mettra à jour le cache automatiquement
                    return syncedUser
                  } else {
                    logger.warn('User sync succeeded but refetch returned null - invalidating cache and retrying...')
                    // Si le refetch retourne null, invalider le cache et laisser React Query refetch
                    queryClient.invalidateQueries({ queryKey: ['user', session.user.id] })
                    return null
                  }
                }
              } catch (syncException) {
                logger.error('Exception during user sync:', syncException)
              }
              
              // Si la synchronisation a échoué, retourner null
              return null
            }

            if (!data) {
              return null
            }

            // Récupération automatique de l'organisation si absente (ex: après récupération de compte)
            if (!data.organization_id && session?.user?.id) {
              try {
                const { data: recoverResult, error: recoverError } = await supabase.rpc(
                  'recover_user_organization',
                  { p_user_id: session.user.id }
                )
                const result = recoverResult as { success?: boolean; organization_id?: string } | null
                if (!recoverError && result?.success && result?.organization_id) {
                  logger.info('Organization recovered from auth metadata', { organizationId: result.organization_id })
                  const { data: refetched } = await supabase
                    .from('users')
                    .select('id, organization_id, email, full_name, phone, avatar_url, role, permissions, is_active, last_login_at, created_at, updated_at, theme_preference')
                    .eq('id', session.user.id)
                    .maybeSingle()
                  if (refetched) {
                    queryClient.invalidateQueries({ queryKey: ['user', session.user.id] })
                    return refetched
                  }
                }
              } catch (e) {
                logger.warn('Recover organization failed', e as Error)
              }
            } else if (!data.organization_id) {
              logger.warn('User exists but has no organization_id')
            }

            return data
          })

        return (await Promise.race([userPromise, timeoutPromise])) as UserRow
      } catch (err) {
        // En cas d'erreur ou de timeout, retourner null pour ne pas bloquer
        return null
      }
    },
    enabled: !!session?.user?.id && !sessionLoading,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Récharger l'utilisateur (et organization_id) au montage après hard refresh
    staleTime: 1000 * 60 * 5, // Cache pendant 5 minutes
  })

  // Connexion
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      return data
    },
    onSuccess: async () => {
      // Invalider les queries pour forcer le rechargement
      queryClient.invalidateQueries({ queryKey: ['session'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      
      // Attendre un peu pour que la session soit mise à jour
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Rediriger vers le dashboard (le dashboard détectera automatiquement le rôle)
      router.push('/dashboard')
    },
  })

  // Inscription
  const registerMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      organizationName,
    }: {
      email: string
      password: string
      fullName: string
      organizationName: string
    }) => {
      // 1. Créer l'utilisateur dans auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (authError) {
        logger.error('Auth signup error', new Error(authError.message), {
          status: authError.status,
        })
        
        // Gérer l'erreur de rate limiting
        if (authError.status === 429 || authError.message?.includes('2 seconds')) {
          throw new Error('Trop de tentatives. Veuillez attendre quelques secondes avant de réessayer.')
        }
        
        throw new Error(authError.message || 'Erreur lors de la création du compte')
      }
      if (!authData.user) throw new Error('Erreur lors de la création du compte')

      // Avec Supabase, signUp peut retourner null pour la session si l'email nécessite une confirmation
      // On essaie de récupérer la session de plusieurs façons
      let currentSession: { user: User } | null = authData.session
      
      // Si pas de session immédiatement, attendre un peu et réessayer via getUser()
      if (!currentSession) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const { data: { user: userFromGetUser } } = await supabase.auth.getUser()
        if (userFromGetUser) currentSession = { user: userFromGetUser }
      }

      if (!currentSession && authData.user) {
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
        currentSession = refreshedSession
      }

      if (!currentSession) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const { data: { user: userFromGetUser } } = await supabase.auth.getUser()
        if (userFromGetUser) currentSession = { user: userFromGetUser }
      }

      // Si toujours pas de session, mais qu'on a un user, on continue quand même
      // (certaines configurations Supabase nécessitent une confirmation email)
      if (!currentSession && !authData.user) {
        throw new Error('Erreur : la session n\'a pas pu être établie. Vérifiez votre email pour confirmer votre compte si nécessaire.')
      }

      // Utiliser l'ID utilisateur (de la session ou de authData)
      const userId = currentSession?.user?.id || authData.user.id

      // 2. Créer l'organisation en utilisant la fonction SQL (bypass RLS)
      const orgCode = organizationName.toUpperCase().replace(/\s+/g, '').slice(0, 6)
      
      // Essayer d'abord avec la fonction SQL (si elle existe)
      let orgId: string | null = null
      let funcError: any = null
      
      // Utiliser userId au lieu de vérifier la session (on a déjà userId ci-dessus)
      if (!userId) {
        throw new Error('Erreur : impossible d\'obtenir l\'ID utilisateur')
      }
      
      // Essayer d'abord avec la fonction SQL
      try {
        // Appeler la fonction avec user_id en paramètre pour contourner le problème de session
        const { data: funcResult, error: rpcError } = await supabase.rpc(
          'create_organization_for_user',
          {
            org_name: organizationName,
            org_code: orgCode,
            org_type: 'primary',
            org_country: 'SN',
            org_currency: 'XOF',
            org_language: 'fr',
            org_timezone: 'Africa/Dakar',
            user_id: userId,
          }
        )
        
        if (rpcError) {
          funcError = rpcError
          
          // Si l'erreur est "User must be authenticated", essayer sans user_id
          if (rpcError.code === 'P0001' && rpcError.message?.includes('User must be authenticated')) {
            const retryResult = await supabase.rpc(
              'create_organization_for_user',
              {
                org_name: organizationName,
                org_code: orgCode,
                org_type: 'primary',
                org_country: 'SN',
                org_currency: 'XOF',
                org_language: 'fr',
                org_timezone: 'Africa/Dakar',
              }
            )
            
            if (retryResult.error) {
              funcError = retryResult.error
            } else if (retryResult.data) {
              orgId = retryResult.data as string
            }
          }
        } else if (funcResult) {
          orgId = funcResult as string
        }
      } catch (funcErr) {
        funcError = funcErr
      }

      // Si la fonction n'a pas fonctionné, essayer l'insertion directe
      let org: any = null
      if (!orgId) {
        const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
            name: organizationName,
            code: orgCode,
            type: 'primary' as const,
            country: 'SN',
            currency: 'XOF',
            language: 'fr',
            timezone: 'Africa/Dakar',
            subscription_tier: 'free' as const,
            subscription_status: 'active' as const,
            settings: {} as Organization['settings'],
          })
          .select('id, name, code')
          .single()

        if (orgError) {
          logger.error('Organization creation error:', orgError)
          logger.error('Error details:', {
            code: orgError.code,
            message: orgError.message,
            details: orgError.details,
            hint: orgError.hint,
          })
          
          // Si c'est une erreur RLS, donner des instructions plus claires
          if (orgError.code === '42501') {
            throw new Error(
              'Erreur de sécurité (RLS) : Impossible de créer l\'organisation. ' +
              'Les politiques RLS bloquent la création. ' +
              'INSTRUCTIONS : ' +
              '1. Exécutez le script supabase/create_organization_function.sql dans Supabase SQL Editor ' +
              '2. OU exécutez le script supabase/fix_rls_urgent.sql pour corriger les politiques RLS ' +
              '3. Attendez quelques secondes puis réessayez'
            )
          }
          
          throw new Error(`Impossible de créer l'organisation : ${orgError.message}`)
        }
        
        org = orgData
        orgId = orgData?.id
      } else {
        // L'organisation a été créée par la fonction SQL, on utilise directement orgId
        // Pas besoin de récupérer l'organisation car RLS peut bloquer
        // On créera un objet minimal avec les données qu'on a
        org = {
          id: orgId,
          name: organizationName,
          code: orgCode,
        }
      }

      if (!orgId) {
        throw new Error('Erreur : l\'organisation n\'a pas été créée correctement')
      }
      
      // Utiliser orgId au lieu de org.id
      const finalOrgId = orgId || org?.id
      if (!finalOrgId) {
        throw new Error('Erreur : impossible d\'obtenir l\'ID de l\'organisation')
      }

      // 3. Créer l'utilisateur dans la table users en utilisant une fonction SQL (bypass RLS)
      type CreatedUserRow = { id: string; organization_id?: string; email?: string; full_name?: string; role?: string }
      let createdUser: CreatedUserRow | null = null
      let userError: { code?: string; message?: string } | null = null
      
      try {
        // Essayer d'abord avec la fonction SQL (RPC peut être absent des types générés)
        const { data: createdUserId, error: rpcUserError } = await (supabase as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { code?: string; message?: string } | null }> }).rpc(
          'create_user_for_organization',
          {
            user_id: userId,
            user_email: email,
            user_full_name: fullName,
            organization_id: finalOrgId,
          }
        )
        
        if (rpcUserError) {
          userError = rpcUserError
          
          // Si la fonction n'existe pas, essayer l'insertion directe
          if (rpcUserError.code === '42883') {
            
            const { data: userData, error: directUserError } = await supabase
              .from('users')
              .insert({
                id: userId,
                organization_id: finalOrgId,
                email,
                full_name: fullName,
                role: 'admin',
                is_active: true,
              })
              .select('id, organization_id, email, full_name, role')
        .single()

            if (directUserError) {
              userError = directUserError
            } else {
              createdUser = userData
            }
          }
        } else if (createdUserId) {
          // L'utilisateur a été créé, créer un objet minimal
          createdUser = {
            id: createdUserId,
            organization_id: finalOrgId,
            email,
            full_name: fullName,
            role: 'admin',
          }
        }
      } catch (userErr) {
        userError = userErr && typeof userErr === 'object' && 'code' in userErr
          ? (userErr as { code?: string; message?: string })
          : userErr instanceof Error
            ? { code: undefined, message: userErr.message }
            : { code: undefined, message: String(userErr) }
      }

      if (userError) {
        // Si l'erreur est RLS, donner des instructions
        if (userError.code === '42501') {
          throw new Error(
            'Erreur RLS lors de la création de l\'utilisateur. ' +
            'Exécutez le script supabase/create_user_function.sql dans Supabase SQL Editor, ' +
            'ou utilisez supabase/fix_existing_user.sql pour créer l\'utilisateur manuellement.'
          )
        }
        
        throw userError
      }

      if (!createdUser) {
        throw new Error('Erreur : l\'utilisateur n\'a pas été créé')
      }

      if (!createdUser?.organization_id) {
        throw new Error('Erreur : l\'utilisateur n\'a pas d\'organization_id')
      }

      // Stocker organization_id dans les métadonnées auth pour récupération future (connexion, sync)
      try {
        await supabase.auth.updateUser({
          data: { organization_id: finalOrgId },
        })
      } catch (metaErr) {
        logger.warn('Could not store organization_id in auth metadata (recovery may not work)', metaErr as Error)
      }

      // 4. Invalider les queries pour forcer le rechargement
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['session'] })

      if (!currentSession) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const { data: { user: userFromGetUser } } = await supabase.auth.getUser()
        if (userFromGetUser) {
          return { ...authData, session: { user: userFromGetUser } }
        }
      }

      return authData
    },
    onSuccess: async (authData) => {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      queryClient.invalidateQueries({ queryKey: ['session'] })
      if (authData.user) {
        queryClient.invalidateQueries({ queryKey: ['user', authData.user.id] })
      }

      if (authUser) {
        router.push('/dashboard/onboarding')
      } else {
        router.push('/auth/login?message=confirm-email')
      }
    },
  })

  // Déconnexion
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // Laisser le temps au client Supabase SSR d’écrire la suppression des cookies
      if (typeof window !== 'undefined') {
        await new Promise((r) => setTimeout(r, 200))
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['session'], null)
      queryClient.removeQueries({ queryKey: ['user'] })
      queryClient.clear()
      if (typeof window !== 'undefined') {
        window.location.replace('/auth/login')
      } else {
        router.refresh()
        router.push('/auth/login')
      }
    },
    onError: () => {
      // Même en cas d’erreur (ex. réseau), on quitte le dashboard
      queryClient.setQueryData(['session'], null)
      queryClient.clear()
      if (typeof window !== 'undefined') {
        window.location.replace('/auth/login')
      }
    },
  })

  // Écouter les changements d'auth et mettre à jour avec un utilisateur vérifié (getUser)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event) => {
      const { data: { user } } = await supabase.auth.getUser()
      const sessionLike = user ? { user } : null
      queryClient.setQueryData(['session'], sessionLike)
      if (!user) {
        queryClient.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, queryClient])

  const isLoading = sessionLoading || userLoading

  // Déconnexion : redirection vers la route serveur /auth/logout qui vide les cookies puis redirige vers /auth/login
  const logout = () => {
    queryClient.setQueryData(['session'], null)
    queryClient.clear()
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/logout'
    } else {
      router.push('/auth/logout')
    }
  }

  return {
    session,
    user,
    isLoading,
    isAuthenticated: !!session,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  }
}

