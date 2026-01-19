'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, CheckCircle, Star, DollarSign, Download, User, TrendingUp, Sparkles, ClipboardList, GitBranch, AlertCircle, Calendar, GraduationCap } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useDocumentGeneration } from '../hooks/use-document-generation'
import { motion } from '@/components/ui/motion'
import { useAuth } from '@/lib/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { signatureService } from '@/lib/services/signature.service.client'
import { ElectronicAttendanceManager } from '@/components/attendance'
import dynamic from 'next/dynamic'

// Lazy load SessionTimeline avec gestion d'erreur
const SessionTimeline = dynamic(
  () => import('../components/session-timeline').then(mod => ({ default: mod.SessionTimeline })).catch((error) => {
    console.error('Erreur lors du chargement de SessionTimeline:', error)
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
import type {
  SessionWithRelations,
  EnrollmentWithRelations,
  FormationWithRelations,
  GradeWithRelations,
  StudentWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>

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
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-3 rounded-xl shadow-xl z-50">
        <p className="font-semibold text-gray-800 text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Suivi({
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
  grades = [],
  gradesStats,
  attendanceStats,
}: SuiviProps) {
  const { user } = useAuth()
  const {
    handleGenerateSessionReport,
  } = useDocumentGeneration({
    sessionData,
    formation,
    program,
    organization,
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
    { name: 'Présent', value: attendanceStats.present, color: '#335ACF' },
    { name: 'Absent', value: attendanceStats.absent, color: '#ef4444' },
    { name: 'En retard', value: attendanceStats.late, color: '#34B9EE' },
    { name: 'Justifié', value: attendanceStats.excused, color: '#3b82f6' },
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

  return (
    <Tabs defaultValue="statistics" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl">
        <TabsTrigger value="statistics" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-blue transition-all">
          <TrendingUp className="h-4 w-4 mr-2" />
          Statistiques
        </TabsTrigger>
        <TabsTrigger value="timeline" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-blue transition-all">
          <GitBranch className="h-4 w-4 mr-2" />
          Timeline & Tâches
        </TabsTrigger>
        <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-blue transition-all">
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
                hasConvocations: false, // TODO: Vérifier si les convocations ont été envoyées
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

      <TabsContent value="statistics" className="space-y-6">
      {/* KPIs Principaux ultra-premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Taux de présence',
            value: `${attendanceRate}%`,
            detail: `${attendanceStats?.present || 0} présent${(attendanceStats?.present || 0) > 1 ? 's' : ''} sur ${attendanceStats?.total || 0} séance${(attendanceStats?.total || 0) > 1 ? 's' : ''}`,
            icon: Activity,
            iconBg: 'bg-gradient-to-br from-brand-blue to-brand-blue-dark',
            cardBg: 'bg-gradient-to-br from-brand-blue/5 via-brand-blue/10 to-brand-cyan/5',
            borderColor: 'border-brand-blue/20',
            glowColor: 'rgba(39, 68, 114, 0.15)',
          },
          {
            label: 'Taux de complétion',
            value: `${completionRate}%`,
            detail: `${enrollments.filter((e) => e.status === 'completed').length} complété${enrollments.filter((e) => e.status === 'completed').length > 1 ? 's' : ''} sur ${enrollments.length} inscription${enrollments.length > 1 ? 's' : ''}`,
            icon: CheckCircle,
            iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            cardBg: 'bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50',
            borderColor: 'border-emerald-200',
            glowColor: 'rgba(16, 185, 129, 0.15)',
          },
          {
            label: 'Note moyenne',
            value: `${gradesStats?.average?.toFixed(1) || 0}/${gradesStats?.average ? Math.round(gradesStats.average * (100 / (gradesStats.averagePercentage || 1))) : 20}`,
            detail: gradesStats?.averagePercentage !== null && gradesStats?.averagePercentage !== undefined ? `${gradesStats.averagePercentage.toFixed(1)}% · ${gradesStats?.total || 0} note${(gradesStats?.total || 0) > 1 ? 's' : ''}` : `${gradesStats?.total || 0} note${(gradesStats?.total || 0) > 1 ? 's' : ''}`,
            icon: Star,
            iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
            cardBg: 'bg-gradient-to-br from-amber-50 via-amber-100/50 to-orange-50',
            borderColor: 'border-amber-200',
            glowColor: 'rgba(245, 158, 11, 0.15)',
          },
          {
            label: 'Taux de recouvrement',
            value: `${recoveryRate}%`,
            detail: `${formatCurrency(totalPaid, 'XOF')} payé sur ${formatCurrency(totalRevenue, 'XOF')}`,
            icon: DollarSign,
            iconBg: 'bg-gradient-to-br from-brand-cyan to-brand-cyan-dark',
            cardBg: 'bg-gradient-to-br from-brand-cyan/5 via-brand-cyan/10 to-brand-blue/5',
            borderColor: 'border-brand-cyan/20',
            glowColor: 'rgba(52, 185, 238, 0.15)',
          },
        ].map((stat, index) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.05,
              ease: [0.16, 1, 0.3, 1]
            }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="group relative"
          >
            <motion.div
              className={cn(
                "relative overflow-hidden rounded-3xl p-6 border transition-all duration-500 shadow-lg hover:shadow-2xl",
                stat.cardBg,
                stat.borderColor
              )}
              style={{
                boxShadow: `0 10px 40px -10px ${stat.glowColor}, 0 0 0 1px rgba(255, 255, 255, 0.1)`
              }}
            >
              {/* Shine effect */}
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <motion.div className={cn('p-3 rounded-2xl shadow-xl', stat.iconBg)}
                    whileHover={{ rotate: 12, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <stat.icon className="h-5 w-5 text-white" />
                  </motion.div>
                </div>

                <div className="text-4xl font-display font-bold tracking-tighter text-gray-900 leading-none mb-2">
                  {stat.value}
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1 opacity-80">
                  {stat.label}
                </p>
                <p className="text-xs text-gray-500 font-medium tracking-tight">
                  {stat.detail}
                </p>

                {/* Bottom accent bar */}
                <motion.div className="h-1.5 rounded-full mt-4"
                  style={{
                    background: stat.iconBg.replace('bg-gradient-to-br', 'linear-gradient(to right,')
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.05 + 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>

              {/* Glow effect on hover */}
              <motion.div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${stat.glowColor} 0%, transparent 70%)`
                }}
              />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Graphiques avec BentoGrid */}
      <BentoGrid columns={4} gap="md" className="auto-rows-[400px]">
        {/* Répartition des présences */}
        <BentoCard span={1}>
        <GlassCard variant="premium" className="h-full flex flex-col p-6 border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-brand-blue" />
            <h3 className="font-display font-bold text-gray-900">Présences</h3>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            {attendanceStats && attendanceStats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceStats ? [
                      { name: 'Présent', value: attendanceStats.present, color: '#335ACF' },
                      { name: 'Absent', value: attendanceStats.absent, color: '#ef4444' },
                      { name: 'En retard', value: attendanceStats.late, color: '#34B9EE' },
                      { name: 'Justifié', value: attendanceStats.excused, color: '#3b82f6' },
                    ] : []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attendanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs font-medium text-gray-600 ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Activity className="h-6 w-6 text-gray-400" />
                </div>
                <p>Aucune donnée de présence</p>
              </div>
            )}
          </div>
        </GlassCard>
        </BentoCard>

        {/* Statuts de paiement */}
        <BentoCard span={1}>
        <GlassCard variant="premium" className="h-full flex flex-col p-6 border-2 border-transparent hover:border-brand-cyan/10 transition-all duration-500 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="h-5 w-5 text-brand-cyan" />
            <h3 className="font-display font-bold text-gray-900">Paiements</h3>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            {enrollments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="status" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 10 }} 
                  />
                  <Tooltip cursor={{ fill: '#F3F4F6' }} content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.status === 'Payé' ? '#10B981' :
                        entry.status === 'En retard' ? '#EF4444' :
                        entry.status === 'Partiel' ? '#34B9EE' : '#9CA3AF'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                <div className="p-3 bg-gray-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <p>Aucune inscription</p>
              </div>
            )}
          </div>
        </GlassCard>
        </BentoCard>

        {/* Distribution des notes */}
        <BentoCard span={2}>
        <GlassCard variant="premium" className="h-full flex flex-col p-6 border-2 border-transparent hover:border-amber-400/10 transition-all duration-500 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <Star className="h-5 w-5 text-amber-500" />
            <h3 className="font-display font-bold text-gray-900">Distribution des notes</h3>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            {gradesStats && gradesStats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
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
                    }).length, color: '#10B981' },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="range" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 12 }} 
                  />
                  <Tooltip cursor={{ fill: '#F3F4F6' }} content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {
                      [0,1,2,3].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#EF4444', '#F59E0B', '#34B9EE', '#10B981'][index]} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Star className="h-6 w-6 text-gray-400" />
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
        <GlassCard variant="premium" className="overflow-hidden border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
          <div className="p-6 border-b border-gray-100/50 bg-gray-50/50 backdrop-blur-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-blue/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-brand-blue" />
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-900">Performance par apprenant</h3>
                <p className="text-sm text-gray-500">Suivi individuel détaillé</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
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
                <div className="group p-4 rounded-2xl border border-gray-200 bg-white hover:border-brand-blue/30 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-sm shadow-md">
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
                    <div className="flex justify-between items-center py-2 border-t border-dashed border-gray-200">
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        perf.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        perf.paymentStatus === 'partial' ? 'bg-brand-cyan-ghost text-brand-cyan border-brand-cyan/20' :
                        perf.paymentStatus === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {perf.paymentStatus === 'paid' ? 'PAYÉ' :
                         perf.paymentStatus === 'partial' ? 'PARTIEL' :
                         perf.paymentStatus === 'overdue' ? 'RETARD' : 'ATTENTE'}
                      </span>
                      <span className="text-xs font-medium text-gray-600">
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
            {sessionSignatures.map((signature: any) => (
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
                        {signature.document.students.first_name[0]}
                      </div>
                      <span className="text-xs text-gray-500">
                        {signature.document.students.first_name} {signature.document.students.last_name}
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
      <GlassCard variant="premium" className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-transparent hover:border-brand-blue/20 transition-all duration-500 bg-gradient-to-r from-brand-blue-ghost/20 to-transparent">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white rounded-2xl shadow-lg shadow-brand-blue/10">
            <Download className="h-8 w-8 text-brand-blue" />
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-gray-900 mb-1">Rapport de session complet</h3>
            <p className="text-gray-600 max-w-lg">
              Téléchargez un rapport PDF détaillé incluant toutes les statistiques, la progression, l'assiduité et les données financières.
            </p>
          </div>
        </div>
        <Button 
          onClick={handleGenerateSessionReport}
          className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-lg shadow-brand-blue/20 px-8 py-6 h-auto text-base font-bold rounded-xl"
        >
          <Download className="mr-2 h-5 w-5" />
          Exporter le PDF
        </Button>
      </GlassCard>
      </TabsContent>

      <TabsContent value="attendance" className="space-y-6">
        {sessionData?.id && user?.organization_id && (
          <GlassCard variant="premium" className="p-6">
            <ElectronicAttendanceManager
              sessionId={sessionData.id}
              organizationId={user.organization_id}
            />
          </GlassCard>
        )}
      </TabsContent>
    </Tabs>
  )
}
