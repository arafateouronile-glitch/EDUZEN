'use client'

import { useQuery } from '@tanstack/react-query'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { logger } from '@/lib/utils/logger'
import { secureSessionStorage, TTL } from '@/lib/utils/secure-storage'

// Clé pour le stockage sécurisé de l'ID étudiant
const LEARNER_STORAGE_KEY = 'learner_student_id'

type StudentRow = TableRow<'students'> | null

/**
 * Hook pour gérer l'accès étudiant sans authentification
 * Similaire à useAuth() mais pour les étudiants
 */
export function useLearner() {
  const router = useRouter()
  const params = useParams()
  
  // Récupérer l'ID étudiant depuis l'URL ou localStorage
  // IMPORTANT: Ne prendre params.id que si on est sur /learner/access/[id]
  // Sur d'autres routes comme /learner/messages/[id], params.id est l'ID de la conversation, pas l'étudiant
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
  const isAccessRoute = currentPath.startsWith('/learner/access/')
  const studentIdFromUrl = isAccessRoute ? (params?.id as string | undefined) : undefined
  
  const [studentId, setStudentId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      // Essayer d'abord l'URL (pour /learner/access/[id] uniquement)
      if (studentIdFromUrl && isAccessRoute) {
        logger.info('[useLearner] Student ID from URL (access route)', {
          studentId: studentIdFromUrl,
          path: currentPath
        })
        // Utiliser le stockage sécurisé avec expiration de 24h
        secureSessionStorage.set(LEARNER_STORAGE_KEY, studentIdFromUrl, { ttl: TTL.DAY })
        return studentIdFromUrl
      }
      // Sinon, vérifier le stockage sécurisé (pour /learner après redirection ou autres routes)
      const savedStudentId = secureSessionStorage.get<string>(LEARNER_STORAGE_KEY)
      if (savedStudentId) {
        logger.info('[useLearner] Student ID from secure storage', {
          studentId: savedStudentId,
          path: currentPath,
          isAccessRoute
        })
        return savedStudentId
      }
      logger.warn('[useLearner] No student ID found in URL or secure storage', {
        path: currentPath,
        isAccessRoute,
        paramsId: params?.id
      })
      return undefined
    }
    return studentIdFromUrl
  })

  // Mettre à jour si l'URL change (uniquement sur la route /learner/access/[id])
  useEffect(() => {
    if (studentIdFromUrl && isAccessRoute && studentIdFromUrl !== studentId) {
      logger.info('[useLearner] Updating student ID from URL', {
        oldId: studentId,
        newId: studentIdFromUrl,
        path: currentPath
      })
      // Utiliser le stockage sécurisé avec expiration de 24h
      secureSessionStorage.set(LEARNER_STORAGE_KEY, studentIdFromUrl, { ttl: TTL.DAY })
      setStudentId(studentIdFromUrl)
    }
  }, [studentIdFromUrl, studentId, isAccessRoute, currentPath])

  // Récupérer les données de l'étudiant
  const { data: student, isLoading: studentLoading, error: studentError } = useQuery<StudentRow>({
    queryKey: ['learner-student', studentId],
    queryFn: async (): Promise<StudentRow> => {
      if (!studentId) {
        return null
      }
      
      try {
        logger.info('[useLearner] Starting to fetch student', { studentId })
        const supabase = createLearnerClient(studentId)
        
        // Essayer d'abord la requête directe
        logger.info('[useLearner] Trying direct query', { studentId })
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .maybeSingle()

        // Si on a des données, les retourner
        if (data && !error) {
          logger.info('[useLearner] Student found via direct query', { studentId, studentName: `${data.first_name} ${data.last_name}` })
          return data
        }

        // Si erreur ou pas de données, essayer la fonction RPC comme fallback
        logger.warn('[useLearner] Student not found via direct query, trying RPC function', { 
          studentId, 
          error: error?.message, 
          errorCode: error?.code,
          hasData: !!data 
        })
        
        try {
          // Essayer la fonction RPC (retourne un jsonb directement, pas besoin de .single())
          logger.info('[useLearner] Calling RPC function', { 
            studentId,
            studentIdType: typeof studentId,
            studentIdLength: studentId?.length,
            isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId || '')
          })
          
          // Vérifier que studentId est un UUID valide
          if (!studentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)) {
            logger.error('[useLearner] Invalid studentId format for RPC', { studentId })
            return null
          }
          
          // PostgREST peut retourner jsonb de différentes manières
          // Essayer d'abord sans .single(), puis avec si nécessaire
          let rpcData: any = null
          let rpcError: any = null
          
          // PostgREST retourne jsonb directement comme un objet (pas dans un tableau)
          // Donc on n'utilise PAS .single() pour les fonctions RPC qui retournent jsonb
          const { data: rpcDataDirect, error: rpcErrorDirect } = await supabase
            .rpc('get_learner_student', { p_student_id: studentId })
          
          // Log détaillé de la réponse RPC
          const rpcLogDetails = {
            studentId, 
            hasData: !!rpcDataDirect, 
            hasError: !!rpcErrorDirect,
            rpcErrorCode: rpcErrorDirect?.code,
            rpcErrorMessage: rpcErrorDirect?.message,
            rpcDataType: typeof rpcDataDirect,
            rpcDataIsArray: Array.isArray(rpcDataDirect),
            rpcDataIsNull: rpcDataDirect === null,
            rpcDataIsUndefined: rpcDataDirect === undefined,
            rpcDataStringified: rpcDataDirect ? JSON.stringify(rpcDataDirect).substring(0, 200) : 'null',
            rpcDataValue: rpcDataDirect
          }
          
          logger.info('[useLearner] RPC response (direct)', rpcLogDetails)
          
          // Si on a une erreur, l'utiliser
          if (rpcErrorDirect) {
            rpcError = rpcErrorDirect
          } else {
            // PostgREST retourne jsonb directement comme un objet (pas un tableau)
            // Si la fonction retourne NULL, PostgREST retourne null
            // Si la fonction retourne jsonb, PostgREST retourne l'objet directement
            rpcData = rpcDataDirect
            
            // Si c'est un tableau (ne devrait pas arriver avec jsonb, mais on vérifie quand même)
            if (Array.isArray(rpcDataDirect)) {
              rpcData = rpcDataDirect.length > 0 ? rpcDataDirect[0] : null
              logger.info('[useLearner] RPC returned array (unexpected), taking first element', { 
                arrayLength: rpcDataDirect.length,
                firstElement: rpcData
              })
            }
          }
          
          if (rpcError) {
            logger.error('[useLearner] Error fetching student via RPC', rpcError as Error, { 
              studentId, 
              rpcErrorCode: rpcError.code, 
              rpcErrorMessage: rpcError.message,
              rpcErrorDetails: rpcError.details,
              rpcErrorHint: rpcError.hint
            })
            return null
          }
          
          // Vérifier si on a des données valides
          // La fonction peut retourner null si l'étudiant n'existe pas
          if (rpcData === null || rpcData === undefined) {
            logger.warn('[useLearner] Student not found via RPC (null response)', { 
              studentId,
              rpcData,
              rpcDataType: typeof rpcData,
              note: "L'étudiant n'existe peut-être pas dans la base de données avec cet ID"
            })
            return null
          }
          
          // Vérifier si c'est un objet vide
          if (typeof rpcData === 'object' && Object.keys(rpcData).length === 0) {
            logger.warn('[useLearner] Student not found via RPC (empty object)', { 
              studentId,
              rpcData
            })
            return null
          }
          
          // Convertir le jsonb en StudentRow
          const studentData = rpcData as StudentRow
          
          logger.info('[useLearner] Student found via RPC function', { 
            studentId, 
            studentName: studentData?.first_name && studentData?.last_name ? `${studentData.first_name} ${studentData.last_name}` : 'Unknown',
            studentIdFromData: studentData?.id,
            hasEmail: !!studentData?.email
          })
          return studentData
        } catch (rpcErr) {
          logger.error('[useLearner] Exception calling RPC function', rpcErr as Error, { 
            studentId,
            errorMessage: rpcErr instanceof Error ? rpcErr.message : String(rpcErr),
            errorStack: rpcErr instanceof Error ? rpcErr.stack : undefined
          })
          return null
        }
      } catch (err) {
        logger.error('[useLearner] Exception fetching student', err as Error, { studentId })
        return null
      }
    },
    enabled: !!studentId,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 5, // Cache pendant 5 minutes
  })

  const isLoading = studentLoading
  const hasStudent = !!student && !!studentId

  return {
    student,
    studentId,
    isLoading,
    hasStudent,
    error: studentError,
    // Helper pour récupérer l'organization_id facilement
    organizationId: student?.organization_id || null,
  }
}

