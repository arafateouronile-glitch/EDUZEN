'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { evaluationService } from '@/lib/services/evaluation.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { 
  Plus, Search, Download, Filter, X, FileCheck, Calendar, 
  User, BookOpen, TrendingUp, Award, BarChart3, Edit, Trash2,
  CheckCircle, XCircle, Clock, FileText, ArrowRight, Star, Layout
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, cn } from '@/lib/utils'
import { exportToExcel } from '@/lib/utils/excel-export'
import { useToast } from '@/components/ui/toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { evaluationSchema, type EvaluationFormData } from '@/lib/validations/schemas'
import type { GradeWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { logger } from '@/lib/utils/logger'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { PremiumBarChart } from '@/components/charts/premium-bar-chart'
import { PremiumPieChart } from '@/components/charts/premium-pie-chart'

type Evaluation = TableRow<'grades'>

type AssessmentType = 'pre_formation' | 'hot' | 'cold' | 'manager' | 'instructor' | 'funder' | 'quiz' | 'exam' | 'project' | 'other'

const ASSESSMENT_TYPES: { value: AssessmentType; label: string; icon: string }[] = [
  { value: 'pre_formation', label: 'Pré-formation', icon: '📋' },
  { value: 'hot', label: 'Hot (Fin de formation)', icon: '🔥' },
  { value: 'cold', label: 'Cold (3 mois après)', icon: '❄️' },
  { value: 'manager', label: 'Questionnaire Manager', icon: '👔' },
  { value: 'instructor', label: 'Questionnaire Formateur', icon: '👨‍🏫' },
  { value: 'funder', label: 'Questionnaire Financeur', icon: '💰' },
  { value: 'quiz', label: 'Quiz', icon: '❓' },
  { value: 'exam', label: 'Examen', icon: '📝' },
  { value: 'project', label: 'Projet', icon: '📁' },
  { value: 'other', label: 'Autre', icon: '📄' },
]

export default function EvaluationsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState<string>('all')
  const [studentFilter, setStudentFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null)

  // React Hook Form avec validation Zod
  const {
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationSchema),
    mode: 'onChange',
    defaultValues: {
      student_id: '',
      session_id: '',
      subject: '',
      assessment_type: 'quiz',
      score: '',
      max_score: '',
      notes: '',
      graded_at: new Date().toISOString().split('T')[0],
    },
  })

  const formData = watch()

  const isTeacher = user?.role === 'teacher'

  // Récupérer les sessions assignées à l'enseignant (pour les enseignants)
  const { data: teacherSessionIds } = useQuery({
    queryKey: ['teacher-session-ids-evaluations', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('session_teachers')
        .select('session_id')
        .eq('teacher_id', user.id)
      if (error) {
        logger.error('Erreur récupération sessions enseignant', error)
        return []
      }
      return data?.map((st: any) => st.session_id) || []
    },
    enabled: !!user?.id && isTeacher,
  })

  // Récupérer les sessions pour les filtres
  // Pour les enseignants, filtrer uniquement par leurs sessions assignées
  const { data: sessions } = useQuery({
    queryKey: ['sessions-for-evaluations', user?.organization_id, isTeacher, teacherSessionIds],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      let query = supabase
        .from('sessions')
        .select('id, name, start_date, formations!inner(id, name, organization_id, programs(id, name))')
        .eq('formations.organization_id', user.organization_id)
        .order('start_date', { ascending: false })
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        query = query.in('id', teacherSessionIds)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner un tableau vide
        return []
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les étudiants pour les filtres
  // Pour les enseignants, filtrer uniquement les étudiants de leurs sessions assignées
  const { data: students } = useQuery({
    queryKey: ['students-for-evaluations', user?.organization_id, isTeacher, teacherSessionIds],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      // Si enseignant, récupérer uniquement les étudiants des sessions assignées
      if (isTeacher) {
        if (!teacherSessionIds || teacherSessionIds.length === 0) return []
        
        // Récupérer les étudiants via les inscriptions dans les sessions de l'enseignant
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('student_id, students(id, first_name, last_name, student_number, status)')
          .in('session_id', teacherSessionIds)
          .eq('status', 'active')
        
        if (enrollmentsError) throw enrollmentsError
        
        // Extraire les étudiants uniques
        const uniqueStudents = new Map()
        enrollments?.forEach((e: any) => {
          const student = e.students
          if (student && student.status === 'active' && !uniqueStudents.has(student.id)) {
            uniqueStudents.set(student.id, {
              id: student.id,
              first_name: student.first_name,
              last_name: student.last_name,
              student_number: student.student_number,
            })
          }
        })
        
        return Array.from(uniqueStudents.values()).sort((a, b) => 
          (a.last_name || '').localeCompare(b.last_name || '')
        )
      }
      
      // Pour les admins, récupérer tous les étudiants
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .order('last_name')
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les évaluations
  // Pour les enseignants, filtrer uniquement les évaluations des sessions assignées
  const { data: evaluations, isLoading } = useQuery({
    queryKey: [
      'evaluations',
      user?.organization_id,
      user?.id,
      isTeacher,
      teacherSessionIds,
      search,
      sessionFilter,
      studentFilter,
      typeFilter,
      subjectFilter,
      dateRange.start,
      dateRange.end,
    ],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      // Pour les enseignants, s'assurer que seules les sessions assignées sont incluses
      let sessionIdsForFilter = undefined
      if (isTeacher) {
        if (!teacherSessionIds || teacherSessionIds.length === 0) return []
        // Si un filtre de session spécifique est sélectionné, vérifier qu'il appartient aux sessions de l'enseignant
        if (sessionFilter !== 'all') {
          if (!teacherSessionIds.includes(sessionFilter)) {
            // La session sélectionnée n'appartient pas à l'enseignant
            return []
          }
          sessionIdsForFilter = [sessionFilter]
        } else {
          // Utiliser toutes les sessions de l'enseignant
          sessionIdsForFilter = teacherSessionIds
        }
      } else {
        // Pour les admins, utiliser le filtre de session s'il est sélectionné
        sessionIdsForFilter = sessionFilter !== 'all' ? [sessionFilter] : undefined
      }
      
      const filters = {
        sessionId: sessionIdsForFilter && sessionIdsForFilter.length === 1 ? sessionIdsForFilter[0] : undefined,
        sessionIds: sessionIdsForFilter && sessionIdsForFilter.length > 1 ? sessionIdsForFilter : undefined,
        studentId: studentFilter !== 'all' ? studentFilter : undefined,
        subject: subjectFilter !== 'all' ? subjectFilter : (search && search.trim() ? search.trim() : undefined),
        assessmentType: typeFilter !== 'all' ? typeFilter : undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      }
      logger.debug('Récupération des évaluations', { filters, organizationId: user.organization_id, isTeacher })
      
      // Utiliser le service qui gère maintenant sessionIds
      const result = await evaluationService.getAll(user.organization_id, filters)
      logger.debug('Évaluations récupérées', { count: result?.length || 0, filters })
      return result
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les statistiques
  const { data: stats } = useQuery({
    queryKey: ['evaluation-stats', user?.organization_id, sessionFilter, dateRange],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const stats = await evaluationService.getStats(user.organization_id, {
        sessionId: sessionFilter !== 'all' ? sessionFilter : undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      })
      
      // Préparer les données pour les graphiques
      const typeData = Object.entries(stats.byType).map(([type, count]) => ({
        name: ASSESSMENT_TYPES.find(t => t.value === type)?.label || type,
        value: count,
        color: type === 'quiz' ? '#3B82F6' : type === 'exam' ? '#8B5CF6' : type === 'project' ? '#10B981' : '#6B7280'
      })).filter(d => d.value > 0)

      return {
        ...stats,
        typeData
      }
    },
    enabled: !!user?.organization_id,
  })

  // Extraire les sujets uniques pour le filtre
  const uniqueSubjects = evaluations
    ? Array.from(new Set((evaluations as GradeWithRelations[]).map((e) => e.subject))).sort()
    : []

  // Mutations (create, update, delete) - gardées identiques mais simplifiées ici pour la lisibilité
  const createMutation = useMutation({
    mutationFn: async (data: EvaluationFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      return (evaluationService.create as any)(user.organization_id as string, {
        ...data,
        session_id: data.session_id || null,
        max_score: data.max_score ? parseFloat(data.max_score) : null,
        score: parseFloat(data.score),
        notes: data.notes || null,
        graded_at: data.graded_at || new Date().toISOString(),
        teacher_id: user.id,
      })
    },
    onSuccess: async () => {
      setShowCreateModal(false)
      reset()
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] })
      await queryClient.invalidateQueries({ queryKey: ['evaluation-stats'] })
      addToast({ type: 'success', title: 'Succès', description: 'Évaluation créée.' })
    },
    onError: (error: Error) => addToast({ type: 'error', title: 'Erreur', description: error.message })
  })

  const updateMutation = useMutation({
    mutationFn: async (data: EvaluationFormData) => {
      if (!editingEvaluation) throw new Error('Aucune évaluation sélectionnée')
      return (evaluationService.update as any)(editingEvaluation.id, {
        ...data,
        session_id: data.session_id || null,
        max_score: data.max_score ? parseFloat(data.max_score) : null,
        score: parseFloat(data.score),
        notes: data.notes || null,
        graded_at: data.graded_at || new Date().toISOString(),
      })
    },
    onSuccess: async () => {
      setEditingEvaluation(null)
      setShowCreateModal(false)
      reset()
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] })
      await queryClient.invalidateQueries({ queryKey: ['evaluation-stats'] })
      addToast({ type: 'success', title: 'Succès', description: 'Évaluation mise à jour.' })
    },
    onError: (error: Error) => addToast({ type: 'error', title: 'Erreur', description: error.message })
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => evaluationService.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] })
      await queryClient.invalidateQueries({ queryKey: ['evaluation-stats'] })
      addToast({ type: 'success', title: 'Succès', description: 'Évaluation supprimée.' })
    },
    onError: (error: Error) => addToast({ type: 'error', title: 'Erreur', description: error.message })
  })

  const handleEdit = (evaluation: Evaluation) => {
    setEditingEvaluation(evaluation)
    setValue('student_id', evaluation.student_id || '')
    setValue('session_id', evaluation.session_id || '')
    setValue('subject', evaluation.subject)
    setValue('assessment_type', (evaluation.assessment_type as AssessmentType) || 'quiz')
    setValue('score', evaluation.score?.toString() || '')
    setValue('max_score', evaluation.max_score?.toString() || '')
    setValue('notes', evaluation.notes || '')
    setValue('graded_at', evaluation.graded_at ? evaluation.graded_at.split('T')[0] : new Date().toISOString().split('T')[0])
    setShowCreateModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette évaluation ?')) return
    deleteMutation.mutate(id)
  }

  const onSubmit = (data: EvaluationFormData) => {
    if (editingEvaluation) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!evaluations || evaluations.length === 0) {
      addToast({ type: 'warning', title: 'Attention', description: 'Aucune donnée à exporter.' })
      return
    }

    try {
      const exportData = (evaluations as GradeWithRelations[]).map((grade) => ({
        'Date': grade.graded_at ? formatDate(grade.graded_at) : '',
        'Étudiant': grade.students ? `${grade.students.first_name} ${grade.students.last_name}` : '',
        'N° Étudiant': grade.students?.student_number || '',
        'Session': grade.sessions?.name || '',
        'Sujet': grade.subject,
        'Type': ASSESSMENT_TYPES.find((t) => t.value === grade.assessment_type)?.label || grade.assessment_type || '',
        'Note': grade.score,
        'Note max': grade.max_score || '',
        'Pourcentage': grade.percentage ? `${grade.percentage}%` : '',
        'Formateur': (grade as any).users?.full_name || '',
        'Notes': grade.notes || '',
      }))

      await exportToExcel({
        filename: `evaluations_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Évaluations',
        columns: [
          { header: 'Date', key: 'Date', width: 12 },
          { header: 'Étudiant', key: 'Étudiant', width: 20 },
          { header: 'N° Étudiant', key: 'N° Étudiant', width: 15 },
          { header: 'Session', key: 'Session', width: 30 },
          { header: 'Sujet', key: 'Sujet', width: 25 },
          { header: 'Type', key: 'Type', width: 20 },
          { header: 'Note', key: 'Note', width: 10 },
          { header: 'Note max', key: 'Note max', width: 10 },
          { header: 'Pourcentage', key: 'Pourcentage', width: 12 },
          { header: 'Formateur', key: 'Formateur', width: 20 },
          { header: 'Notes', key: 'Notes', width: 30 },
        ],
        data: exportData,
      })

      addToast({ type: 'success', title: 'Succès', description: `Export ${format.toUpperCase()} réussi.` })
    } catch (error) {
      logger.error('Erreur lors de l\'export des évaluations', { error })
      addToast({ type: 'error', title: 'Erreur', description: 'Erreur lors de l\'export des données.' })
    }
  }

  const getGradeColor = (percentage: number | null) => {
    if (percentage === null) return 'text-gray-500'
    if (percentage >= 80) return 'text-brand-blue'
    if (percentage >= 60) return 'text-brand-cyan'
    return 'text-red-600'
  }

  const getGradeIcon = (percentage: number | null) => {
    if (percentage === null) return <Clock className="h-4 w-4" />
    if (percentage >= 80) return <Award className="h-4 w-4 text-brand-blue" />
    if (percentage >= 60) return <CheckCircle className="h-4 w-4 text-brand-cyan" />
    return <XCircle className="h-4 w-4 text-red-600" />
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number] as [number, number, number, number]
      } 
    }
  }

  return (
    <motion.div 
      className="space-y-8 pb-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Premium */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              Évaluations
            </h1>
            <span className="px-3 py-1 bg-brand-blue-ghost text-brand-blue rounded-full text-sm font-medium">
              {evaluations?.length || 0} total
            </span>
          </div>
          <p className="text-gray-500 font-medium">
            Gérez les notes, examens et bulletins de performance
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/evaluations/templates">
            <Button variant="outline" className="shadow-sm hover:shadow transition-all">
              <Layout className="mr-2 h-4 w-4" />
              Modèles
            </Button>
          </Link>
          <Link href="/dashboard/evaluations/report-cards">
            <Button variant="outline" className="shadow-sm hover:shadow transition-all">
              <FileText className="mr-2 h-4 w-4" />
              Bulletins
            </Button>
          </Link>
          <Button variant="outline" onClick={() => handleExport('xlsx')} className="shadow-sm hover:shadow transition-all">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            onClick={() => { reset(); setEditingEvaluation(null); setShowCreateModal(true) }}
            className="shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle évaluation
          </Button>
        </div>
      </motion.div>

      {/* Stats Premium */}
      {stats && (
        <BentoGrid columns={4} gap="md">
          {[
            { 
              title: 'Total', 
              value: stats.total, 
              icon: FileCheck, 
              color: 'text-gray-600', 
              bg: 'bg-gray-100',
              desc: 'Évaluations réalisées'
            },
            { 
              title: 'Moyenne', 
              value: stats.averageScore.toFixed(1), 
              icon: TrendingUp, 
              color: 'text-brand-blue', 
              bg: 'bg-brand-blue-ghost',
              desc: 'Note globale moyenne'
            },
            { 
              title: 'Réussite', 
              value: `${stats.averagePercentage.toFixed(1)}%`, 
              icon: Award, 
              color: 'text-emerald-600', 
              bg: 'bg-emerald-50',
              desc: 'Taux moyen de réussite'
            },
            { 
              title: 'Types', 
              value: Object.keys(stats.byType).length, 
              icon: BookOpen, 
              color: 'text-purple-600', 
              bg: 'bg-purple-50',
              desc: 'Formats différents'
            },
          ].map((stat, index) => (
            <BentoCard key={stat.title} span={1} className="min-w-[200px]">
              <GlassCard 
                variant="premium" 
                hoverable 
                glow={index === 1}
                glowColor="rgba(59, 130, 246, 0.2)"
                className="h-full p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <motion.div
                    className={cn("p-2.5 rounded-xl transition-all duration-300", stat.bg)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </motion.div>
                  <span className={cn("text-2xl font-bold", stat.color)}>
                    {stat.value}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">{stat.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.desc}</p>
                </div>
              </GlassCard>
            </BentoCard>
          ))}
        </BentoGrid>
      )}

      {/* Graphiques Premium */}
      {stats && stats.typeData && stats.typeData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants} className="h-full">
            <GlassCard variant="default" className="p-6 h-full">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-blue" />
                  Répartition par type
                </h3>
              </div>
              <div className="h-[300px]">
                <PremiumPieChart
                  data={stats.typeData}
                  colors={stats.typeData.map(d => d.color)}
                  variant="default"
                  className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                  innerRadius={70}
                />
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants} className="h-full">
            <GlassCard variant="default" className="p-6 h-full flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 bg-brand-blue-ghost rounded-full flex items-center justify-center mb-4">
                <Star className="h-8 w-8 text-brand-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Performance Globale</h3>
              <p className="text-gray-500 max-w-sm mb-6">
                La moyenne de la classe est de <span className="font-bold text-gray-900">{stats.averageScore.toFixed(1)}</span> avec un taux de réussite de <span className="font-bold text-emerald-600">{stats.averagePercentage.toFixed(1)}%</span>.
              </p>
              <div className="w-full max-w-xs bg-gray-100 rounded-full h-3 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.averagePercentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan"
                />
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* Filtres Premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="default" className="p-2">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
              <input
                type="text"
                placeholder="Rechercher sujet, étudiant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
              />
            </div>
            
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 transition-all",
                showFilters ? "bg-brand-blue-ghost text-brand-blue" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Filter className="h-4 w-4" />
              Filtres avancés
            </Button>
            
            {(sessionFilter !== 'all' || studentFilter !== 'all' || typeFilter !== 'all' || subjectFilter !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSessionFilter('all')
                  setStudentFilter('all')
                  setTypeFilter('all')
                  setSubjectFilter('all')
                  setSearch('')
                }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Effacer
              </Button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-gray-100 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Session</label>
                    <select
                      value={sessionFilter}
                      onChange={(e) => setSessionFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-2 focus:ring-brand-blue/10 outline-none text-sm transition-all"
                    >
                      <option value="all">Toutes</option>
                      {(sessions as any[])?.map((session) => (
                        <option key={session.id} value={session.id}>{session.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-2 focus:ring-brand-blue/10 outline-none text-sm transition-all"
                    >
                      <option value="all">Tous</option>
                      {ASSESSMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Ajouter d'autres filtres si nécessaire */}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Liste des évaluations Premium */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !evaluations || evaluations.length === 0 ? (
          <GlassCard variant="default" className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Aucune évaluation trouvée</h3>
            <p className="text-gray-500 mb-6">Commencez par créer une évaluation pour un étudiant.</p>
            <Button onClick={() => { reset(); setEditingEvaluation(null); setShowCreateModal(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle évaluation
            </Button>
          </GlassCard>
        ) : (
          <GlassCard variant="default" className="overflow-hidden p-0">
            <div className="divide-y divide-gray-100">
              {(evaluations as GradeWithRelations[]).map((evaluation) => {
                const student = evaluation.students
                const session = evaluation.sessions
                const typeInfo = ASSESSMENT_TYPES.find((t) => t.value === evaluation.assessment_type)

                return (
                  <motion.div
                    key={evaluation.id}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                        {typeInfo?.icon || '📄'}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 truncate">
                            {evaluation.subject}
                          </h3>
                          {typeInfo && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md font-medium">
                              {typeInfo.label}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {student && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              <span className="font-medium text-gray-700">
                                {student.first_name} {student.last_name}
                              </span>
                            </div>
                          )}
                          {evaluation.graded_at && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(evaluation.graded_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-lg font-bold text-gray-900">
                            {evaluation.score}
                            {evaluation.max_score && <span className="text-gray-400 text-sm font-normal">/{evaluation.max_score}</span>}
                          </span>
                          {getGradeIcon(evaluation.percentage)}
                        </div>
                        {evaluation.percentage !== null && (
                          <p className={cn("text-xs font-medium", getGradeColor(evaluation.percentage))}>
                            {evaluation.percentage}% réussite
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(evaluation)}
                          className="h-8 w-8 text-gray-500 hover:text-brand-blue hover:bg-brand-blue-ghost"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(evaluation.id)}
                          className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </GlassCard>
        )}
      </motion.div>

      {/* Modal de création/édition */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEvaluation ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-6 max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Étudiant *</label>
                      <select
                        value={formData.student_id || ''}
                        onChange={(e) => setValue('student_id', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                        required
                      >
                        <option value="">Sélectionner un étudiant</option>
                        {(students as any[])?.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.first_name} {student.last_name} ({student.student_number})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Session</label>
                      <select
                        value={formData.session_id || ''}
                        onChange={(e) => setValue('session_id', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                      >
                        <option value="">Aucune session</option>
                        {(sessions as any[])?.map((session) => (
                          <option key={session.id} value={session.id}>
                            {session.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Sujet *</label>
                      <input
                        type="text"
                        value={formData.subject || ''}
                        onChange={(e) => setValue('subject', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                        placeholder="Ex: Mathématiques, Français..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Type d'évaluation *</label>
                      <select
                        value={formData.assessment_type || 'quiz'}
                        onChange={(e) => setValue('assessment_type', e.target.value as AssessmentType)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                        required
                      >
                        {ASSESSMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Note *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.score || ''}
                        onChange={(e) => setValue('score', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                        placeholder="0"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Note maximale</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.max_score || ''}
                        onChange={(e) => setValue('max_score', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                        placeholder="20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Date d'évaluation *</label>
                      <input
                        type="date"
                        value={formData.graded_at || ''}
                        onChange={(e) => setValue('graded_at', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Notes / Commentaires</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setValue('notes', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                      rows={3}
                      placeholder="Commentaires additionnels sur la performance..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="shadow-lg shadow-brand-blue/20"
                    >
                      {editingEvaluation ? 'Mettre à jour' : 'Créer l\'évaluation'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}










