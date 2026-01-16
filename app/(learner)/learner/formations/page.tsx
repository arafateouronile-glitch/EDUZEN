'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLearnerContext } from '@/lib/contexts/learner-context'
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
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  Award,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export default function LearnerFormationsPage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])

  // Récupérer les inscriptions
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['learner-all-enrollments', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []
      
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select(`
            *,
            sessions(
              id,
              name,
              start_date,
              end_date,
              status,
              location,
              formations(
                id,
                name,
                description
              )
            )
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
        
        if (error) {
          // Gérer les erreurs RLS ou table inexistante
          if (
            error.code === 'PGRST116' ||
            error.code === '42P01' ||
            error.code === 'PGRST301' ||
            error.status === 400 ||
            error.code === '400' ||
            error.message?.includes('relation') ||
            error.message?.includes('relationship') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('schema cache')
          ) {
            logger.warn('Enrollments table may not be accessible (RLS or missing)', error, {
              studentId: maskId(studentId),
              error: sanitizeError(error),
            })
            return []
          }
          logger.error('Error fetching enrollments', error, {
            studentId: maskId(studentId),
            error: sanitizeError(error),
          })
          return []
        }

        return data || []
      } catch (error: any) {
        logger.error('Unexpected error fetching enrollments', error, {
          studentId: maskId(studentId),
          error: sanitizeError(error),
        })
        return []
      }
    },
    enabled: !!studentId && !!supabase,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Filtrer par statut
  const upcomingEnrollments = enrollments?.filter((e: any) => {
    const session = e.sessions
    if (!session?.start_date) return false
    return new Date(session.start_date) > new Date() && e.status !== 'cancelled'
  }) || []

  const ongoingEnrollments = enrollments?.filter((e: any) => {
    const session = e.sessions
    if (!session?.start_date || !session?.end_date) return false
    const now = new Date()
    return new Date(session.start_date) <= now && new Date(session.end_date) >= now && e.status !== 'cancelled'
  }) || []

  const completedEnrollments = enrollments?.filter((e: any) => 
    e.status === 'completed'
  ) || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Terminée</Badge>
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Confirmée</Badge>
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En attente</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Annulée</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const EnrollmentCard = ({ enrollment }: { enrollment: any }) => {
    const session = enrollment.sessions
    const formation = session?.formations
    const program = formation?.programs

    return (
      <Link
        href={`/learner/formations/${session?.id}`}
        className="block"
      >
        <GlassCard className="p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Icon */}
            <div className="p-3 bg-gradient-to-br from-brand-blue/10 to-indigo-100 rounded-xl group-hover:scale-105 transition-transform">
              <GraduationCap className="h-8 w-8 text-brand-blue" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {program && (
                    <p className="text-xs font-medium text-brand-blue uppercase tracking-wider mb-1">
                      {program.name}
                    </p>
                  )}
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-blue transition-colors">
                    {formation?.name || session?.name || 'Formation'}
                  </h3>
                </div>
                {getStatusBadge(enrollment.status)}
              </div>

              {formation?.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {formation.description}
                </p>
              )}

              {/* Infos */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                {session?.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(session.start_date)}
                    {session.end_date && session.end_date !== session.start_date && 
                      ` - ${formatDate(session.end_date)}`
                    }
                  </span>
                )}
                {/* Durée de la formation */}
                {session?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {session.location}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                <Button variant="outline" size="sm" className="group-hover:border-brand-blue group-hover:text-brand-blue">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </Button>
                {enrollment.status === 'completed' && (
                  <Button variant="outline" size="sm">
                    <Award className="h-4 w-4 mr-2" />
                    Certificat
                  </Button>
                )}
                <div className="flex-1" />
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </GlassCard>
      </Link>
    )
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">{message}</p>
    </div>
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  return (
    <motion.div
      className="space-y-6 pb-24 lg:pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-blue/10 rounded-xl">
            <GraduationCap className="h-8 w-8 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Mes formations
            </h1>
            <p className="text-gray-500">
              Gérez vos inscriptions et suivez votre progression
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats rapides */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-brand-blue">{upcomingEnrollments.length}</div>
          <p className="text-sm text-gray-500">À venir</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{ongoingEnrollments.length}</div>
          <p className="text-sm text-gray-500">En cours</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{completedEnrollments.length}</div>
          <p className="text-sm text-gray-500">Terminées</p>
        </GlassCard>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-white/50 backdrop-blur-sm border border-gray-200/50 p-1 rounded-xl">
            <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:bg-brand-blue data-[state=active]:text-white">
              <Calendar className="h-4 w-4 mr-2" />
              À venir ({upcomingEnrollments.length})
            </TabsTrigger>
            <TabsTrigger value="ongoing" className="rounded-lg data-[state=active]:bg-brand-blue data-[state=active]:text-white">
              <PlayCircle className="h-4 w-4 mr-2" />
              En cours ({ongoingEnrollments.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-brand-blue data-[state=active]:text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Terminées ({completedEnrollments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : upcomingEnrollments.length > 0 ? (
              upcomingEnrollments.map((enrollment: any) => (
                <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
              ))
            ) : (
              <EmptyState message="Aucune formation à venir" />
            )}
          </TabsContent>

          <TabsContent value="ongoing" className="space-y-4">
            {ongoingEnrollments.length > 0 ? (
              ongoingEnrollments.map((enrollment: any) => (
                <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
              ))
            ) : (
              <EmptyState message="Aucune formation en cours" />
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedEnrollments.length > 0 ? (
              completedEnrollments.map((enrollment: any) => (
                <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
              ))
            ) : (
              <EmptyState message="Aucune formation terminée" />
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}


