'use client'

import { useQuery } from '@tanstack/react-query'
import { useLearnerContext } from '@/lib/contexts/learner-context'
import { createLearnerClient } from '@/lib/supabase/learner-client'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion } from '@/components/ui/motion'
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Award,
  BarChart3,
  Calendar,
  FileQuestion,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { useMemo } from 'react'

export default function LearnerEvaluationsPage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])

  // Récupérer les évaluations (quiz) à faire
  const { data: pendingQuizzes, isLoading: loadingQuizzes } = useQuery({
    queryKey: ['learner-pending-quizzes', studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return []
      
      // NOTE: Table course_enrollments n'existe pas encore - retourner un tableau vide
      // Fonctionnalité prévue - Nécessite création de la table course_enrollments dans Supabase
      return []
    },
    enabled: !!studentData?.id,
  })

  // Récupérer les réponses aux quiz (terminés)
  const { data: quizResponses, isLoading: loadingResponses } = useQuery({
    queryKey: ['learner-quiz-responses', studentData?.id],
    queryFn: async () => {
      // Table lesson_quiz_responses n'existe pas - retourner tableau vide
      return []
    },
    enabled: false,
  })

  // Récupérer les notes/grades
  const { data: grades, isLoading: loadingGrades } = useQuery({
    queryKey: ['learner-grades', studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return []
      if (!supabase) return []

      // Essayer d'abord avec la requête normale
      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          sessions(name, formations(name))
        `)
        .eq('student_id', studentData.id)
        .order('graded_at', { ascending: false })
      
      if (error) {
        logger.error('[Learner Evaluations] Erreur lors de la récupération des évaluations:', error instanceof Error ? error : new Error(String(error)), {})
        // Essayer une requête plus simple sans les relations
        const { data: simpleData, error: simpleError } = await supabase
          .from('grades')
          .select('*')
          .eq('student_id', studentData.id)
          .order('graded_at', { ascending: false })
        
        if (simpleError) return []
        return simpleData || []
      }
      
      return data || []
    },
    enabled: !!studentData?.id && !!supabase,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000, // Considérer les données comme périmées après 30 secondes
  })

  // Séparer les évaluations en "à faire" et "terminées"
  // À faire : celles sans note (score null) ou sans date de correction (graded_at null)
  type GradeRow = { assessment_type?: string; rating?: number | null; score?: number | null; graded_at?: string | null; percentage?: number }
  const SATISFACTION_TYPES = ['hot', 'cold', 'manager', 'instructor', 'funder']
  const isSatisfaction = (g: GradeRow) => SATISFACTION_TYPES.includes(g.assessment_type || '')
  const isCompleted = (g: GradeRow) =>
    isSatisfaction(g)
      ? g.rating !== null && g.rating !== undefined
      : g.score != null && g.graded_at != null
  const pendingEvaluations = grades?.filter((g) => !isCompleted(g as GradeRow)) ?? []
  const completedEvaluations = grades?.filter((g) => isCompleted(g as GradeRow)) ?? []

  const totalEvaluations = (quizResponses?.length ?? 0) + completedEvaluations.length
  const avgScore = completedEvaluations.length > 0
    ? Math.round(
        completedEvaluations.reduce((acc: number, g) => {
          const row = g as GradeRow
          if (isSatisfaction(row)) return acc + (Number(row.rating ?? 0) * 20)
          return acc + (Number(row.percentage) || 0)
        }, 0) / completedEvaluations.length
      )
    : 0

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-700">Excellent</Badge>
    if (score >= 60) return <Badge className="bg-blue-100 text-blue-700">Bien</Badge>
    if (score >= 40) return <Badge className="bg-amber-100 text-amber-700">Moyen</Badge>
    return <Badge className="bg-red-100 text-red-700">À améliorer</Badge>
  }

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
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-50/30 to-yellow-50/20" />

          {/* Floating orbs */}
          <motion.div
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"
          />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/25"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <ClipboardCheck className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Mes évaluations
                </h1>
                <p className="text-gray-500 mt-1">
                  Quiz, questionnaires et résultats
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-amber-500/10 to-orange-100 text-amber-600 border-0 px-4 py-2">
                <BarChart3 className="h-4 w-4 mr-2" />
                {avgScore}% moyenne
              </Badge>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats Premium */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard variant="premium" hoverable glow className="p-5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-brand-blue/10 to-indigo-500/10 flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-brand-blue" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-brand-blue to-indigo-500 bg-clip-text text-transparent">
              {totalEvaluations}
            </div>
            <p className="text-sm text-gray-500 mt-1">Passées</p>
          </motion.div>
        </GlassCard>

        <GlassCard variant="premium" hoverable glow className="p-5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              {(pendingQuizzes?.length || 0) + pendingEvaluations.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">En attente</p>
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
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              {avgScore}%
            </div>
            <p className="text-sm text-gray-500 mt-1">Score moyen</p>
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
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              {completedEvaluations.filter((g) => { const row = g as GradeRow; return isSatisfaction(row) ? (row.rating ?? 0) >= 4 : (row.percentage ?? 0) >= 80; }).length ?? 0}
            </div>
            <p className="text-sm text-gray-500 mt-1">Excellents</p>
          </motion.div>
        </GlassCard>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white/50 backdrop-blur-sm border border-gray-200/50 p-1 rounded-xl">
            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-brand-blue data-[state=active]:text-white">
              <Clock className="h-4 w-4 mr-2" />
              À faire ({(pendingQuizzes?.length || 0) + pendingEvaluations.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-brand-blue data-[state=active]:text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Terminées ({totalEvaluations})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {loadingQuizzes || loadingGrades ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : ((pendingQuizzes && pendingQuizzes.length > 0) || pendingEvaluations.length > 0) ? (
              <div className="space-y-4">
                {/* Quiz à faire */}
                {pendingQuizzes?.map((quiz: { id: string; title?: string; lessons?: { courses?: { title?: string }; title?: string }; time_limit?: number; passing_score?: number }) => (
                  <GlassCard key={quiz.id} className="p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-50 rounded-xl">
                        <FileQuestion className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <p className="text-sm text-gray-500">
                          {quiz.lessons?.courses?.title} • {quiz.lessons?.title}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {quiz.time_limit || 30} min
                          </span>
                          <span>{quiz.passing_score || 70}% requis</span>
                        </div>
                      </div>
                      <Link href={`/learner/evaluations/${quiz.id}`}>
                        <Button>
                          <Play className="h-4 w-4 mr-2" />
                          Commencer
                        </Button>
                      </Link>
                    </div>
                  </GlassCard>
                ))}
                
                {/* Évaluations à faire (sans note) */}
                {pendingEvaluations.map((evaluation) => (
                  <Link key={evaluation.id} href={`/learner/evaluations/${evaluation.id}`}>
                    <GlassCard className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl">
                          <ClipboardCheck className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{(evaluation as { subject?: string }).subject ?? ''}</h3>
                          <p className="text-sm text-gray-500">
                            {(evaluation as { sessions?: { formations?: { name?: string }; name?: string } }).sessions?.formations?.name ?? (evaluation as { sessions?: { name?: string } }).sessions?.name ?? ''}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {(evaluation as { created_at?: string }).created_at && formatDate((evaluation as { created_at: string }).created_at)}
                            </span>
                            <span>{evaluation.assessment_type || 'Évaluation'}</span>
                          </div>
                          {evaluation.notes && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{evaluation.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className="bg-amber-100 text-amber-700">En attente de correction</Badge>
                          <Button variant="outline" size="sm" onClick={(e) => e.preventDefault()}>
                            Voir les détails
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Tout est à jour !
                </h3>
                <p className="text-gray-500">
                  Vous n'avez aucune évaluation en attente
                </p>
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {loadingGrades || loadingResponses ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : totalEvaluations > 0 ? (
              <div className="space-y-4">
                {/* Notes/Grades - Seulement les évaluations terminées (avec note) */}
                {completedEvaluations.map((grade) => {
                  const g = grade as GradeRow & { id: string; subject?: string; sessions?: { formations?: { name?: string }; name?: string }; graded_at?: string; max_score?: number; feedback?: string; notes?: string }
                  const satisfaction = isSatisfaction(g)
                  return (
                  <Link key={grade.id} href={`/learner/evaluations/${grade.id}`}>
                    <GlassCard className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          satisfaction ? 'bg-amber-50' :
                          (g.percentage ?? 0) >= 80 ? 'bg-green-50' :
                          (g.percentage ?? 0) >= 60 ? 'bg-blue-50' :
                          'bg-amber-50'
                        }`}>
                          <ClipboardCheck className={`h-6 w-6 ${
                            satisfaction ? 'text-amber-600' :
                            (g.percentage ?? 0) >= 80 ? 'text-green-600' :
                            (g.percentage ?? 0) >= 60 ? 'text-blue-600' :
                            'text-amber-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{g.subject ?? ''}</h3>
                            {satisfaction ? (
                              <Badge className="bg-amber-100 text-amber-700">{g.rating ?? '—'}/5</Badge>
                            ) : (
                              getScoreBadge(g.percentage ?? 0)
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {g.sessions?.formations?.name ?? g.sessions?.name ?? ''}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {g.graded_at && formatDate(g.graded_at)}
                            </span>
                            <span>{g.assessment_type ?? 'Évaluation'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {satisfaction ? (
                            <>
                              <div className="text-2xl font-bold text-amber-600">
                                {g.rating ?? '—'} / 5
                              </div>
                              <p className="text-sm text-gray-500">Satisfaction</p>
                            </>
                          ) : (
                            <>
                              <div className="text-2xl font-bold text-gray-900">
                                {g.score ?? 0}/{g.max_score ?? 20}
                              </div>
                              <p className="text-sm text-gray-500">{g.percentage ?? 0}%</p>
                            </>
                          )}
                          <Button variant="outline" size="sm" className="mt-2" onClick={(e) => e.preventDefault()}>
                            Voir les détails
                          </Button>
                        </div>
                      </div>
                      {(g.feedback || (satisfaction && g.notes)) && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">{g.feedback ?? g.notes ?? ''}</p>
                        </div>
                      )}
                    </GlassCard>
                  </Link>
                  )
                })}

                {/* Quiz Responses */}
                {(quizResponses ?? []).map((response: { id: string; lessons?: { title?: string; courses?: { title?: string } }; created_at?: string; score?: number; passed?: boolean }) => (
                  <GlassCard key={response.id} className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-50 rounded-xl">
                        <FileQuestion className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          Quiz - {response.lessons?.title ?? ''}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {response.lessons?.courses?.title ?? ''}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {response.created_at ? formatDate(response.created_at) : null}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {response.score ?? 0}%
                        </div>
                        {response.passed ? (
                          <Badge className="bg-green-100 text-green-700">Réussi</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">À refaire</Badge>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucune évaluation terminée
                </h3>
                <p className="text-gray-500">
                  Vos résultats apparaîtront ici
                </p>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}


