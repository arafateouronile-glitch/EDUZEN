'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

interface CachedData {
  key: string
  data: any
  timestamp: number
  expiresAt: number
}

interface OfflineState {
  isOnline: boolean
  isOfflineReady: boolean
  pendingSyncs: number
}

const CACHE_PREFIX = 'eduzen_offline_'
const DEFAULT_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 jours

/**
 * Hook pour gérer le mode offline de l'application
 */
export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOfflineReady: false,
    pendingSyncs: 0,
  })

  // Écouter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }))
      syncPendingData()
    }

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Vérifier si le cache est prêt
    checkOfflineReadiness()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Vérifier si les données sont disponibles offline
   */
  const checkOfflineReadiness = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
      setState((prev) => ({ ...prev, isOfflineReady: keys.length > 0 }))
    } catch (error) {
      logger.warn('LocalStorage non disponible')
    }
  }, [])

  /**
   * Sauvegarder des données pour utilisation offline
   */
  const cacheData = useCallback((key: string, data: any, duration: number = DEFAULT_CACHE_DURATION) => {
    try {
      const cacheEntry: CachedData = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration,
      }
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheEntry))
      checkOfflineReadiness()
      return true
    } catch (error) {
      logger.error('Erreur lors du cache des données', error as Error)
      return false
    }
  }, [checkOfflineReadiness])

  /**
   * Récupérer des données du cache
   */
  const getCachedData = useCallback(<T>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`)
      if (!cached) return null

      const entry: CachedData = JSON.parse(cached)
      
      // Vérifier l'expiration
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`)
        return null
      }

      return entry.data as T
    } catch (error) {
      logger.error('Erreur lors de la récupération du cache', error as Error)
      return null
    }
  }, [])

  /**
   * Supprimer des données du cache
   */
  const clearCachedData = useCallback((key: string) => {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`)
      checkOfflineReadiness()
    } catch (error) {
      logger.error('Erreur lors de la suppression du cache', error as Error)
    }
  }, [checkOfflineReadiness])

  /**
   * Vider tout le cache offline
   */
  const clearAllCache = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
      keys.forEach((key) => localStorage.removeItem(key))
      setState((prev) => ({ ...prev, isOfflineReady: false }))
    } catch (error) {
      logger.error('Erreur lors du vidage du cache', error as Error)
    }
  }, [])

  /**
   * Sauvegarder une action pour synchronisation ultérieure
   */
  const queueForSync = useCallback((action: {
    type: string
    table: string
    data: any
    method: 'insert' | 'update' | 'delete'
  }) => {
    try {
      const pendingActions = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}pending_sync`) || '[]')
      pendingActions.push({
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem(`${CACHE_PREFIX}pending_sync`, JSON.stringify(pendingActions))
      setState((prev) => ({ ...prev, pendingSyncs: pendingActions.length }))
    } catch (error) {
      logger.error('Erreur lors de la mise en file d\'attente', error as Error)
    }
  }, [])

  /**
   * Synchroniser les données en attente
   */
  const syncPendingData = useCallback(async () => {
    if (!state.isOnline) return

    try {
      const pendingActions = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}pending_sync`) || '[]')
      if (pendingActions.length === 0) return

      const supabase = createClient()
      const failedActions: any[] = []

      for (const action of pendingActions) {
        try {
          switch (action.method) {
            case 'insert':
              await supabase.from(action.table).insert(action.data)
              break
            case 'update':
              await supabase.from(action.table).update(action.data).eq('id', action.data.id)
              break
            case 'delete':
              await supabase.from(action.table).delete().eq('id', action.data.id)
              break
          }
        } catch (error) {
          logger.error(`Erreur sync action ${action.type}`, error as Error)
          failedActions.push(action)
        }
      }

      localStorage.setItem(`${CACHE_PREFIX}pending_sync`, JSON.stringify(failedActions))
      setState((prev) => ({ ...prev, pendingSyncs: failedActions.length }))

      if (failedActions.length === 0) {
        logger.info('Synchronisation terminée avec succès')
      } else {
        logger.warn(`${failedActions.length} actions n'ont pas pu être synchronisées`)
      }
    } catch (error) {
      logger.error('Erreur lors de la synchronisation', error as Error)
    }
  }, [state.isOnline])

  return {
    ...state,
    cacheData,
    getCachedData,
    clearCachedData,
    clearAllCache,
    queueForSync,
    syncPendingData,
  }
}

/**
 * Hook pour mettre en cache les données d'un cours e-learning
 */
export function useOfflineCourse(courseSlug: string) {
  const { cacheData, getCachedData, isOnline, isOfflineReady } = useOffline()
  const supabase = createClient()

  const downloadCourseForOffline = useCallback(async () => {
    try {
      // Récupérer le cours complet
      const { data: course } = await supabase
        .from('courses')
        .select(`
          *,
          course_sections(
            id,
            title,
            order_index,
            lessons(
              id,
              title,
              content,
              lesson_type,
              duration_minutes,
              order_index,
              video_url
            )
          )
        `)
        .eq('slug', courseSlug)
        .single()

      if (!course) throw new Error('Cours introuvable')

      // Mettre en cache le cours
      cacheData(`course_${courseSlug}`, course, 30 * 24 * 60 * 60 * 1000) // 30 jours

      // Mettre en cache les contenus média si possible
      const allLessons = course.course_sections?.flatMap((s: any) => s.lessons || []) || []
      
      for (const lesson of allLessons) {
        if (lesson.content) {
          cacheData(`lesson_${lesson.id}`, lesson)
        }
      }

      logger.info(`Cours "${course.title}" téléchargé pour offline`)
      return true
    } catch (error) {
      logger.error('Erreur lors du téléchargement offline', error as Error)
      return false
    }
  }, [courseSlug, supabase, cacheData])

  const getCachedCourse = useCallback(() => {
    return getCachedData(`course_${courseSlug}`)
  }, [courseSlug, getCachedData])

  const isCourseAvailableOffline = useCallback(() => {
    return getCachedCourse() !== null
  }, [getCachedCourse])

  return {
    isOnline,
    isOfflineReady,
    downloadCourseForOffline,
    getCachedCourse,
    isCourseAvailableOffline,
  }
}





