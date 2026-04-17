'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, CheckCircle, Star, DollarSign, Download, User, TrendingUp, Sparkles, ClipboardList, GitBranch, AlertCircle, Calendar, GraduationCap, FileEdit, Plus, Pencil } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
// Lazy load recharts pour réduire le bundle initial
import {
  RechartsBarChart,
  RechartsBar,
  RechartsLineChart,
  RechartsLine,
  RechartsPieChart,
  RechartsPie,
  RechartsCell,
  RechartsXAxis,
  RechartsYAxis,
  RechartsCartesianGrid,
  RechartsTooltip,
  RechartsLegend,
  RechartsResponsiveContainer,
} from '@/components/charts/recharts-wrapper'
import { useDocumentGeneration } from '../hooks/use-document-generation'
import { useToast } from '@/components/ui/toast'
import { motion } from '@/components/ui/motion'
import { useAuth } from '@/lib/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { signatureService } from '@/lib/services/signature.service.client'
import { ElectronicAttendanceManager, PhysicalAttendanceSheetDownloader } from '@/components/attendance'
import dynamic from 'next/dynamic'
import type {
  SessionWithRelations,
  EnrollmentWithRelations,
  FormationWithRelations,
  GradeWithRelations,
  StudentWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { evaluationService } from '@/lib/services/evaluation.service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Lazy load SessionTimeline avec gestion d'erreur
const SessionTimeline = dynamic(
  () => import('../components/session-timeline').then(mod => ({ default: mod.SessionTimeline })).catch((error) => {
    logger.error('Erreur lors du chargement de SessionTimeline', sanitizeError(error))
    // Retourner un composant de fallback en cas d'erreur
    return { default: () => <div className="p-8 text-center text-red-500">Erreur lors du chargement de la timeline</div> }
  }),
  { 
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-gray-500">
        <p>Chargement de la timeline...</p>
      </div>
    ),
  }
)

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>
type SessionSlot = TableRow<'session_slots'>

type StudentPerformanceItem = {
  id: string
  student: {
    name: string
    number: string | null
  }
  attendanceRate: number
  avgGrade: number | null
  gradeCount: number
  paymentStatus: string | null
  paidAmount: number
  totalAmount: number
}

interface SuiviProps {
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
  enrollments?: EnrollmentWithRelations[]
  grades?: GradeWithRelations[]
  gradesStats?: {
    total: number
    average: number
    averagePercentage: number
  } | null
  attendanceStats?: {
    total: number
    present: number
    absent: number
    late: number
    excused: number
    byStudent: Record<string, { present: number; total: number }>
  } | null
  sessionId?: string
  sessionSlots?: SessionSlot[]
  onRefresh?: () => void
}

