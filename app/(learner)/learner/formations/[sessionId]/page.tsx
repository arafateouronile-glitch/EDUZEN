'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { useAuth } from '@/lib/hooks/use-auth'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion } from '@/components/ui/motion'
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Download,
  Video,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Award,
  ClipboardCheck,
  TrendingUp,
  Mail,
  Phone,
  User,
  Building2,
  Target,
  BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export default function LearnerSessionDetailPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])
  
  const { user } = useAuth()
  
  const { data: student } = useQuery({
    queryKey: ['learner-student', user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) {
          return null
        }
        if (!supabase) return null
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        return data
      } catch (err) {
        logger.warn('Exception fetching student data', {
          userId: user?.id ? maskId(user.id) : undefined,
          error: sanitizeError(err),
        })
        return null
      }
    },
    enabled: !!user?.id,
  })

  // Récupérer la session
  const { data: session, isLoading } = useQuery({
    queryKey: ['learner-session-detail', sessionId],
    queryFn: async () => {
      if (!supabase) return null
      
      try {
        // Essayer d'abord avec formations (colonnes de base uniquement)
        let { data, error } = await supabase
          .from('sessions')
          .select(`
            *,
            formations(
              id,
              name,
              description,
              price
            )
          `)
          .eq('id', sessionId)
          .maybeSingle()
        
        // Si erreur, essayer sans formations
        if (error) {
          if (error.code === '400' || error.message?.includes('relationship') || error.message?.includes('column') || error.message?.includes('does not exist')) {
            const { data: simpleData, error: simpleError } = await supabase
              .from('sessions')
              .select('*')
              .eq('id', sessionId)
              .maybeSingle()
            
            if (simpleError) {
              if (simpleError.code === 'PGRST116' || simpleError.code === 'PGRST301' || simpleError.code === '42P01') {
                logger.warn('Session not found or access denied', {
                  sessionId: maskId(sessionId),
                  error: sanitizeError(simpleError),
                })
                return null
              }
              logger.warn('Error fetching session (simple)', {
                sessionId: maskId(sessionId),
                error: sanitizeError(simpleError),
              })
              return null
            }
            return simpleData
          }
          
          if (error.code === 'PGRST116' || error.code === 'PGRST301' || error.code === '42P01') {
            logger.warn('Session not found or access denied', {
              sessionId: maskId(sessionId),
              error: sanitizeError(error),
            })
            return null
          }
          logger.warn('Error fetching session', {
            sessionId: maskId(sessionId),
            error: sanitizeError(error),
          })
          return null
        }
        return data
      } catch (error: any) {
        logger.error('Unexpected error fetching session', error, {
          sessionId: maskId(sessionId),
          error: sanitizeError(error),
        })
        return null
      }
    },
    enabled: !!sessionId && !!supabase,
  })

  // Récupérer l'inscription de l'étudiant
  const { data: enrollment } = useQuery({
    queryKey: ['learner-session-enrollment', sessionId, studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return null
      if (!supabase) return null
      
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('*')
          .eq('session_id', sessionId)
          .eq('student_id', studentData.id)
          .maybeSingle()
        
        if (error) {
          if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST301') {
            return null
          }
          logger.warn('Error fetching enrollment', {
            sessionId: maskId(sessionId),
            studentId: studentData?.id ? maskId(studentData.id) : undefined,
            error: sanitizeError(error),
          })
          return null
        }
        return data
      } catch (error: any) {
        logger.error('Unexpected error fetching enrollment', error, {
          sessionId: maskId(sessionId),
          studentId: studentData?.id ? maskId(studentData.id) : undefined,
          error: sanitizeError(error),
        })
        return null
      }
    },
    enabled: !!sessionId && !!studentData?.id && !!supabase,
  })

  // Récupérer les documents de l'étudiant pour cette session
  // Note: La table peut être `generated_documents` avec `related_entity_type` et `related_entity_id`
  const { data: documents } = useQuery({
    queryKey: ['learner-session-documents', sessionId, studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return []
      if (!supabase) return []
      
      try {
        // Commencer directement avec generated_documents car la table documents peut ne pas exister
        // ou ne pas avoir les colonnes session_id/student_id
        const { data: dataGenerated, error: errorGenerated } = await supabase
          .from('generated_documents')
          .select('*')
          .eq('related_entity_type', 'session')
          .eq('related_entity_id', sessionId)
          .order('created_at', { ascending: false })
        
        if (errorGenerated) {
          // Si erreur, essayer avec la table documents (au cas où elle existerait)
          const { data: dataDocuments, error: errorDocuments } = await supabase
            .from('documents')
            .select('*')
            .eq('session_id', sessionId)
            .eq('student_id', studentData.id)
            .order('created_at', { ascending: false })
          
          if (!errorDocuments) {
            return dataDocuments || []
          }
          
          // Si les deux échouent, retourner vide
          logger.warn('Documents/generated_documents tables may not be accessible', {
            sessionId: maskId(sessionId),
            studentId: studentData?.id ? maskId(studentData.id) : undefined,
            error: sanitizeError(errorGenerated),
          })
          return []
        }
        
        // Filtrer côté client pour student_id si présent dans les données
        // generated_documents utilise related_entity_id pour la session, mais peut avoir student_id dans metadata
        const filtered = (dataGenerated || []).filter((doc: any) => {
          // Vérifier si le document est lié à l'étudiant
          if (doc.student_id === studentData.id) return true
          if (doc.related_entity_id === studentData.id) return true
          // Vérifier dans metadata si présent
          if (doc.metadata && typeof doc.metadata === 'object') {
            if (doc.metadata.student_id === studentData.id) return true
            if (doc.metadata.related_entity_id === studentData.id) return true
          }
          // Si pas de student_id spécifique, inclure quand même (documents de session)
          return !doc.student_id
        })
        
        return filtered
      } catch (error: any) {
        logger.error('Unexpected error fetching documents', error, {
          sessionId: maskId(sessionId),
          studentId: studentData?.id ? maskId(studentData.id) : undefined,
          error: sanitizeError(error),
        })
        return []
      }
    },
    enabled: !!sessionId && !!studentData?.id && !!supabase,
  })

  // Récupérer les intervenants (utiliser session_teachers au lieu de session_trainers)
  const { data: trainers } = useQuery({
    queryKey: ['learner-session-trainers', sessionId],
    queryFn: async () => {
      if (!supabase) return []
      
      try {
        // Essayer d'abord avec session_teachers (nom correct de la table) sans relation users
        // Commencer directement sans relation pour éviter les erreurs 400 RLS
        let { data, error } = await (supabase as any)
          .from('session_teachers')
          .select('*')
          .eq('session_id', sessionId)
        
        // Si succès, essayer d'enrichir avec users (mais ne pas échouer si ça rate)
        if (!error && data && data.length > 0) {
          // Essayer d'enrichir avec users pour chaque teacher_id
          // Mais ne pas bloquer si ça échoue
          try {
            const teacherIds = data.map((t: any) => t.teacher_id).filter(Boolean)
            if (teacherIds.length > 0) {
              const { data: usersData } = await supabase
                .from('users')
                .select('id, first_name, last_name, email, avatar_url')
                .in('id', teacherIds)
              
              if (usersData) {
                // Enrichir les données avec users
                data = data.map((teacher: any) => ({
                  ...teacher,
                  users: usersData.find((u: any) => u.id === teacher.teacher_id) || null
                }))
              }
            }
          } catch (enrichError) {
            // Ignorer l'erreur d'enrichissement, on garde les données de base
            logger.warn('Could not enrich teachers with users data', {
              sessionId: maskId(sessionId),
              error: sanitizeError(enrichError),
            })
          }
        }
        
        if (error) {
          // Gérer les erreurs table inexistante ou RLS
          if (
            error.code === 'PGRST116' ||
            error.code === '42P01' ||
            error.code === 'PGRST301' ||
            error.code === 'PGRST205' ||
            error.code === '400' ||
            error.code === '404' ||
            error.message?.includes('relation') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('Could not find the table')
          ) {
            logger.warn('Session teachers table may not exist or be accessible', {
              sessionId: maskId(sessionId),
              error: sanitizeError(error),
            })
            return []
          }
          logger.warn('Error fetching trainers', {
            sessionId: maskId(sessionId),
            error: sanitizeError(error),
          })
          return []
        }

        return data || []
      } catch (error: any) {
        logger.error('Unexpected error fetching trainers', error, {
          sessionId: maskId(sessionId),
          error: sanitizeError(error),
        })
        return []
      }
    },
    enabled: !!sessionId && !!supabase,
  })

  // Récupérer les notes de l'étudiant
  const { data: grades } = useQuery({
    queryKey: ['learner-session-grades', sessionId, studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return []
      if (!supabase) return []
      
      try {
        const { data, error } = await supabase
          .from('grades')
          .select('*')
          .eq('session_id', sessionId)
          .eq('student_id', studentData.id)
          .order('graded_at', { ascending: false })
        
        if (error) {
          if (
            error.code === 'PGRST116' ||
            error.code === '42P01' ||
            error.code === 'PGRST301' ||
            error.code === '400' ||
            error.message?.includes('relation') ||
            error.message?.includes('does not exist')
          ) {
            return []
          }
          logger.warn('Error fetching grades', {
            sessionId: maskId(sessionId),
            studentId: studentData?.id ? maskId(studentData.id) : undefined,
            error: sanitizeError(error),
          })
          return []
        }

        return data || []
      } catch (error: any) {
        logger.error('Unexpected error fetching grades', error, {
          sessionId: maskId(sessionId),
          studentId: studentData?.id ? maskId(studentData.id) : undefined,
          error: sanitizeError(error),
        })
        return []
      }
    },
    enabled: !!sessionId && !!studentData?.id && !!supabase,
  })

  // Récupérer la présence de l'étudiant
  const { data: attendance } = useQuery({
    queryKey: ['learner-session-attendance', sessionId, studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return []
      if (!supabase) return []
      
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('session_id', sessionId)
          .eq('student_id', studentData.id)
          .order('date', { ascending: false })
        
        if (error) {
          if (
            error.code === 'PGRST116' ||
            error.code === '42P01' ||
            error.code === 'PGRST301' ||
            error.code === '400' ||
            error.message?.includes('relation') ||
            error.message?.includes('does not exist')
          ) {
            return []
          }
          logger.warn('Error fetching attendance', {
            sessionId: maskId(sessionId),
            studentId: studentData?.id ? maskId(studentData.id) : undefined,
            error: sanitizeError(error),
          })
          return []
        }

        return data || []
      } catch (error: any) {
        logger.error('Unexpected error fetching attendance', error, {
          sessionId: maskId(sessionId),
          studentId: studentData?.id ? maskId(studentData.id) : undefined,
          error: sanitizeError(error),
        })
        return []
      }
    },
    enabled: !!sessionId && !!studentData?.id && !!supabase,
  })

  const formation = (session as any)?.formations
  const program = formation?.programs

  // Calculer les stats de présence
  const attendanceStats = {
    total: attendance?.length || 0,
    present: attendance?.filter((a: any) => a.status === 'present').length || 0,
    absent: attendance?.filter((a: any) => a.status === 'absent').length || 0,
    late: attendance?.filter((a: any) => a.status === 'late').length || 0,
  }
  const attendanceRate = attendanceStats.total > 0 
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100) 
    : 0

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) return null
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Terminée</Badge>
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-700">Confirmée</Badge>
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700">En attente</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Annulée</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'convocation': return <Mail className="h-5 w-5 text-blue-600" />
      case 'convention': return <FileText className="h-5 w-5 text-purple-600" />
      case 'attestation': return <Award className="h-5 w-5 text-green-600" />
      case 'certificate': return <Award className="h-5 w-5 text-amber-600" />
      default: return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
        <div className="h-12 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Session introuvable</h2>
        <Link href="/learner/formations">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux formations
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/learner/formations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          {program && (
            <p className="text-sm text-brand-blue font-medium mb-1">
              {program.name}
            </p>
          )}
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {formation?.name || session?.name || 'Session'}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            {enrollment && getStatusBadge(enrollment.status)}
            {(session as any)?.is_remote && (
              <Badge variant="outline">
                <Video className="h-3 w-3 mr-1" />
                À distance
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <Calendar className="h-6 w-6 text-brand-blue mx-auto mb-2" />
          <p className="text-sm text-gray-500">Dates</p>
          <p className="font-semibold text-gray-900">
            {session.start_date ? formatDate(session.start_date) : 'N/A'}
          </p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Durée</p>
          <p className="font-semibold text-gray-900">
            Formation
          </p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Présence</p>
          <p className="font-semibold text-gray-900">{attendanceRate}%</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <ClipboardCheck className="h-6 w-6 text-amber-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Évaluations</p>
          <p className="font-semibold text-gray-900">{grades?.length || 0}</p>
        </GlassCard>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/50 backdrop-blur-sm border border-gray-200/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg">Documents</TabsTrigger>
          <TabsTrigger value="progress" className="rounded-lg">Progression</TabsTrigger>
          <TabsTrigger value="trainers" className="rounded-lg">Intervenants</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informations de la session */}
            <GlassCard className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-brand-blue" />
                Informations
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Dates</p>
                    <p className="text-sm text-gray-500">
                      {session.start_date && formatDate(session.start_date)}
                      {session.end_date && session.end_date !== session.start_date && 
                        ` - ${formatDate(session.end_date)}`}
                    </p>
                  </div>
                </div>
                {(session.start_time || session.end_time) && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Horaires</p>
                      <p className="text-sm text-gray-500">
                        {session.start_time}
                        {session.end_time && ` - ${session.end_time}`}
                      </p>
                    </div>
                  </div>
                )}
                {session.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Lieu</p>
                      <p className="text-sm text-gray-500">{session.location}</p>
                    </div>
                  </div>
                )}
                {(session as any)?.meeting_url && (
                  <div className="flex items-start gap-3">
                    <Video className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Lien de connexion</p>
                      <a 
                        href={(session as any).meeting_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-brand-blue hover:underline"
                      >
                        Rejoindre la session
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Objectifs */}
            {formation?.objectives && (
              <GlassCard className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-brand-blue" />
                  Objectifs pédagogiques
                </h3>
                <div 
                  className="prose prose-sm max-w-none text-gray-600"
                  dangerouslySetInnerHTML={{ __html: formation.objectives }}
                />
              </GlassCard>
            )}
          </div>

          {/* Description */}
          {formation?.description && (
            <GlassCard className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-brand-blue" />
                Description de la formation
              </h3>
              <p className="text-gray-600">{formation.description}</p>
            </GlassCard>
          )}
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <GlassCard className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Mes documents</h3>
            {documents && documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {getDocumentIcon(doc.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">
                        {doc.created_at && formatDate(doc.created_at)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun document disponible</p>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* Progression */}
        <TabsContent value="progress" className="space-y-6">
          {/* Présence */}
          <GlassCard className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Suivi des présences</h3>
            <div className="flex items-center gap-6 mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Taux de présence</span>
                  <span className="font-semibold">{attendanceRate}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{attendanceStats.present}</p>
                <p className="text-xs text-gray-500">Présent</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
                <p className="text-xs text-gray-500">Absent</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{attendanceStats.late}</p>
                <p className="text-xs text-gray-500">Retard</p>
              </div>
            </div>
          </GlassCard>

          {/* Notes */}
          <GlassCard className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Mes notes</h3>
            {grades && grades.length > 0 ? (
              <div className="space-y-3">
                {grades.map((grade: any) => (
                  <div key={grade.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{grade.subject}</p>
                      <p className="text-sm text-gray-500">
                        {grade.assessment_type} • {grade.graded_at && formatDate(grade.graded_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {grade.score}/{grade.max_score || 20}
                      </p>
                      {grade.percentage && (
                        <Badge className={grade.percentage >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {grade.percentage}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune note disponible</p>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* Intervenants */}
        <TabsContent value="trainers">
          <GlassCard className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Intervenants</h3>
            {trainers && trainers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {trainers.map((trainer: any) => {
                  const trainerUser = trainer.users
                  return (
                    <div
                      key={trainer.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="w-14 h-14 rounded-full bg-brand-blue/10 flex items-center justify-center">
                        {trainerUser?.avatar_url ? (
                          <img
                            src={trainerUser.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-brand-blue" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {trainerUser?.first_name} {trainerUser?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{trainer.role || 'Formateur'}</p>
                        {trainerUser?.email && (
                          <p className="text-xs text-brand-blue">{trainerUser.email}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun intervenant assigné</p>
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}


