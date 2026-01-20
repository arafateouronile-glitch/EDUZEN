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
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-cyan-pale rounded-xl">
            <Award className="h-8 w-8 text-brand-cyan" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Mes certificats
            </h1>
            <p className="text-gray-500">
              Diplômes et attestations obtenus
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard className="p-4 text-center">
          <Award className="h-6 w-6 text-brand-cyan mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{allCertificates.length}</div>
          <p className="text-xs text-gray-500">Total certificats</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {courseCertificates?.length || 0}
          </div>
          <p className="text-xs text-gray-500">E-Learning</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-brand-cyan mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {sessionCertificates?.length || 0}
          </div>
          <p className="text-xs text-gray-500">Formations</p>
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