type TooltipEntry = { name?: string; value?: unknown; color?: string }
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-3 rounded-xl shadow-xl z-50">
        <p className="font-semibold text-gray-800 text-sm mb-1">{label}</p>
        {payload.map((entry: TooltipEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{String(entry.value ?? '')}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const EXAM_TYPES = ['exam', 'quiz']

export function Suivi({
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
  grades = [],
  gradesStats,
  attendanceStats,
  sessionId,
  sessionSlots = [],
  onRefresh,
}: SuiviProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [examFormOpen, setExamFormOpen] = useState(false)
  const [editingGrade, setEditingGrade] = useState<GradeWithRelations | null>(null)
  const [examForm, setExamForm] = useState({
    subject: '',
    student_id: '',
    score: '',
    max_score: '20',
    notes: '',
  })
  const [editForm, setEditForm] = useState({ score: '', max_score: '20' })
  const [isSubmittingExam, setIsSubmittingExam] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const {
    handleGenerateSessionReport,
  } = useDocumentGeneration({
    sessionData,
    formation,
    program,
    organization,
    enrollments,
    grades,
    attendanceStats,
  })

  // Récupérer les signatures liées à cette session
  const { data: sessionSignatures } = useQuery({
    queryKey: ['session-signatures', sessionData?.id, user?.organization_id],
    queryFn: () => {
      if (!sessionData?.id || !user?.organization_id) return []
      return signatureService.getSignaturesBySession(sessionData.id, user.organization_id)
    },
    enabled: !!sessionData?.id && !!user?.organization_id,
  })

  const attendanceRate = attendanceStats && attendanceStats.total > 0
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
    : 0

  const completionRate = enrollments.length > 0
    ? Math.round((enrollments.filter((e) => e.status === 'completed').length / enrollments.length) * 100)
    : 0

  const recoveryRate = enrollments.length > 0
    ? Math.round((
        enrollments.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0) /
        Math.max(enrollments.reduce((sum, e) => sum + Number(e.total_amount || 0), 1), 1)
      ) * 100)
    : 0

  const totalRevenue = enrollments.reduce((sum, e) => sum + Number(e.total_amount || 0), 0)
  const totalPaid = enrollments.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0)

  // Préparer les données pour les graphiques
  const attendanceDistribution = attendanceStats ? [
    { name: 'Présent', value: attendanceStats.present, color: '#274472' }, // brand-blue
    { name: 'Absent', value: attendanceStats.absent, color: '#EF4444' }, // red-500
    { name: 'En retard', value: attendanceStats.late, color: '#34B9EE' }, // brand-cyan
    { name: 'Justifié', value: attendanceStats.excused, color: '#9CA3AF' }, // gray-400
  ] : []

  const paymentStatusData = [
    {
      status: 'En attente',
      count: enrollments.filter((e) => e.payment_status === 'pending').length,
    },
    {
      status: 'Partiel',
      count: enrollments.filter((e) => e.payment_status === 'partial').length,
    },
    {
      status: 'Payé',
      count: enrollments.filter((e) => e.payment_status === 'paid').length,
    },
    {
      status: 'En retard',
      count: enrollments.filter((e) => e.payment_status === 'overdue').length,
    },
  ]

  // Calculer les notes moyennes par apprenant
  const studentPerformanceRaw = enrollments.map((enrollment) => {
      const student = enrollment.students as StudentWithRelations | null
      if (!student) return null

      const studentGrades = grades.filter((g) => g.student_id === enrollment.student_id)
      const avgGrade = studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => {
            const maxScore = Number(g.max_score) || 20
            const score = Number(g.score) || 0
            return sum + (score / maxScore) * 20
          }, 0) / studentGrades.length
        : null

      const studentAttendance = enrollment.student_id 
        ? (attendanceStats?.byStudent?.[enrollment.student_id] || {
            present: 0,
            total: 0,
          })
        : {
            present: 0,
            total: 0,
          }
      const studentAttendanceRate = studentAttendance.total > 0
        ? Math.round((studentAttendance.present / studentAttendance.total) * 100)
        : 0

      return {
        id: enrollment.id,
        student: {
          name: `${student.first_name} ${student.last_name}`,
          number: student.student_number,
        },
        attendanceRate: studentAttendanceRate,
        avgGrade,
        gradeCount: studentGrades.length,
        paymentStatus: enrollment.payment_status,
        paidAmount: Number(enrollment.paid_amount || 0),
        totalAmount: Number(enrollment.total_amount || 0),
      }
    })
  
  const studentPerformance: StudentPerformanceItem[] = studentPerformanceRaw.filter((item) => item !== null) as StudentPerformanceItem[]

  const examGrades = (grades || []).filter((g: GradeWithRelations) => EXAM_TYPES.includes((g.assessment_type as string) || ''))

  const handleAddExamResult = async () => {
    if (!user?.organization_id || !sessionId || !examForm.subject.trim() || !examForm.student_id) return
    setIsSubmittingExam(true)
    try {
      await evaluationService.create(user.organization_id, {
        session_id: sessionId,
        student_id: examForm.student_id,
        subject: examForm.subject.trim(),
        assessment_type: 'exam',
        score: examForm.score ? parseFloat(examForm.score) : null,
        max_score: examForm.max_score ? parseFloat(examForm.max_score) : 20,
        notes: examForm.notes || null,
        graded_at: new Date().toISOString(),
        teacher_id: user.id || null,
      })
      queryClient.invalidateQueries({ queryKey: ['session-grades', sessionId] })
      onRefresh?.()
      setExamFormOpen(false)
      setExamForm({ subject: '', student_id: '', score: '', max_score: '20', notes: '' })
      addToast({ type: 'success', title: 'Résultat enregistré', description: 'Le résultat d\'examen a été ajouté.' })
    } catch (err: unknown) {
      logger.error('Erreur ajout résultat examen', err)
      addToast({ type: 'error', title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible d\'enregistrer le résultat.' })
    } finally {
      setIsSubmittingExam(false)
    }
  }

  const handleSaveExamEdit = async () => {
    if (!editingGrade?.id) return
    setIsSavingEdit(true)
    try {
      const score = editForm.score ? parseFloat(editForm.score) : null
      const maxScore = editForm.max_score ? parseFloat(editForm.max_score) : 20
      await evaluationService.update(editingGrade.id, { score, max_score: maxScore })
      queryClient.invalidateQueries({ queryKey: ['session-grades', sessionId] })
      onRefresh?.()
      setEditingGrade(null)
      addToast({ type: 'success', title: 'Note mise à jour', description: 'La note a été enregistrée.' })
    } catch (err: unknown) {
      logger.error('Erreur mise à jour note', err)
      addToast({ type: 'error', title: 'Erreur', description: err instanceof Error ? err.message : 'Impossible de mettre à jour la note.' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <Tabs defaultValue="statistics" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 p-1 bg-white border border-gray-200 rounded-xl">
        <TabsTrigger value="statistics" className="rounded-lg data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue text-gray-500 font-medium transition-all">
          <TrendingUp className="h-4 w-4 mr-2" />
          Statistiques
        </TabsTrigger>
        <TabsTrigger value="timeline" className="rounded-lg data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue text-gray-500 font-medium transition-all">
          <GitBranch className="h-4 w-4 mr-2" />
          Timeline & Tâches
        </TabsTrigger>
        <TabsTrigger value="examens" className="rounded-lg data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue text-gray-500 font-medium transition-all">
          <FileEdit className="h-4 w-4 mr-2" />
          Résultats d'examens
        </TabsTrigger>
        <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue text-gray-500 font-medium transition-all">
          <ClipboardList className="h-4 w-4 mr-2" />
          Émargements
        </TabsTrigger>
      </TabsList>

      <TabsContent value="timeline" className="space-y-6">
        {sessionData?.id ? (
          <GlassCard variant="premium" className="p-6">
            <SessionTimeline
              sessionId={sessionData.id}
              sessionData={{
                name: sessionData.name || '',
                start_date: sessionData.start_date || '',
                end_date: sessionData.end_date || '',
                status: sessionData.status || 'planned',
                enrollmentsCount: enrollments.length,
                hasConventions: enrollments.some(e => e.status === 'confirmed'),
                hasConvocations: false, // NOTE: À implémenter - Vérifier depuis la table convocations ou emails envoyés
                attendanceRate,
                invoicesGenerated: enrollments.some(e => e.payment_status !== 'pending'),
                evaluationsCompleted: !!(gradesStats && gradesStats.total > 0),
              }}
            />
          </GlassCard>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>Chargement des données de session...</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="examens" className="space-y-6">
        <GlassCard variant="premium" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-bold text-gray-900">Résultats des examens</h3>
              <p className="text-sm text-gray-500">Saisir et consulter les notes d'examens et quiz de la session.</p>
            </div>
            {sessionId && user?.organization_id && (
              <Button onClick={() => setExamFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un résultat
              </Button>
            )}
          </div>
          {examGrades.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-gray-50 border border-dashed border-gray-200">
              <FileEdit className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Aucun résultat d'examen enregistré</p>
              <p className="text-sm text-gray-500 mt-1">Ajoutez les notes des examens ou quiz de la session.</p>
              {sessionId && user?.organization_id && (
                <Button variant="outline" className="mt-4" onClick={() => setExamFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un résultat
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-700">Apprenant</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Sujet / Type</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Note</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Date</th>
                    {sessionId && <th className="w-10 p-3" />}
                  </tr>
                </thead>
                <tbody>
                  {examGrades.map((g: GradeWithRelations) => {
                    const student = (g as GradeWithRelations & { students?: { first_name?: string; last_name?: string } }).students
                    const name = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || '—' : '—'
                    return (
                      <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="p-3 text-gray-900">{name}</td>
                        <td className="p-3">
                          <span className="font-medium text-gray-800">{g.subject || '—'}</span>
                          <span className="ml-2 text-xs text-gray-500">({g.assessment_type === 'quiz' ? 'Quiz' : 'Examen'})</span>
                        </td>
                        <td className="p-3">
                          {editingGrade?.id === g.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                className="w-20 h-8"
                                value={editForm.score}
                                onChange={(e) => setEditForm((f) => ({ ...f, score: e.target.value }))}
                              />
                              <span>/</span>
                              <Input
                                type="number"
                                step="0.01"
                                className="w-16 h-8"
                                value={editForm.max_score}
                                onChange={(e) => setEditForm((f) => ({ ...f, max_score: e.target.value }))}
                              />
                              <Button size="sm" onClick={handleSaveExamEdit} disabled={isSavingEdit}>
                                {isSavingEdit ? '...' : 'Enregistrer'}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingGrade(null)}>Annuler</Button>
                            </div>
                          ) : (
                            <span className="font-medium">
                              {g.score != null ? Number(g.score) : '—'} / {g.max_score != null ? Number(g.max_score) : 20}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-500">{g.graded_at ? formatDate(g.graded_at) : '—'}</td>
                        {sessionId && (
                          <td className="p-3">
                            {editingGrade?.id !== g.id && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                                setEditingGrade(g)
                                setEditForm({ score: g.score != null ? String(g.score) : '', max_score: g.max_score != null ? String(g.max_score) : '20' })
                              }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </TabsContent>

      <TabsContent value="statistics" className="space-y-6">
      {/* KPIs Principaux - Style unifié et sobre */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Taux de présence',
            value: `${attendanceRate}%`,
            detail: `${attendanceStats?.present || 0} présent${(attendanceStats?.present || 0) > 1 ? 's' : ''} sur ${attendanceStats?.total || 0} séance${(attendanceStats?.total || 0) > 1 ? 's' : ''}`,
            icon: Activity,
            iconBg: 'bg-brand-blue/10',
            iconColor: 'text-brand-blue',
            cardBg: 'bg-white',
            borderColor: 'border-brand-blue/10',
          },
          {
            label: 'Taux de complétion',
            value: `${completionRate}%`,
            detail: `${enrollments.filter((e) => e.status === 'completed').length} complété${enrollments.filter((e) => e.status === 'completed').length > 1 ? 's' : ''} sur ${enrollments.length} inscription${enrollments.length > 1 ? 's' : ''}`,
            icon: CheckCircle,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            cardBg: 'bg-white',
            borderColor: 'border-emerald-100',
          },
          {
            label: 'Note moyenne',
            value: `${gradesStats?.average?.toFixed(1) || 0}/${gradesStats?.average ? Math.round(gradesStats.average * (100 / (gradesStats.averagePercentage || 1))) : 20}`,
            detail: gradesStats?.averagePercentage !== null && gradesStats?.averagePercentage !== undefined ? `${gradesStats.averagePercentage.toFixed(1)}% · ${gradesStats?.total || 0} note${(gradesStats?.total || 0) > 1 ? 's' : ''}` : `${gradesStats?.total || 0} note${(gradesStats?.total || 0) > 1 ? 's' : ''}`,
            icon: Star,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-500',
            cardBg: 'bg-white',
            borderColor: 'border-amber-100',
          },
          {
            label: 'Taux de recouvrement',
            value: `${recoveryRate}%`,
            detail: `${formatCurrency(totalPaid, formation?.currency || 'EUR')} payé sur ${formatCurrency(totalRevenue, formation?.currency || 'EUR')}`,
            icon: DollarSign,
            iconBg: 'bg-brand-cyan/10',
            iconColor: 'text-brand-cyan-dark',
            cardBg: 'bg-white',
            borderColor: 'border-brand-cyan/10',
          },
        ].map((stat, index) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: index * 0.05,
            }}
            className="group relative"
          >
            <div
              className={cn(
                "relative overflow-hidden rounded-xl p-6 border transition-all duration-300 hover:shadow-md",
                stat.cardBg,
                stat.borderColor
              )}
            >
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('p-2.5 rounded-xl', stat.iconBg)}>
                    <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                  </div>
                </div>

                <div className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                  {stat.value}
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {stat.label}
                </p>
                <p className="text-xs text-gray-400 font-medium">
                  {stat.detail}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Graphiques avec BentoGrid */}
      <BentoGrid columns={4} gap="md" className="auto-rows-[400px]">
        {/* Répartition des présences */}
        <BentoCard span={1}>
        <GlassCard variant="premium" className="h-full flex flex-col p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 min-w-0 bg-white">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-brand-blue/10 rounded-lg">
              <Activity className="h-5 w-5 text-brand-blue" />
            </div>
            <h3 className="font-bold text-gray-900">Présences</h3>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            {attendanceStats && attendanceStats.total > 0 ? (
              <RechartsResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <RechartsPie
                    data={attendanceStats ? [
                      { name: 'Présent', value: attendanceStats.present, color: '#274472' }, // brand-blue
                      { name: 'Absent', value: attendanceStats.absent, color: '#EF4444' }, // red-500
                      { name: 'En retard', value: attendanceStats.late, color: '#34B9EE' }, // brand-cyan
                      { name: 'Justifié', value: attendanceStats.excused, color: '#9CA3AF' }, // gray-400
                    ] : []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    {...({} as any)}
                  >
                    {attendanceDistribution.map((entry, index) => (
                      <RechartsCell key={`cell-${index}`} fill={entry.color} strokeWidth={0} {...({} as any)} />
                    ))}
                  </RechartsPie>
                  <RechartsTooltip content={<CustomTooltip />} {...({} as any)} />
                  <RechartsLegend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value: any) => <span className="text-xs font-medium text-gray-600 ml-1">{value}</span>}
                    {...({} as any)}
                  />
                </RechartsPieChart>
              </RechartsResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                <div className="p-3 bg-gray-50 rounded-full">
                  <Activity className="h-6 w-6 text-gray-300" />
                </div>
                <p>Aucune donnée de présence</p>
              </div>
            )}
          </div>
        </GlassCard>
        </BentoCard>

        {/* Statuts de paiement */}
        <BentoCard span={1}>
        <GlassCard variant="premium" className="h-full flex flex-col p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 min-w-0 bg-white">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-brand-cyan/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-brand-cyan-dark" />
            </div>
            <h3 className="font-bold text-gray-900">Paiements</h3>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            {enrollments.length > 0 ? (
              <RechartsResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={paymentStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} {...({} as any)}>
                  <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" {...({} as any)} />
                  <RechartsXAxis 
                    dataKey="status" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                    dy={10}
                    {...({} as any)}
                  />
                  <RechartsYAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 10 }} 
                    {...({} as any)}
                  />
                  <RechartsTooltip cursor={{ fill: '#F9FAFB' }} content={<CustomTooltip />} {...({} as any)} />
                  <RechartsBar dataKey="count" radius={[4, 4, 0, 0]} {...({} as any)}>
                    {paymentStatusData.map((entry, index) => (
                      <RechartsCell key={`cell-${index}`} fill={
                        entry.status === 'Payé' ? '#274472' : // brand-blue
                        entry.status === 'En retard' ? '#EF4444' : // red-500
                        entry.status === 'Partiel' ? '#34B9EE' : '#E5E7EB' // brand-cyan or gray-200
                      } {...({} as any)} />
                    ))}
                  </RechartsBar>
                </RechartsBarChart>
              </RechartsResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                <div className="p-3 bg-gray-50 rounded-full">
                  <DollarSign className="h-6 w-6 text-gray-300" />
                </div>
                <p>Aucune inscription</p>
              </div>
            )}
          </div>
        </GlassCard>
        </BentoCard>

        {/* Distribution des notes */}
        <BentoCard span={2}>
        <GlassCard variant="premium" className="h-full flex flex-col p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 min-w-0 bg-white">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Star className="h-5 w-5 text-amber-500" />
            </div>
            <h3 className="font-bold text-gray-900">Distribution des notes</h3>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            {gradesStats && gradesStats.total > 0 ? (
              <RechartsResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={[
                    { range: '0-5', count: grades.filter((g) => {
                      const score = Number(g.score) || 0
                      const maxScore = Number(g.max_score) || 20
                      return (score / maxScore) * 20 >= 0 && (score / maxScore) * 20 < 5
                    }).length, color: '#EF4444' },
                    { range: '5-10', count: grades.filter((g) => {
                      const score = Number(g.score) || 0
                      const maxScore = Number(g.max_score) || 20
                      return (score / maxScore) * 20 >= 5 && (score / maxScore) * 20 < 10
                    }).length, color: '#F59E0B' },
                    { range: '10-15', count: grades.filter((g) => {
                      const score = Number(g.score) || 0
                      const maxScore = Number(g.max_score) || 20
                      return (score / maxScore) * 20 >= 10 && (score / maxScore) * 20 < 15
                    }).length, color: '#34B9EE' },
                    { range: '15-20', count: grades.filter((g) => {
                      const score = Number(g.score) || 0
                      const maxScore = Number(g.max_score) || 20
                      return (score / maxScore) * 20 >= 15 && (score / maxScore) * 20 <= 20
                    }).length, color: '#274472' }, // brand-blue
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  {...({} as any)}
                >
                  <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" {...({} as any)} />
                  <RechartsXAxis 
                    dataKey="range" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    dy={10}
                    {...({} as any)}
                  />
                  <RechartsYAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 12 }} 
                    {...({} as any)}
                  />
                  <RechartsTooltip cursor={{ fill: '#F9FAFB' }} content={<CustomTooltip />} {...({} as any)} />
                  <RechartsBar dataKey="count" radius={[6, 6, 0, 0]} {...({} as any)}>
                    {
                      [0,1,2,3].map((entry, index) => (
                        <RechartsCell key={`cell-${index}`} fill={['#EF4444', '#F59E0B', '#34B9EE', '#274472'][index]} {...({} as any)} />
                      ))
                    }
                  </RechartsBar>
                </RechartsBarChart>
              </RechartsResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                <div className="p-3 bg-gray-50 rounded-full">
                  <Star className="h-6 w-6 text-gray-300" />
                </div>
                <p>Aucune note enregistrée</p>
              </div>
            )}
          </div>
        </GlassCard>
        </BentoCard>
      </BentoGrid>

      {/* Performance par apprenant */}
      {studentPerformance.length > 0 && (
        <GlassCard variant="premium" className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
          <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-blue/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-brand-blue" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Performance par apprenant</h3>
                <p className="text-sm text-gray-500">Suivi individuel détaillé</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 border-gray-200 hover:bg-gray-50 text-gray-700">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentPerformance.map((perf, index) => (
              <motion.div
                key={perf.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="group p-4 rounded-xl border border-gray-200 bg-white hover:border-brand-blue/30 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-sm">
                      {perf.student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 line-clamp-1 group-hover:text-brand-blue transition-colors">{perf.student.name}</p>
                      <p className="text-xs text-gray-500">{perf.student.number || 'Sans matricule'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Présence */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Présence</span>
                        <span className="font-bold text-gray-900">{perf.attendanceRate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-blue rounded-full" 
                          style={{ width: `${perf.attendanceRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Note */}
                    <div className="flex justify-between items-center py-2 border-t border-dashed border-gray-100">
                      <span className="text-xs text-gray-500">Moyenne</span>
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold text-gray-900">
                          {perf.avgGrade !== null ? perf.avgGrade.toFixed(2) : '-'}
                          <span className="text-xs text-gray-400 font-normal">/20</span>
                        </span>
                      </div>
                    </div>

                    {/* Paiement */}
                    <div className="flex justify-between items-center pt-1">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        perf.paymentStatus === 'paid' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20' :
                        perf.paymentStatus === 'partial' ? 'bg-brand-cyan/10 text-brand-cyan-dark border-brand-cyan/20' :
                        perf.paymentStatus === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      )}>
                        {perf.paymentStatus === 'paid' ? 'PAYÉ' :
                         perf.paymentStatus === 'partial' ? 'PARTIEL' :
                         perf.paymentStatus === 'overdue' ? 'RETARD' : 'ATTENTE'}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        {Math.round((perf.paidAmount / Math.max(perf.totalAmount, 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Historique des signatures */}
      {sessionData?.id && user?.organization_id && sessionSignatures && sessionSignatures.length > 0 && (
        <GlassCard variant="premium" className="overflow-hidden border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
          <div className="p-6 border-b border-gray-100/50 bg-gray-50/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-900">Historique des signatures</h3>
                <p className="text-sm text-gray-500">{sessionSignatures.length} document{sessionSignatures.length > 1 ? 's' : ''} signé{sessionSignatures.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {sessionSignatures.map((signature) => (
              <div
                key={signature.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-20 h-14 border rounded-lg bg-white p-1 flex items-center justify-center shadow-sm">
                  <img
                    src={signature.signature_data}
                    alt={`Signature de ${signature.signer_name}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-900 text-sm">
                      {signature.signer_name || signature.signer?.full_name || 'Signataire inconnu'}
                    </p>
                    <span className="text-xs text-gray-400">
                      {formatDate(signature.signed_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    {signature.document?.title || 'Document sans titre'}
                  </p>
                  {signature.document?.students && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                        {signature.document.students.first_name?.[0] ?? ''}
                      </div>
                      <span className="text-xs text-gray-500">
                        {signature.document.students.first_name ?? ''} {signature.document.students.last_name ?? ''}
                      </span>
                    </div>
                  )}
                </div>
                {signature.comment && (
                   <div className="hidden md:block text-xs italic text-gray-400 max-w-[200px] truncate bg-gray-50 px-2 py-1 rounded">
                     "{signature.comment}"
                   </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Rapport de session */}
      <GlassCard variant="premium" className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-brand-blue/10 hover:border-brand-blue/20 transition-all duration-300 bg-brand-blue/5">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white rounded-xl shadow-sm border border-brand-blue/10">
            <Download className="h-8 w-8 text-brand-blue" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Rapport de session complet</h3>
            <p className="text-gray-600 max-w-lg">
              Téléchargez un rapport PDF détaillé incluant toutes les statistiques, la progression, l'assiduité et les données financières.
            </p>
          </div>
        </div>
        <Button 
          onClick={() => handleGenerateSessionReport()}
          className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-md shadow-brand-blue/10 px-8 py-6 h-auto text-base font-bold rounded-xl"
        >
          <Download className="mr-2 h-5 w-5" />
          Exporter le PDF
        </Button>
      </GlassCard>
      </TabsContent>

      <TabsContent value="attendance" className="space-y-6">
        {/* Feuilles d'émargement physiques */}
        {sessionData?.id && organization && (
          <GlassCard variant="premium" className="p-6">
            <PhysicalAttendanceSheetDownloader
              sessionId={sessionData.id}
              sessionName={sessionData.name || 'Session'}
              sessionSlots={sessionSlots}
              students={enrollments
                .filter((e) => e.students && e.status !== 'cancelled')
                .map((e) => ({
                  id: e.students?.id || '',
                  first_name: e.students?.first_name || null,
                  last_name: e.students?.last_name || null,
                  student_number: e.students?.student_number || null,
                  email: e.students?.email || null,
                }))}
              organizationName={organization.name || 'Organisation'}
              organizationAddress={organization.address || undefined}
              formationName={formation?.name}
            />
          </GlassCard>
        )}

        {/* Émargement électronique */}
        {sessionData?.id && user?.organization_id && (
          <GlassCard variant="premium" className="p-6">
            <ElectronicAttendanceManager
              sessionId={sessionData.id}
              organizationId={user.organization_id}
            />
          </GlassCard>
        )}
      </TabsContent>

      {/* Dialog ajout résultat d'examen */}
      <Dialog open={examFormOpen} onOpenChange={setExamFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un résultat d'examen</DialogTitle>
            <DialogDescription>
              Saisissez la note d'un examen ou quiz pour un apprenant de la session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Sujet / Intitulé</Label>
              <Input
                value={examForm.subject}
                onChange={(e) => setExamForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Ex. Examen final, Quiz module 1"
              />
            </div>
            <div className="grid gap-2">
              <Label>Apprenant</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={examForm.student_id}
                onChange={(e) => setExamForm((f) => ({ ...f, student_id: e.target.value }))}
              >
                <option value="">Sélectionner un apprenant</option>
                {enrollments.filter((e) => e.status !== 'cancelled').map((e) => {
                  const s = (e as EnrollmentWithRelations).students as StudentWithRelations | null
                  const name = s ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : e.student_id
                  return (
                    <option key={e.id} value={e.student_id || ''}>
                      {name || e.student_id}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Note</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={examForm.score}
                  onChange={(e) => setExamForm((f) => ({ ...f, score: e.target.value }))}
                  placeholder="12.5"
                />
              </div>
              <div className="grid gap-2">
                <Label>Note max</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={examForm.max_score}
                  onChange={(e) => setExamForm((f) => ({ ...f, max_score: e.target.value }))}
                  placeholder="20"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Commentaire (optionnel)</Label>
              <Input
                value={examForm.notes}
                onChange={(e) => setExamForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Remarques"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamFormOpen(false)}>Annuler</Button>
            <Button onClick={handleAddExamResult} disabled={!examForm.subject.trim() || !examForm.student_id || isSubmittingExam}>
              {isSubmittingExam ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
