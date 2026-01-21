'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from '@/components/ui/motion'
import {
  Award,
  Download,
  Share2,
  Eye,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function LearnerCertificatesPage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])

  // Récupérer les certificats e-learning
  const { data: courseCertificates, isLoading: loadingCourse } = useQuery({
    queryKey: ['learner-course-certificates', studentId],
    queryFn: async () => {
      if (!studentId) return []
      
      if (!supabase) return []
      const { data } = await supabase
        .from('course_certificates')
        .select(`
          *,
          courses(title, description)
        `)
        .eq('student_id', studentId)
        .order('issued_at', { ascending: false })
      
      return data || []
    },
    enabled: !!studentId,
  })

  // Récupérer les certificats de session (attestations de fin de formation)
  const { data: sessionCertificates, isLoading: loadingSession } = useQuery({
    queryKey: ['learner-session-certificates', studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return []
      
      if (!supabase) return []
      const { data } = await supabase
        .from('enrollments')
        .select(`
          *,
          sessions(
            name,
            start_date,
            end_date,
            formations(name)
          )
        `)
        .eq('student_id', studentData.id)
        .in('status', ['completed', 'confirmed'])
        .order('created_at', { ascending: false })
      
      return data || []
    },
    enabled: !!studentData?.id,
  })

  const allCertificates = [
    ...(courseCertificates || []).map((cert: any) => ({
      id: cert.id,
      title: cert.courses?.title || 'Cours',
      description: cert.courses?.description,
      type: 'course',
      date: cert.issued_at,
      certificateNumber: cert.certificate_number,
      url: cert.certificate_url,
      hours: 0,
    })),
    ...(sessionCertificates || []).map((enrollment: any) => ({
      id: enrollment.id,
      title: enrollment.sessions?.formations?.name || enrollment.sessions?.name || 'Formation',
      description: `Session du ${enrollment.sessions?.start_date ? formatDate(enrollment.sessions.start_date) : 'N/A'}`,
      type: 'session',
      date: enrollment.created_at || enrollment.enrollment_date,
      certificateNumber: null,
      url: null,
      hours: 0,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const isLoading = loadingCourse || loadingSession

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
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-50/30 to-orange-50/20" />

          {/* Floating orbs */}
          <motion.div
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl"
          />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl shadow-lg shadow-amber-500/25"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Award className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  Mes certificats
                </h1>
                <p className="text-gray-500 mt-1">
                  Diplômes et attestations obtenus
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-amber-500/10 to-yellow-100 text-amber-600 border-0 px-4 py-2">
                <Award className="h-4 w-4 mr-2" />
                {allCertificates.length} certificat{allCertificates.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats Premium */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard variant="premium" hoverable glow className="p-5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-amber-600" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
              {allCertificates.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Total certificats</p>
          </motion.div>
        </GlassCard>

        <GlassCard variant="premium" hoverable glow className="p-5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              {courseCertificates?.length || 0}
            </div>
            <p className="text-sm text-gray-500 mt-1">E-Learning</p>
          </motion.div>
        </GlassCard>

        <GlassCard variant="premium" hoverable glow className="p-5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              {sessionCertificates?.length || 0}
            </div>
            <p className="text-sm text-gray-500 mt-1">Formations</p>
          </motion.div>
        </GlassCard>
      </motion.div>

      {/* Liste des certificats */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : allCertificates.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {allCertificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  {/* Header gradient */}
                  <div className="h-3 bg-gradient-to-r from-brand-blue to-brand-cyan" />
                  
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="p-3 bg-gradient-to-br from-brand-cyan-pale to-brand-cyan-ghost rounded-xl">
                        <Award className="h-8 w-8 text-brand-cyan" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-900 line-clamp-2">
                            {cert.title}
                          </h3>
                          <Badge className={cert.type === 'course' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                            {cert.type === 'course' ? 'E-Learning' : 'Formation'}
                          </Badge>
                        </div>

                        {cert.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {cert.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {cert.date && formatDate(cert.date)}
                          </span>
                          {cert.hours && (
                            <span>{cert.hours}h</span>
                          )}
                        </div>

                        {cert.certificateNumber && (
                          <p className="text-xs text-gray-400 mt-2 font-mono">
                            N° {cert.certificateNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 group-hover:border-brand-cyan group-hover:text-brand-cyan"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center">
            <Award className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun certificat pour le moment
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Complétez vos formations et cours e-learning pour obtenir vos premiers certificats.
            </p>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir mes formations
            </Button>
          </GlassCard>
        )}
      </motion.div>
    </motion.div>
  )
}


