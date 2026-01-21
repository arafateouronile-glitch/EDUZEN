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
import { useMemo } from 'react'

export default function LearnerEvaluationsPage() {
  const { student: studentData, studentId } = useLearnerContext()
  const supabase = useMemo(() => (studentId ? createLearnerClient(studentId) : null), [studentId])

  // Récupérer les évaluations (quiz) à faire
  const { data: pendingQuizzes, isLoading: loadingQuizzes } = useQuery({
    queryKey: ['learner-pending-quizzes', studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return []
      
      // Table course_enrollments n'existe pas - retourner un tableau vide
      // TODO: Implémenter quand la table sera disponible
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
      
      const { data } = await supabase
        .from('grades')
        .select(`
          *,
          sessions(name, formations(name))
        `)
        .eq('student_id', studentData.id)
        .order('graded_at', { ascending: false })
      
      return data || []
    },
    enabled: !!studentData?.id && !!supabase,
  })

  // Calcul des stats
  const totalEvaluations = (quizResponses?.length || 0) + (grades?.length || 0)
  const avgScore = grades?.length 
    ? Math.round(grades.reduce((acc: number, g: any) => acc + (g.percentage || 0), 0) / grades.length)
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
              {pendingQuizzes?.length || 0}
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
              {grades?.filter((g: any) => (g.percentage || 0) >= 80).length || 0}
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
              À faire ({pendingQuizzes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-brand-blue data-[state=active]:text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Terminées ({totalEvaluations})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {loadingQuizzes ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : pendingQuizzes && pendingQuizzes.length > 0 ? (
              <div className="space-y-4">
                {pendingQuizzes.map((quiz: any) => (
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
                {/* Notes/Grades */}
                {grades?.map((grade: any) => (
                  <GlassCard key={grade.id} className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        (grade.percentage || 0) >= 80 ? 'bg-green-50' :
                        (grade.percentage || 0) >= 60 ? 'bg-blue-50' :
                        'bg-amber-50'
                      }`}>
                        <ClipboardCheck className={`h-6 w-6 ${
                          (grade.percentage || 0) >= 80 ? 'text-green-600' :
                          (grade.percentage || 0) >= 60 ? 'text-blue-600' :
                          'text-amber-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{grade.subject}</h3>
                          {getScoreBadge(grade.percentage || 0)}
                        </div>
                        <p className="text-sm text-gray-500">
                          {grade.sessions?.formations?.name || grade.sessions?.name}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {grade.graded_at && formatDate(grade.graded_at)}
                          </span>
                          <span>{grade.assessment_type || 'Évaluation'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {grade.score}/{grade.max_score || 20}
                        </div>
                        <p className="text-sm text-gray-500">{grade.percentage}%</p>
                      </div>
                    </div>
                    {grade.feedback && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">{grade.feedback}</p>
                      </div>
                    )}
                  </GlassCard>
                ))}

                {/* Quiz Responses */}
                {quizResponses?.map((response: any) => (
                  <GlassCard key={response.id} className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-50 rounded-xl">
                        <FileQuestion className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          Quiz - {response.lessons?.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {response.lessons?.courses?.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {response.created_at && formatDate(response.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {response.score || 0}%
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


