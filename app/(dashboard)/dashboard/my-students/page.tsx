'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users, Search, Mail, Phone, Calendar, 
  GraduationCap, ClipboardList, Eye, CheckCircle2,
  AlertCircle, Clock, BookOpen, Award, PlayCircle
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from '@/components/ui/motion'
import { formatDate, cn } from '@/lib/utils'
import { useVocabulary } from '@/lib/hooks/use-vocabulary'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function MyStudentsPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const vocab = useVocabulary() || { students: 'apprenants' } // Fallback si vocab est null
  const [searchQuery, setSearchQuery] = useState('')

  // Récupérer les sessions où l'enseignant est intervenant
  // Avec fallback via sessions.teacher_id si session_teachers est vide
  const { data: teacherSessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['teacher-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      // D'abord, essayer via session_teachers
      const { data: sessionTeachers, error: sessionTeachersError } = await supabase
        .from('session_teachers')
        .select('session_id')
        .eq('teacher_id', user.id)
      
      if (sessionTeachersError) {
        logger.error('Erreur récupération session_teachers:', sessionTeachersError)
      }
      
      if (sessionTeachers && sessionTeachers.length > 0) {
        logger.debug('MyStudentsPage - Sessions trouvées via session_teachers', {
          count: sessionTeachers.length,
          sessionTeachers
        })
        
        // Récupérer les IDs de sessions
        const sessionIds = sessionTeachers.map((st: any) => st.session_id).filter(Boolean)
        
        if (sessionIds.length === 0) {
          logger.debug('MyStudentsPage - Aucun session_id valide dans session_teachers, passage au fallback')
          // Pas de sessions valides, passer au fallback
        } else {
          logger.debug('MyStudentsPage - Récupération des sessions depuis session_teachers', {
            sessionIds,
            count: sessionIds.length
          })
          
          // Récupérer les sessions sans relations imbriquées
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('sessions')
            .select('id, name, start_date, end_date, status, formation_id')
            .in('id', sessionIds)
          
          if (sessionsError) {
            logger.error('MyStudentsPage - Erreur récupération sessions depuis session_teachers:', sessionsError)
          }
          
          if (sessionsData && sessionsData.length > 0) {
            logger.debug('MyStudentsPage - Sessions récupérées depuis session_teachers', {
              count: sessionsData.length
            })
            // Enrichir avec les formations si nécessaire
            const formationIds = [...new Set(sessionsData.map((s: any) => s.formation_id).filter(Boolean))]
            const formationsMap = new Map()
            
            if (formationIds.length > 0) {
              const { data: formationsData } = await supabase
                .from('formations')
                .select('id, name')
                .in('id', formationIds)
              
              if (formationsData) {
                formationsData.forEach((f: any) => formationsMap.set(f.id, f))
              }
            }
            
            // Retourner au format attendu
            return sessionsData.map((session: any) => ({
              session_id: session.id,
              sessions: {
                ...session,
                formations: session.formation_id ? formationsMap.get(session.formation_id) || null : null
              }
            }))
          }
        }
      }
      
      // Fallback : récupérer via sessions.teacher_id
      // Note: Ce fallback est normal si session_teachers n'est pas encore synchronisé
      logger.debug('MyStudentsPage - session_teachers vide, utilisation du fallback via sessions.teacher_id', {
        userId: user.id
      })
      const { data: sessionsByTeacherId, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date, status, formation_id')
        .eq('teacher_id', user.id)
      
      if (sessionsError) {
        logger.error('MyStudentsPage - Erreur récupération sessions via teacher_id:', sessionsError, {
          userId: user.id,
          errorDetails: sanitizeError(sessionsError)
        })
        return []
      }
      
      if (!sessionsByTeacherId || sessionsByTeacherId.length === 0) {
        logger.debug('MyStudentsPage - Aucune session trouvée via teacher_id', {
          userId: user.id
        })
        return []
      }
      
      logger.debug('MyStudentsPage - Sessions récupérées via teacher_id', {
        count: sessionsByTeacherId.length,
        sessions: sessionsByTeacherId.map((s: any) => ({ id: s.id, name: s.name }))
      })
      
      // Enrichir avec les formations si nécessaire
      const formationIds = [...new Set(sessionsByTeacherId.map((s: any) => s.formation_id).filter(Boolean))]
      const formationsMap = new Map()
      
      if (formationIds.length > 0) {
        const { data: formationsData } = await supabase
          .from('formations')
          .select('id, name')
          .in('id', formationIds)
        
        if (formationsData) {
          formationsData.forEach((f: any) => formationsMap.set(f.id, f))
        }
      }
      
      // Convertir au format attendu (comme session_teachers) avec formations enrichies
      return sessionsByTeacherId.map((session: any) => ({
        session_id: session.id,
        sessions: {
          ...session,
          formations: session.formation_id ? formationsMap.get(session.formation_id) || null : null
        }
      }))
    },
    enabled: !!user?.id,
    staleTime: 0, // Toujours considérer les données comme obsolètes
    gcTime: 0, // Ne pas mettre en cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Récupérer les apprenants des sessions de l'enseignant
  const { data: myStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['my-students', user?.id, teacherSessions],
    queryFn: async () => {
      if (!user?.id) {
        logger.debug('MyStudentsPage - Pas d\'utilisateur, retour tableau vide')
        return []
      }
      
      if (!teacherSessions || teacherSessions.length === 0) {
        logger.debug('MyStudentsPage - Pas de sessions, retour tableau vide', {
          teacherSessionsLength: teacherSessions?.length || 0,
          teacherSessions
        })
        return []
      }
      
      logger.debug('MyStudentsPage - Sessions récupérées', {
        count: teacherSessions.length,
        sessions: teacherSessions.map((ts: any) => ({
          session_id: ts.session_id,
          sessions_id: ts.sessions?.id,
          id: ts.id
        }))
      })
      
      // Filtrer les sessionIds valides (non null/undefined et format UUID valide)
      // Gérer les deux formats : session_id direct ou via sessions.id (relation)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const sessionIds = teacherSessions
        .map((ts: any) => {
          // Essayer session_id d'abord, puis sessions.id si c'est une relation
          return ts.session_id || ts.sessions?.id || ts.id
        })
        .filter((id: any) => {
          if (!id || id === null || id === undefined) return false
          // Valider le format UUID
          return typeof id === 'string' && uuidRegex.test(id)
        })
      
      if (sessionIds.length === 0) {
        logger.warn('MyStudentsPage - Aucun session_id valide après filtrage', {
          teacherSessionsRaw: teacherSessions
        })
        return []
      }
      
      logger.debug('MyStudentsPage - Récupération apprenants', {
        sessionIds,
        count: sessionIds.length,
        userId: user.id
      })
      
      // Récupérer d'abord les enrollments sans relations pour éviter les erreurs 400
      // Ensuite enrichir avec les données des sessions et étudiants
      const BATCH_SIZE = 20
      const allEnrollments: any[] = []
      
      logger.debug('MyStudentsPage - Début récupération enrollments', {
        totalSessionIds: sessionIds.length,
        sessionIds: sessionIds.slice(0, 5), // Log les 5 premiers pour debug
        userId: user.id
      })
      
      for (let i = 0; i < sessionIds.length; i += BATCH_SIZE) {
        const batch = sessionIds.slice(i, i + BATCH_SIZE)
        
        logger.debug('MyStudentsPage - Récupération enrollments pour batch', {
          batchIndex: i,
          batchSize: batch.length,
          batch
        })
        
        // Requête simplifiée sans relations imbriquées
        // Récupérer tous les statuts pour voir ce qui est disponible
        // Ne pas filtrer par statut dans la requête pour voir tous les enrollments disponibles
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('id, status, enrollment_date, session_id, student_id')
          .in('session_id', batch)
        
        // Filtrer côté client pour exclure les statuts invalides
        // Accepter tous les statuts sauf 'cancelled', 'rejected', 'dropped'
        // Cela permet de voir dans les logs si des enrollments existent avec d'autres statuts
        
        if (enrollmentsError) {
          logger.error('MyStudentsPage - Erreur récupération enrollments (batch):', enrollmentsError, { 
            batch,
            batchIndex: i,
            batchSize: batch.length,
            errorDetails: sanitizeError(enrollmentsError),
            errorCode: enrollmentsError.code,
            errorMessage: enrollmentsError.message
          })
          continue
        }
        
        logger.debug('MyStudentsPage - Enrollments récupérés pour batch', {
          batchIndex: i,
          count: enrollmentsData?.length || 0,
          enrollments: enrollmentsData,
          statuses: enrollmentsData?.map((e: any) => e.status) || []
        })
        
        if (!enrollmentsData || enrollmentsData.length === 0) {
          logger.warn('MyStudentsPage - Aucun enrollment pour ce batch', {
            batchIndex: i,
            batch,
            batchSize: batch.length,
            userId: user.id,
            userRole: user.role,
            organizationId: user.organization_id || undefined,
            // Tester si on peut au moins compter les enrollments (pour vérifier RLS)
            testQuery: 'Tentative de compter les enrollments pour diagnostiquer RLS'
          })
          
          // Test supplémentaire : essayer de compter les enrollments pour voir si c'est un problème RLS
          const { count: enrollmentCount, error: countError } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .in('session_id', batch)
          
          logger.debug('MyStudentsPage - Test comptage enrollments (diagnostic RLS)', {
            batchIndex: i,
            batch,
            enrollmentCount,
            countError: countError ? sanitizeError(countError) : null,
            hasRLSBlock: countError?.code === 'PGRST116' || countError?.message?.includes('RLS')
          })
          
          continue
        }
        
        // Filtrer pour exclure les statuts invalides (cancelled, rejected, dropped)
        // Accepter tous les autres statuts (active, confirmed, pending, completed, etc.)
        const invalidStatuses = ['cancelled', 'rejected', 'dropped']
        const validEnrollments = enrollmentsData.filter((e: any) => {
          const status = e.status?.toLowerCase()
          return status && !invalidStatuses.includes(status)
        })
        
        if (validEnrollments.length === 0) {
          logger.debug('MyStudentsPage - Aucun enrollment valide pour ce batch', {
            batchIndex: i,
            batch,
            totalEnrollments: enrollmentsData.length,
            statuses: [...new Set(enrollmentsData.map((e: any) => e.status))],
            invalidStatuses
          })
          continue
        }
        
        logger.debug('MyStudentsPage - Enrollments valides filtrés', {
          batchIndex: i,
          validCount: validEnrollments.length,
          totalCount: enrollmentsData.length,
          statuses: [...new Set(validEnrollments.map((e: any) => e.status))]
        })
        
        // Récupérer les IDs uniques pour enrichir
        const uniqueSessionIds = [...new Set(validEnrollments.map((e: any) => e.session_id).filter(Boolean))]
        const uniqueStudentIds = [...new Set(validEnrollments.map((e: any) => e.student_id).filter(Boolean))]
        
        // Récupérer les sessions (avec batching si nécessaire, sans relations imbriquées)
        const allSessionsData: any[] = []
        for (let j = 0; j < uniqueSessionIds.length; j += BATCH_SIZE) {
          const sessionBatch = uniqueSessionIds.slice(j, j + BATCH_SIZE)
          const { data: sessionsData } = await supabase
            .from('sessions')
            .select('id, name, start_date, end_date, formation_id')
            .in('id', sessionBatch)
          
          if (sessionsData) {
            allSessionsData.push(...sessionsData)
          }
        }
        
        // Enrichir avec les formations si nécessaire
        const formationIds = [...new Set(allSessionsData.map((s: any) => s.formation_id).filter(Boolean))]
        const formationsMap = new Map()
        if (formationIds.length > 0) {
          for (let j = 0; j < formationIds.length; j += BATCH_SIZE) {
            const formationBatch = formationIds.slice(j, j + BATCH_SIZE)
            const { data: formationsData } = await supabase
              .from('formations')
              .select('id, name')
              .in('id', formationBatch)
            
            if (formationsData) {
              formationsData.forEach((f: any) => formationsMap.set(f.id, f))
            }
          }
        }
        
        // Enrichir les sessions avec les formations
        const enrichedSessionsData = allSessionsData.map((session: any) => ({
          ...session,
          formations: session.formation_id ? formationsMap.get(session.formation_id) || null : null
        }))
        
        // Récupérer les étudiants (avec batching si nécessaire)
        const allStudentsData: any[] = []
        for (let j = 0; j < uniqueStudentIds.length; j += BATCH_SIZE) {
          const studentBatch = uniqueStudentIds.slice(j, j + BATCH_SIZE)
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, first_name, last_name, email, phone, status, photo_url')
            .in('id', studentBatch)
          
          if (studentsData) {
            allStudentsData.push(...studentsData)
          }
        }
        
        // Créer des maps pour un accès rapide
        const sessionsMap = new Map(enrichedSessionsData.map((s: any) => [s.id, s]))
        const studentsMap = new Map(allStudentsData.map((s: any) => [s.id, s]))
        
        // Enrichir les enrollments avec les données des sessions et étudiants
        const enrichedEnrollments = validEnrollments.map((enrollment: any) => ({
          ...enrollment,
          enrolled_at: enrollment.enrollment_date, // Mapper pour compatibilité
          sessions: sessionsMap.get(enrollment.session_id) || null,
          students: studentsMap.get(enrollment.student_id) || null
        }))
        
        allEnrollments.push(...enrichedEnrollments)
      }
      
      if (allEnrollments.length === 0) {
        logger.warn('MyStudentsPage - Aucun apprenant trouvé pour les sessions de l\'enseignant', {
          sessionIds,
          sessionIdsCount: sessionIds.length,
          userId: user.id
        })
      } else {
        logger.debug('MyStudentsPage - Apprenants récupérés avec succès', {
          count: allEnrollments.length,
          sessionIds,
          sampleEnrollments: allEnrollments.slice(0, 3).map((e: any) => ({
            id: e.id,
            student_id: e.student_id,
            session_id: e.session_id,
            student_name: e.students?.first_name + ' ' + e.students?.last_name
          }))
        })
      }
      
      return allEnrollments
    },
    enabled: !!user?.id && teacherSessions && teacherSessions.length > 0,
    staleTime: 0, // Toujours considérer les données comme obsolètes
    gcTime: 0, // Ne pas mettre en cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Récupérer les statistiques d'émargement pour chaque apprenant
  // Filtrées uniquement pour les sessions assignées à l'enseignant
  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats', user?.id, myStudents, teacherSessions],
    queryFn: async () => {
      if (!myStudents || myStudents.length === 0 || !teacherSessions || teacherSessions.length === 0) return {}
      
      // Valider et filtrer les IDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const studentIds = myStudents
        .map((e: any) => e.students?.id)
        .filter((id: any) => id && typeof id === 'string' && uuidRegex.test(id))
      
      const sessionIds = teacherSessions
        .map((ts: any) => {
          // Essayer session_id d'abord, puis sessions.id si c'est une relation
          return ts.session_id || ts.sessions?.id || ts.id
        })
        .filter((id: any) => id && typeof id === 'string' && uuidRegex.test(id))
      
      if (sessionIds.length === 0 || studentIds.length === 0) return {}
      
      // Diviser en lots pour éviter les erreurs 400
      const BATCH_SIZE = 50
      const allAttendance: any[] = []
      
      // Traiter par lots de sessions
      for (let i = 0; i < sessionIds.length; i += BATCH_SIZE) {
        const sessionBatch = sessionIds.slice(i, i + BATCH_SIZE)
        
        // Pour chaque lot de sessions, traiter par lots d'étudiants
        for (let j = 0; j < studentIds.length; j += BATCH_SIZE) {
          const studentBatch = studentIds.slice(j, j + BATCH_SIZE)
          
          const { data, error } = await supabase
            .from('attendance')
            .select('student_id, status, session_id')
            .in('student_id', studentBatch)
            .in('session_id', sessionBatch)
          
          if (error) {
            logger.error('Erreur récupération émargements (batch):', error, {
              sessionBatch,
              studentBatch,
              errorDetails: sanitizeError(error)
            })
            continue
          }
          
          if (data) {
            allAttendance.push(...data)
          }
        }
      }
      
      // Calculer les statistiques par apprenant (uniquement pour les sessions assignées)
      const stats: Record<string, { present: number; absent: number; late: number; total: number }> = {}
      
      allAttendance.forEach((att: any) => {
        if (!stats[att.student_id]) {
          stats[att.student_id] = { present: 0, absent: 0, late: 0, total: 0 }
        }
        stats[att.student_id].total++
        if (att.status === 'present') stats[att.student_id].present++
        else if (att.status === 'absent') stats[att.student_id].absent++
        else if (att.status === 'late') stats[att.student_id].late++
      })
      
      return stats
    },
    enabled: !!myStudents && myStudents.length > 0 && !!teacherSessions && teacherSessions.length > 0,
  })

  // Filtrer les apprenants selon la recherche
  const filteredStudents = myStudents?.filter((enrollment: any) => {
    const student = enrollment.students
    if (!student) return false
    
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
    const email = student.email?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    
    return fullName.includes(query) || email.includes(query)
  })

  // Grouper par session
  const studentsBySession: Record<string, any[]> = {}
  filteredStudents?.forEach((enrollment: any) => {
    const sessionId = enrollment.session_id
    if (!studentsBySession[sessionId]) {
      studentsBySession[sessionId] = []
    }
    studentsBySession[sessionId].push(enrollment)
  })

  const getAttendancePercentage = (studentId: string) => {
    const stats = attendanceStats?.[studentId]
    if (!stats || stats.total === 0) return null
    return Math.round((stats.present / stats.total) * 100)
  }

  const getAttendanceColor = (percentage: number | null) => {
    if (percentage === null) return 'text-gray-400'
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoadingSessions || isLoadingStudents) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </div>
    )
  }

  // Protection contre les erreurs de rendu
  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-gray-600">Chargement de l'utilisateur...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Users className="h-8 w-8 text-brand-blue" />
          Mes {vocab?.students || 'apprenants'}
        </h1>
        <p className="text-gray-600">
          Gérez les apprenants qui vous sont assignés dans vos sessions de formation
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-lg">
              <Users className="h-5 w-5 text-brand-blue" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total apprenants</p>
              <p className="text-2xl font-bold text-gray-900">{myStudents?.length || 0}</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sessions actives</p>
              <p className="text-2xl font-bold text-gray-900">
                {teacherSessions?.filter((ts: any) => ts.sessions?.status === 'active' || ts.sessions?.status === 'in_progress').length || 0}
              </p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Taux présence moyen</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats && Object.keys(attendanceStats).length > 0
                  ? Math.round(
                      Object.values(attendanceStats).reduce((sum: number, s: any) => 
                        sum + (s.total > 0 ? (s.present / s.total) * 100 : 0), 0
                      ) / Object.keys(attendanceStats).length
                    ) + '%'
                  : 'N/A'}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Barre de recherche et actions */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un apprenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link href="/dashboard/my-students/elearning">
          <Button variant="outline" className="gap-2">
            <PlayCircle className="h-4 w-4 text-purple-600" />
            Suivi E-Learning
          </Button>
        </Link>
      </div>

      {/* Liste par session */}
      {Object.keys(studentsBySession).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun apprenant assigné
            </h3>
            <p className="text-gray-600">
              Vous n'avez pas encore d'apprenants dans vos sessions de formation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(studentsBySession).map(([sessionId, enrollments], index) => {
            const session = enrollments[0]?.sessions
            const formation = session?.formations
            
            return (
              <motion.div
                key={sessionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-brand-blue" />
                          {session?.name || 'Session'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {formation?.name || 'Formation'} • {session?.start_date ? formatDate(session.start_date) : 'N/A'} - {session?.end_date ? formatDate(session.end_date) : 'N/A'}
                        </CardDescription>
                      </div>
                      <Badge variant={session?.status === 'active' || session?.status === 'in_progress' ? 'default' : 'outline'}>
                        {session?.status === 'active' || session?.status === 'in_progress' ? 'En cours' : session?.status || 'Inconnu'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {enrollments.map((enrollment: any) => {
                        const student = enrollment.students
                        if (!student) return null
                        
                        const attendancePercentage = getAttendancePercentage(student.id)
                        
                        return (
                          <div
                            key={enrollment.id}
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center">
                                {student.photo_url ? (
                                  <img
                                    src={student.photo_url}
                                    alt={`${student.first_name} ${student.last_name}`}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-brand-blue font-medium">
                                    {student.first_name?.[0]}{student.last_name?.[0]}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {student.first_name} {student.last_name}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  {student.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {student.email}
                                    </span>
                                  )}
                                  {student.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {student.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {/* Taux de présence */}
                              <div className="text-right">
                                <p className="text-xs text-gray-500 mb-1">Présence</p>
                                <p className={cn('font-medium', getAttendanceColor(attendancePercentage))}>
                                  {attendancePercentage !== null ? `${attendancePercentage}%` : 'N/A'}
                                </p>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Link href={`/dashboard/attendance?student=${student.id}&session=${sessionId}`}>
                                  <Button variant="ghost" size="sm">
                                    <ClipboardList className="h-4 w-4 mr-1" />
                                    Émargement
                                  </Button>
                                </Link>
                                <Link href={`/dashboard/students/${student.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

