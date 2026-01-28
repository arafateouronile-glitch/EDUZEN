'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { motion } from '@/components/ui/motion'
import {
  GraduationCap,
  PlayCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Award,
  TrendingUp,
  ArrowRight,
  BookOpen,
  FileText,
  Target,
  Flame,
  ChevronRight,
  Sparkles,
  Zap,
  Trophy,
  Star,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ProgressChart } from '@/components/dashboard/progress-chart'
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap'
import { StatsRingChart } from '@/components/dashboard/stats-ring-chart'

export default function LearnerDashboardPage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])

  // Récupérer les inscriptions (comme dans le dashboard admin)
  const { data: enrollments, isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['learner-enrollments', studentId],
    queryFn: async () => {
      // NOTE: peut être bloqué par RLS selon l'environnement. On ne casse pas le dashboard si indisponible.
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

  // Récupérer les cours e-learning assignés via les sessions (source de vérité)
  const { data: sessionCourses, isLoading: isLoadingSessionCourses } = useQuery({
    queryKey: ['learner-session-courses', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []

      try {
        const { data, error } = await supabase
          .from('session_courses')
          .select(`
            *,
            course:courses(
              id, title, slug, short_description, description,
              difficulty_level, estimated_duration_hours, thumbnail_url, is_published
            )
          `)
          .order('assigned_at', { ascending: false })

        if (error) {
          if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
            return []
          }
          throw error
        }

        return data || []
      } catch (error: any) {
        logger.warn('Error fetching session courses (dashboard)', {
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

  // Récupérer la progression e-learning (lesson_progress) pour calculer total/complété
  const { data: lessonProgressData } = useQuery({
    queryKey: ['learner-lesson-progress', studentId, sessionCourses?.map((sc: any) => sc.course_id)],
    queryFn: async () => {
      if (!studentId || !sessionCourses?.length) return {}
      if (!supabase) return {}

      const courseIds = (sessionCourses || []).map((sc: any) => sc.course_id)

      try {
        const { data: progress, error } = await supabase
          .from('lesson_progress')
          .select('*, lessons(course_id)')
          .eq('student_id', studentId)

        if (error) {
          logger.warn('Error fetching lesson progress (dashboard)', {
            studentId: maskId(studentId),
            error: sanitizeError(error),
          })
          return {}
        }

        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, course_id')
          .in('course_id', courseIds)

        if (lessonsError) {
          logger.warn('Error fetching lessons (dashboard)', {
            studentId: maskId(studentId),
            error: sanitizeError(lessonsError),
          })
          return {}
        }

        const progressByCourse: Record<string, { completed: number; total: number; percentage: number }> = {}

        for (const courseId of courseIds) {
          const courseLessons = (lessons || []).filter((l: any) => l.course_id === courseId)
          const completedLessons = (progress || []).filter(
            (p: any) => p.lessons?.course_id === courseId && p.is_completed
          ).length

          const total = courseLessons.length
          const percentage = total > 0 ? Math.round((completedLessons / total) * 100) : 0

          progressByCourse[courseId] = { completed: completedLessons, total, percentage }
        }

        return progressByCourse
      } catch (error: any) {
        logger.warn('Error calculating progress (dashboard)', {
          studentId: maskId(studentId),
          error: sanitizeError(error),
        })
        return {}
      }
    },
    enabled: !!studentId && !!supabase && !!sessionCourses?.length,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Construire une liste "enrollments" e-learning compatible avec l'UI existante
  const courseEnrollments = useMemo(() => {
    return (sessionCourses || []).map((sc: any) => {
      const percentage = (lessonProgressData as any)?.[sc.course_id]?.percentage || 0
      return {
        id: sc.id,
        course_id: sc.course_id,
        courses: sc.course,
        progress_percentage: percentage,
        status: percentage === 100 ? 'completed' : percentage > 0 ? 'in_progress' : 'not_started',
      }
    })
  }, [sessionCourses, lessonProgressData])

  // Récupérer les documents récents
  const { data: recentDocuments } = useQuery({
    queryKey: ['learner-documents', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []

      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5)

      return data || []
    },
    enabled: !!studentId && !!supabase,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Récupérer les certificats
  const { data: certificates } = useQuery({
    queryKey: ['learner-certificates', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []

      const { data } = await supabase
        .from('course_certificates')
        .select(`
          *,
          courses(title)
        `)
        .eq('student_id', studentId)
        .order('issued_at', { ascending: false })

      return data || []
    },
    enabled: !!studentId && !!supabase,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Récupérer les présences pour calculer les heures de présence
  const { data: attendanceRecords } = useQuery({
    queryKey: ['learner-attendance', studentId],
    queryFn: async () => {
      if (!studentId) return []
      if (!supabase) return []

      try {
        // Récupérer les présences avec les sessions
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select(`
            *,
            sessions(
              id,
              start_time,
              end_time,
              start_date,
              end_date
            )
          `)
          .eq('student_id', studentId)
          .eq('status', 'present') // Seulement les présences
          .order('date', { ascending: false })

        if (attendanceError) {
          logger.warn('Error fetching attendance', {
            studentId: maskId(studentId),
            error: sanitizeError(attendanceError),
          })
          return []
        }

        // Récupérer les session_slots séparément pour chaque session unique
        const sessionIds = [...new Set((attendanceData || []).map((a: any) => a.session_id).filter(Boolean))]

        if (sessionIds.length === 0) {
          return attendanceData || []
        }

        // Récupérer les session_slots pour toutes les sessions
        const { data: slotsData, error: slotsError } = await supabase
          .from('session_slots')
          .select('*')
          .in('session_id', sessionIds)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })

        if (slotsError) {
          logger.warn('Error fetching session_slots', {
            studentId: maskId(studentId),
            error: sanitizeError(slotsError),
          })
          // Retourner quand même les données d'attendance sans slots
          return attendanceData || []
        }

        // Enrichir les données d'attendance avec les slots
        const enrichedData = (attendanceData || []).map((attendance: any) => {
          const sessionId = attendance.session_id
          const attendanceDate = attendance.date

          // Trouver les slots pour cette session et cette date
          const matchingSlots = (slotsData || []).filter((slot: any) =>
            slot.session_id === sessionId && slot.date === attendanceDate
          )

          return {
            ...attendance,
            sessions: attendance.sessions ? {
              ...attendance.sessions,
              session_slots: matchingSlots
            } : null
          }
        })

        return enrichedData
      } catch (error: any) {
        logger.warn('Unexpected error fetching attendance', {
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

  // Calculer les statistiques
  const stats = useMemo(() => {
    // Pour les sessions : vérifier le statut de la session elle-même, pas de l'enrollment
    const completedSessions = (enrollments || []).filter((e: any) => {
      // Une session est complétée si son statut est 'completed' ou si elle est terminée (end_date passée)
      const sessionStatus = e.sessions?.status
      const endDate = e.sessions?.end_date
      if (sessionStatus === 'completed') return true
      if (endDate && new Date(endDate) < new Date() && sessionStatus !== 'cancelled') return true
      return false
    }).length

    const ongoingSessions = (enrollments || []).filter((e: any) => {
      const sessionStatus = e.sessions?.status
      const startDate = e.sessions?.start_date
      const endDate = e.sessions?.end_date
      // Session en cours : confirmée, pas annulée, et entre start_date et end_date
      if (sessionStatus === 'cancelled') return false
      if (startDate && endDate) {
        const now = new Date()
        const start = new Date(startDate)
        const end = new Date(endDate)
        return now >= start && now <= end
      }
      return sessionStatus === 'confirmed' || sessionStatus === 'in_progress'
    }).length

    // Calculer les heures de présence (sessions physiques)
    let attendanceHours = 0
    if (attendanceRecords && attendanceRecords.length > 0) {
      logger.info('Calculating attendance hours', {
        studentId: studentId ? maskId(studentId) : undefined,
        recordCount: attendanceRecords.length,
      })
      attendanceRecords.forEach((attendance: any) => {
        const session = attendance.sessions
        const attendanceDate = attendance.date

        if (session?.session_slots && Array.isArray(session.session_slots) && session.session_slots.length > 0) {
          // Utiliser les session_slots pour calculer les heures (plus précis)
          session.session_slots.forEach((slot: any) => {
            if (slot.start_time && slot.end_time && slot.date) {
              try {
                // Format: "HH:MM:SS" ou "HH:MM"
                const startTimeStr = slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time
                const endTimeStr = slot.end_time.length === 5 ? `${slot.end_time}:00` : slot.end_time

                const start = new Date(`${slot.date}T${startTimeStr}`)
                const end = new Date(`${slot.date}T${endTimeStr}`)

                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                  const diffMs = end.getTime() - start.getTime()
                  const diffHours = diffMs / (1000 * 60 * 60)
                  if (diffHours > 0 && diffHours < 24) { // Vérifier que c'est raisonnable (moins de 24h)
                    attendanceHours += diffHours
                  }
                }
              } catch (e) {
                logger.warn('Error calculating hours from slot', {
                  studentId: studentId ? maskId(studentId) : undefined,
                  slotId: slot?.id ? maskId(slot.id) : undefined,
                  error: sanitizeError(e),
                })
              }
            }
          })
        } else if (session?.start_time && session?.end_time) {
          // Fallback : utiliser start_time/end_time de la session si pas de slots
          try {
            const startTimeStr = session.start_time.length === 5 ? `${session.start_time}:00` : session.start_time
            const endTimeStr = session.end_time.length === 5 ? `${session.end_time}:00` : session.end_time

            const start = new Date(`${attendanceDate}T${startTimeStr}`)
            const end = new Date(`${attendanceDate}T${endTimeStr}`)

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const diffMs = end.getTime() - start.getTime()
              const diffHours = diffMs / (1000 * 60 * 60)
              if (diffHours > 0 && diffHours < 24) {
                attendanceHours += diffHours
              }
            }
          } catch (e) {
            logger.warn('Error calculating hours from session times', {
              studentId: studentId ? maskId(studentId) : undefined,
              sessionId: session?.id ? maskId(session.id) : undefined,
              error: sanitizeError(e),
            })
          }
        } else {
          // Si aucune information de temps disponible, utiliser une durée par défaut de 2h
          // au lieu de logger un avertissement (c'est normal si les sessions n'ont pas de slots)
          const defaultHours = 2 // Durée par défaut pour une session
          attendanceHours += defaultHours
          // Logger seulement en debug pour éviter le spam dans la console
          if (process.env.NODE_ENV === 'development') {
            logger.info('Using default duration for attendance (no time info)', {
              studentId: studentId ? maskId(studentId) : undefined,
              attendanceId: attendance?.id ? maskId(attendance.id) : undefined,
              defaultHours,
            })
          }
        }
      })
    }

    // Calculer les heures e-learning (cours complétés)
    let elearningHours = 0
    const completedCourses = courseEnrollments?.filter((e: any) => e.status === 'completed') || []
    completedCourses.forEach((enrollment: any) => {
      const course = enrollment.courses
      if (course?.estimated_duration_hours) {
        elearningHours += course.estimated_duration_hours
      }
    })

    // Total heures = présence + e-learning
    const totalHours = Math.round((attendanceHours + elearningHours) * 10) / 10 // Arrondir à 1 décimale

    logger.info('Hours calculation completed', {
      studentId: studentId ? maskId(studentId) : undefined,
      attendanceHours: Math.round(attendanceHours * 10) / 10,
      elearningHours: Math.round(elearningHours * 10) / 10,
      totalHours,
      attendanceRecordsCount: attendanceRecords?.length || 0,
      completedCoursesCount: completedCourses.length,
    })

    return {
    totalEnrollments: enrollments?.length || 0,
      completedSessions,
      ongoingSessions,
    totalCourses: courseEnrollments?.length || 0,
      completedCourses: completedCourses.length,
    certificates: certificates?.length || 0,
      totalHours,
  }
  }, [enrollments, courseEnrollments, certificates, attendanceRecords])

  // Sessions à venir
  const upcomingSessions = enrollments
    ?.filter((e: any) => {
      const session = e.sessions
      if (!session?.start_date) return false
      return new Date(session.start_date) > new Date() && session.status !== 'cancelled'
    })
    .slice(0, 3) || []

  // Cours en cours
  const ongoingCourses = courseEnrollments
    ?.filter((e: any) => e.status === 'in_progress')
    .slice(0, 3) || []

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }
    }
  }

  const floatingAnimation = {
    y: [-10, 10, -10] as [number, number, number],
  }
  
  const floatingTransition = {
    duration: 6,
    repeat: Infinity,
    ease: "easeInOut" as const,
  }

  return (
    <motion.div
      className="space-y-8 pb-24 lg:pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Header Ultra-Premium avec gradient anime et glassmorphism */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2rem] shadow-[0_20px_80px_-20px_rgba(51,90,207,0.4)]"
      >
        {/* Gradient de fond anime avec shimmer et effet mesh */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-brand-blue to-brand-cyan"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ backgroundSize: '200% 200%' }}
        />

        {/* Mesh gradient overlay pour plus de profondeur */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'radial-gradient(at 40% 20%, rgba(255, 255, 255, 0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(52, 185, 238, 0.4) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(39, 68, 114, 0.3) 0px, transparent 50%)',
        }} />

        {/* Radial overlay avec effet de profondeur ameliore */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-brand-cyan/30 via-transparent to-transparent" />

        {/* Floating orbs avec effet de profondeur */}
        <motion.div
          animate={floatingAnimation}
          transition={floatingTransition}
          className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"
          style={{
            boxShadow: '0 0 80px 40px rgba(255, 255, 255, 0.1)',
          }}
        />
        <motion.div
          animate={floatingAnimation}
          transition={{ ...floatingTransition, delay: 0.5 }}
          className="absolute bottom-10 left-10 w-40 h-40 bg-brand-cyan/10 rounded-full blur-3xl"
          style={{
            boxShadow: '0 0 80px 40px rgba(167, 139, 250, 0.15)',
          }}
        />

        {/* Orbs additionnels pour plus de profondeur */}
        <motion.div
          animate={{
            y: [15, -15, 15],
            x: [10, -10, 10],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut" as const,
          }}
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"
        />

        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="flex items-center gap-4 mb-3"
              >
                <motion.div
                  className="p-3 bg-white/15 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(255,255,255,0.1)] border border-white/20"
                  whileHover={{ scale: 1.15, rotate: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Sparkles className="h-6 w-6 text-brand-cyan-light drop-shadow-lg" />
                </motion.div>
                <span className="text-sm font-bold text-white/90 uppercase tracking-[0.15em]">
                  Bienvenue sur votre espace
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="text-4xl md:text-6xl font-display font-bold text-white tracking-tighter leading-none drop-shadow-2xl mb-4"
              >
                Bonjour, {studentData?.first_name || 'Apprenant'} 👋
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="text-lg md:text-xl text-white/90 max-w-2xl font-medium tracking-tight drop-shadow-lg"
              >
                Pret a continuer votre parcours d'excellence ? Decouvrez vos formations et suivez votre progression.
              </motion.p>

              {/* Stats rapides dans le hero avec effets premium */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="flex flex-wrap items-center gap-3 mt-8"
              >
                <motion.div
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-xl rounded-full px-5 py-3 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.2)]"
                  whileHover={{ scale: 1.08, y: -3 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <motion.div
                    className="p-1.5 bg-white/20 rounded-full"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <GraduationCap className="h-5 w-5 text-white drop-shadow-md" />
                  </motion.div>
                  <span className="text-white font-bold text-lg tracking-tight drop-shadow-md">{stats.totalEnrollments}</span>
                  <span className="text-white/90 text-sm font-semibold">sessions</span>
                </motion.div>
                <motion.div
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-xl rounded-full px-5 py-3 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.2)]"
                  whileHover={{ scale: 1.08, y: -3 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <motion.div
                    className="p-1.5 bg-white/20 rounded-full"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <PlayCircle className="h-5 w-5 text-white drop-shadow-md" />
                  </motion.div>
                  <span className="text-white font-bold text-lg tracking-tight drop-shadow-md">{stats.totalCourses}</span>
                  <span className="text-white/90 text-sm font-semibold">cours</span>
                </motion.div>
              </motion.div>
            </div>

            {/* Stats box premium */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="flex items-center gap-6 bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)]"
            >
              <div className="text-center">
                <motion.div
                  className="text-5xl font-bold text-white mb-1 drop-shadow-xl"
                  whileHover={{ scale: 1.1 }}
                >
                  {stats.totalHours}h
                </motion.div>
                <div className="text-sm text-white/70 font-medium">Temps de formation</div>
              </div>
              <div className="w-px h-16 bg-white/20" />
              <div className="text-center">
                <motion.div
                  className="text-5xl font-bold text-white mb-1 drop-shadow-xl"
                  whileHover={{ scale: 1.1 }}
                >
                  {stats.certificates}
                </motion.div>
                <div className="text-sm text-white/70 font-medium">Certificats</div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <QuickActions />
      </motion.div>

      {/* Stats Cards Ultra-Premium avec effet 3D et glassmorphism */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
      >
        {[
          {
            label: 'Sessions inscrites',
            value: stats.totalEnrollments,
            subtitle: `${stats.completedSessions} terminee${stats.completedSessions > 1 ? 's' : ''}`,
            icon: GraduationCap,
            gradient: 'from-brand-blue to-brand-blue-dark',
            iconBg: 'bg-gradient-to-br from-brand-blue-pale to-brand-blue-ghost',
            iconColor: 'text-brand-blue',
            glowColor: 'rgba(39, 68, 114, 0.4)',
          },
          {
            label: 'Cours e-learning',
            value: stats.totalCourses,
            subtitle: `${stats.completedCourses} complete${stats.completedCourses > 1 ? 's' : ''}`,
            icon: PlayCircle,
            gradient: 'from-brand-blue to-brand-cyan',
            iconBg: 'bg-gradient-to-br from-brand-blue-pale to-brand-cyan-pale',
            iconColor: 'text-brand-blue',
            glowColor: 'rgba(52, 185, 238, 0.4)',
          },
          {
            label: 'Heures de formation',
            value: `${stats.totalHours}h`,
            subtitle: 'Temps total',
            icon: Clock,
            gradient: 'from-brand-cyan to-brand-cyan-dark',
            iconBg: 'bg-gradient-to-br from-brand-cyan-pale to-brand-cyan-ghost',
            iconColor: 'text-brand-cyan',
            glowColor: 'rgba(16, 185, 129, 0.4)',
          },
          {
            label: 'Certificats',
            value: stats.certificates,
            subtitle: 'Diplomes obtenus',
            icon: Award,
            gradient: 'from-brand-blue-light to-brand-cyan',
            iconBg: 'bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-pale',
            iconColor: 'text-brand-blue',
            glowColor: 'rgba(39, 68, 114, 0.4)',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            whileHover={{ y: -8, scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <GlassCard
              variant="premium"
              hoverable
              glow={index < 2}
              glowColor={stat.glowColor}
              className="relative p-6 md:p-8 overflow-hidden group cursor-pointer border-2 border-gray-100/50 hover:border-gray-200/80 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]"
            >
              {/* Gradient anime en background au survol */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}
              />

              {/* Shine effect on hover */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100"
                initial={{ x: '-100%', y: '-100%' }}
                whileHover={{ x: '100%', y: '100%' }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{
                  background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
                }}
              />

              <div className="relative z-10">
                <div className="flex flex-row items-center justify-between mb-6">
                  <p className="text-xs md:text-sm font-bold text-gray-500 group-hover:text-gray-700 transition-colors tracking-tight uppercase">
                    {stat.label}
                  </p>
                  <motion.div
                    className={`p-3 md:p-4 ${stat.iconBg} rounded-xl md:rounded-2xl transition-all duration-500 shadow-lg group-hover:shadow-xl`}
                    whileHover={{ rotate: 15, scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 600, damping: 15 }}
                  >
                    <stat.icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.iconColor}`} />
                  </motion.div>
                </div>

                <div className="space-y-3">
                  <motion.p
                    className="text-4xl md:text-5xl font-bold tracking-tighter text-gray-900 font-display"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {stat.value}
                  </motion.p>
                  <motion.div
                    className="flex items-center gap-2 text-xs md:text-sm font-bold text-brand-blue bg-gradient-to-r from-brand-blue-pale to-brand-blue-ghost w-fit px-3 py-1.5 rounded-full shadow-sm border border-brand-blue-pale"
                    whileHover={{ scale: 1.05, x: 3 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="tracking-tight">{stat.subtitle}</span>
                  </motion.div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Analytics Section - Premium */}
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.005 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <GlassCard
          variant="premium"
          className="relative overflow-hidden p-6 md:p-10 border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]"
        >
          {/* Animated gradient overlay */}
          <motion.div
            className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <motion.div
                className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-xl"
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <TrendingUp className="h-6 w-6 text-white drop-shadow-lg" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Votre progression</h2>
                <p className="text-sm text-gray-600 font-semibold tracking-tight">Activite des 14 derniers jours</p>
              </div>
            </div>

            <ProgressChart />
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats Ring & Activity Heatmap - Premium Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <GlassCard
            variant="premium"
            className="relative overflow-hidden p-6 md:p-10 h-full border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]"
          >
            {/* Animated gradient overlay */}
            <motion.div
              className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <motion.div
                  className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-xl"
                  whileHover={{ rotate: 10, scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Target className="h-6 w-6 text-white drop-shadow-lg" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Objectifs</h2>
                  <p className="text-sm text-gray-600 font-semibold tracking-tight">Votre avancement</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-8">
                <StatsRingChart
                  value={stats.completedSessions}
                  max={stats.totalEnrollments}
                  label="Sessions"
                  color="#3b82f6"
                />
                <StatsRingChart
                  value={stats.completedCourses}
                  max={stats.totalCourses}
                  label="Cours"
                  color="#a855f7"
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <GlassCard
            variant="premium"
            className="relative overflow-hidden p-6 md:p-10 h-full border-2 border-gray-100/50 hover:border-brand-cyan/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]"
          >
            {/* Animated gradient overlay */}
            <motion.div
              className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-brand-cyan/5 to-transparent rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <motion.div
                  className="p-3 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-2xl shadow-xl"
                  whileHover={{ rotate: 10, scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Flame className="h-6 w-6 text-white drop-shadow-lg" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Activite</h2>
                  <p className="text-sm text-gray-600 font-semibold tracking-tight">12 dernieres semaines</p>
                </div>
              </div>

              <div className="mt-6">
                <ActivityHeatmap weeks={12} />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions à venir */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Sessions à venir</h2>
                  <p className="text-sm text-gray-500">Vos prochaines formations</p>
                </div>
              </div>
              <Link href="/learner/formations" className="text-sm text-brand-blue hover:underline flex items-center group">
                Voir tout <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.map((enrollment: any, index) => {
                  const session = enrollment.sessions
                  const formation = session?.formations

                  return (
                    <motion.div
                      key={enrollment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link href={`/learner/formations/${session?.id}`}>
                        <motion.div
                          whileHover={{ x: 4, backgroundColor: 'rgba(249, 250, 251, 0.8)' }}
                          className="p-4 bg-gray-50/50 rounded-xl transition-all group cursor-pointer border border-transparent hover:border-brand-blue/20"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 group-hover:text-brand-blue transition-colors">
                                {formation?.name || session?.name || 'Session'}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {session?.start_date ? formatDate(session.start_date) : 'Date à définir'}
                                </span>
                              </div>
                              {session?.location && (
                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                  <span>📍</span> {session.location}
                                </p>
                              )}
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                          </div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Aucune session à venir</p>
                <Link href="/learner/formations">
                  <Button variant="outline" size="sm">
                    Découvrir les formations
                  </Button>
                </Link>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Cours en cours */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl">
                  <PlayCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Continuer l'apprentissage</h2>
                  <p className="text-sm text-gray-500">Vos cours en cours</p>
                </div>
              </div>
              <Link href="/learner/elearning" className="text-sm text-brand-blue hover:underline flex items-center group">
                Voir tout <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {ongoingCourses.length > 0 ? (
              <div className="space-y-3">
                {ongoingCourses.map((enrollment: any, index) => {
                  const course = enrollment.courses
                  const progress = enrollment.progress_percentage || 0
                  const courseHref = course?.slug ? `/learner/elearning/${course.slug}` : '/learner/elearning'

                  return (
                    <motion.div
                      key={enrollment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link href={courseHref}>
                        <motion.div
                          whileHover={{ x: 4, backgroundColor: 'rgba(249, 250, 251, 0.8)' }}
                          className="p-4 bg-gray-50/50 rounded-xl transition-all group cursor-pointer border border-transparent hover:border-brand-blue/20"
                        >
                          <div className="flex items-start gap-4">
                            {course?.thumbnail_url ? (
                              <motion.img
                                whileHover={{ scale: 1.05 }}
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-brand-blue to-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <BookOpen className="h-8 w-8 text-white" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-blue transition-colors">
                                {course?.title || 'Cours'}
                              </h3>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                                    className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full"
                                    style={{
                                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-600">{progress}%</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Cours e-learning
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <PlayCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Aucun cours en cours</p>
                <Link href="/learner/elearning">
                  <Button variant="outline" size="sm">
                    Explorer les cours
                  </Button>
                </Link>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* Documents récents */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-xl">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Documents récents</h2>
                <p className="text-sm text-gray-500">Vos derniers documents</p>
              </div>
            </div>
            <Link href="/learner/documents" className="text-sm text-brand-blue hover:underline flex items-center group">
              Voir tout <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {recentDocuments && recentDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentDocuments.map((doc: any, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="p-4 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-all cursor-pointer border border-transparent hover:border-brand-cyan/20"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      doc.type === 'certificate' ? 'bg-brand-cyan-pale' :
                      doc.type === 'convocation' ? 'bg-brand-blue-pale' :
                      'bg-gray-100'
                    }`}>
                      {doc.type === 'certificate' ? (
                        <Award className="h-5 w-5 text-brand-cyan" />
                      ) : (
                        <FileText className="h-5 w-5 text-brand-blue" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {doc.created_at && formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun document disponible</p>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Motivation card */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue to-brand-cyan" />
          <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] opacity-10" />

          {/* Animated orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute bottom-0 left-0 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl"
          />

          <div className="relative z-10 p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-6 w-6 text-brand-cyan-light" />
                  <span className="text-sm font-semibold text-white uppercase tracking-wider">
                    Continuez comme ça !
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  Vous êtes sur la bonne voie 🎉
                </h3>
                <p className="text-lg text-white/80 max-w-2xl">
                  Vous avez complété {stats.completedSessions + stats.completedCourses} formations.
                  Chaque pas vous rapproche de vos objectifs !
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <motion.div
                    className="text-5xl font-bold text-white mb-1"
                    whileHover={{ scale: 1.1 }}
                  >
                    {stats.totalHours}h
                  </motion.div>
                  <p className="text-sm text-white/70">heures formé</p>
                </div>
                <div className="w-px h-16 bg-white/20" />
                <div className="text-center">
                  <motion.div
                    className="text-5xl font-bold text-white mb-1"
                    whileHover={{ scale: 1.1 }}
                  >
                    {stats.certificates}
                  </motion.div>
                  <p className="text-sm text-white/70">certificats</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
