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
            (error as any).status === 400 ||
            error.code === '400' ||
            error.message?.includes('relation') ||
            error.message?.includes('relationship') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('schema cache')
          ) {
            logger.warn('Enrollments table may not be accessible (RLS or missing)', {
              studentId: maskId(studentId),
              error: sanitizeError(error),
            })
            return []
          }
          logger.error('Error fetching enrollments', sanitizeError(error), {
            studentId: maskId(studentId),
          })
          return []
        }

        return data || []
      } catch (error: any) {
        logger.error('Unexpected error fetching enrollments', sanitizeError(error), {
          studentId: maskId(studentId),
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
        return <Badge className="bg-brand-cyan-pale text-brand-cyan hover:bg-brand-cyan-pale">Terminée</Badge>
      case 'confirmed':
        return <Badge className="bg-brand-blue-pale text-brand-blue hover:bg-brand-blue-pale">Confirmée</Badge>
      case 'pending':
        return <Badge className="bg-brand-cyan-ghost text-brand-cyan-dark hover:bg-brand-cyan-ghost">En attente</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Annulée</Badge>
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
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <GlassCard variant="premium" hoverable glow className="p-6 relative overflow-hidden group cursor-pointer">
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 via-transparent to-brand-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
            />

            <div className="relative flex flex-col md:flex-row md:items-start gap-4">
              {/* Icon avec animation */}
              <motion.div
                className="p-4 bg-gradient-to-br from-brand-blue to-indigo-600 rounded-2xl shadow-lg shadow-brand-blue/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <GraduationCap className="h-8 w-8 text-white" />
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {program && (
                      <p className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-1">
                        {program.name}
                      </p>
                    )}
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-blue transition-colors duration-300">
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

                {/* Infos avec icônes améliorées */}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                  {session?.start_date && (
                    <span className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Calendar className="h-4 w-4 text-brand-blue" />
                      {formatDate(session.start_date)}
                      {session.end_date && session.end_date !== session.start_date &&
                        ` - ${formatDate(session.end_date)}`
                      }
                    </span>
                  )}
                  {session?.location && (
                    <span className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <MapPin className="h-4 w-4 text-brand-blue" />
                      {session.location}
                    </span>
                  )}
                </div>

                {/* Actions améliorées */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="group-hover:border-brand-blue group-hover:text-brand-blue group-hover:bg-brand-blue/5 transition-all duration-300"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Documents
                  </Button>
                  {enrollment.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="group-hover:border-brand-cyan group-hover:text-brand-cyan group-hover:bg-brand-cyan-pale transition-all duration-300"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Certificat
                    </Button>
                  )}
                  <div className="flex-1" />
                  <motion.div
                    className="p-2 rounded-full bg-gray-50 group-hover:bg-brand-blue/10 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-brand-blue transition-colors" />
                  </motion.div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </Link>
    )
  }

  const EmptyState = ({ message }: { message: string }) => (
    <GlassCard variant="premium" className="p-12 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-slate-100/30" />
      <div className="relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
        >
          <GraduationCap className="h-10 w-10 text-gray-400" />
        </motion.div>
        <p className="text-gray-500 font-medium">{message}</p>
      </div>
    </GlassCard>
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
      {/* Header Premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-6 md:p-8 relative overflow-hidden">
          {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 via-brand-cyan-ghost/30 to-brand-cyan-pale/20" />

          {/* Floating orbs */}
          <motion.div
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"
          />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-4 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-lg shadow-brand-blue/25"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <GraduationCap className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-brand-blue to-brand-cyan bg-clip-text text-transparent">
                  Mes formations
                </h1>
                <p className="text-gray-500 mt-1">
                  Gérez vos inscriptions et suivez votre progression
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-brand-blue/10 to-brand-cyan-pale text-brand-blue border-0 px-4 py-2">
                <GraduationCap className="h-4 w-4 mr-2" />
                {enrollments?.length || 0} formation{(enrollments?.length || 0) > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats rapides - Premium */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
        <GlassCard variant="premium" hoverable glow className="p-5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-brand-blue" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
              {upcomingEnrollments.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">À venir</p>
          </motion.div>
        </GlassCard>

        <GlassCard variant="premium" hoverable glow className="p-5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 to-brand-cyan-dark/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-brand-cyan/10 to-brand-cyan-dark/10 flex items-center justify-center">
              <PlayCircle className="h-6 w-6 text-brand-cyan" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-brand-cyan to-brand-cyan-dark bg-clip-text text-transparent">
              {ongoingEnrollments.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">En cours</p>
          </motion.div>
        </GlassCard>

        <GlassCard variant="premium" hoverable glow className="p-5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-brand-blue" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
              {completedEnrollments.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Terminées</p>
          </motion.div>
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


