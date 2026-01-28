'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { attendanceService } from '@/lib/services/attendance.service.client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Calendar, Users, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, Download, Filter, X, FileText, BarChart3, ArrowRight, UserCheck, UserX, UserMinus, RefreshCw, ClipboardCheck, ArrowUpRight, Percent, Hand, Mail } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import Link from 'next/link'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { PremiumLineChart } from '@/components/charts/premium-line-chart'
import { PremiumPieChart } from '@/components/charts/premium-pie-chart'
import { PremiumBarChart } from '@/components/charts/premium-bar-chart'
import { exportToExcel, exportToCSV } from '@/lib/utils/excel-export'
import type { SessionWithRelations, AttendanceWithRelations } from '@/lib/types/query-types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function AttendancePage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [selectedSlotId, setSelectedSlotId] = useState<string>('')
  const [periodFilter, setPeriodFilter] = useState<string>('week') // week, month, quarter
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedReportMonth, setSelectedReportMonth] = useState(new Date().toISOString().slice(0, 7)) // Format YYYY-MM
  const [selectedReportYear, setSelectedReportYear] = useState(new Date().getFullYear().toString())
  const [attendanceModeDialogOpen, setAttendanceModeDialogOpen] = useState(false)

  const isTeacher = user?.role === 'teacher'

  // Récupérer les sessions assignées à l'enseignant (pour les enseignants)
  // Avec fallback via sessions.teacher_id si session_teachers est vide
  const { data: teacherSessionIds } = useQuery({
    queryKey: ['teacher-session-ids', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      // D'abord, essayer via session_teachers
      const { data: sessionTeachers, error: sessionTeachersError } = await supabase
        .from('session_teachers')
        .select('session_id')
        .eq('teacher_id', user.id)
      
      if (sessionTeachersError) {
        logger.error('Erreur récupération session_teachers', sanitizeError(sessionTeachersError))
      }
      
      if (sessionTeachers && sessionTeachers.length > 0) {
        return sessionTeachers.map((st: any) => st.session_id)
      }
      
      // Fallback : récupérer via sessions.teacher_id
      // Note: Ce fallback est normal si session_teachers n'est pas encore synchronisé
      logger.debug('session_teachers vide, utilisation du fallback via sessions.teacher_id pour présences')
      const { data: sessionsByTeacherId, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('teacher_id', user.id)
      
      if (sessionsError) {
        logger.error('Erreur récupération sessions via teacher_id', sanitizeError(sessionsError))
        return []
      }
      
      return (sessionsByTeacherId || []).map((s: any) => s.id)
    },
    enabled: !!user?.id && isTeacher,
  })

  // Récupérer toutes les sessions (remplace les classes)
  // Pour les enseignants, filtrer par leurs sessions assignées
  const { data: allSessions } = useQuery({
    queryKey: ['program-sessions-all', user?.organization_id, isTeacher, teacherSessionIds],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      let query = supabase
        .from('sessions')
        .select('id, name, start_date, end_date, formations!inner(id, name, code, organization_id, programs(id, name))')
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
      return (data as SessionWithRelations[])?.map((session) => ({
        id: session.id,
        name: `${session.name} - ${session.formations?.name || ''}${session.formations?.programs ? ` (${session.formations.programs.name})` : ''}`,
        code: session.formations?.code || '',
        start_date: session.start_date,
        end_date: session.end_date,
      })) || []
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les séances (slots) de la session sélectionnée
  const { data: sessionSlots } = useQuery({
    queryKey: ['session-slots', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return []
      const { data, error } = await supabase
        .from('session_slots')
        .select('*')
        .eq('session_id', selectedSessionId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      if (error) {
        logger.warn('Erreur récupération séances', sanitizeError(error))
        return []
      }
      return data || []
    },
    enabled: !!selectedSessionId,
  })

  // Récupérer les sessions à venir (pour aujourd'hui)
  // Pour les enseignants, filtrer par leurs sessions assignées
  const { data: sessions } = useQuery({
    queryKey: ['upcoming-sessions', user?.organization_id, isTeacher, teacherSessionIds],
    queryFn: async () => {
      if (!user?.organization_id) return []
      // Récupérer les sessions à venir d'aujourd'hui
      const today = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('sessions')
        .select('*, formations!inner(*, programs(*))')
        .eq('formations.organization_id', user.organization_id)
        .gte('start_date', today)
        .lte('end_date', today)
        .in('status', ['planned', 'ongoing'])
        .order('start_date', { ascending: true })
        .limit(10)
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        query = query.in('id', teacherSessionIds)
      } else if (isTeacher) {
        return []
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les statistiques du jour basées UNIQUEMENT sur les données réelles de la table attendance
  // Pour les enseignants, filtrer uniquement les émargements des sessions assignées
  const { data: todayStats, refetch: refetchTodayStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['attendance-stats', user?.organization_id, user?.id, isTeacher, teacherSessionIds, selectedDate],
    queryFn: async () => {
      if (!user?.organization_id) {
        logger.warn('[ATTENDANCE STATS] Pas d\'organisation ID')
        return null
      }

      const dateStr = selectedDate

      // 1. Récupérer les séances (slots) prévues pour cette date
      // Pour les enseignants, filtrer directement par leurs sessions assignées
      let slotsQuery = supabase
        .from('session_slots')
        .select('id, session_id, date, time_slot')
        .eq('date', dateStr)
      
      // Si l'enseignant a des sessions assignées, filtrer les slots par ces sessions
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        slotsQuery = slotsQuery.in('session_id', teacherSessionIds)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner des stats vides
        return {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0,
          statusData: []
        }
      }
      
      const { data: slotsForDate, error: slotsError } = await slotsQuery
      
      if (slotsError) {
        logger.warn('[ATTENDANCE STATS] ⚠️ Erreur récupération slots', sanitizeError(slotsError))
      }

      const sessionIds = (slotsForDate as Array<{ session_id: string }>)?.map(s => s.session_id) || []
      const slotIds = (slotsForDate as Array<{ id: string }>)?.map(s => s.id) || []

      // Si aucun slot trouvé (pour les enseignants, cela signifie qu'ils n'ont pas de sessions ce jour-là)
      if (isTeacher && (!sessionIds || sessionIds.length === 0)) {
        return {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0,
          statusData: []
        }
      }

      // 2. Récupérer les émargements pour cette date
      // Pour les enseignants, filtrer uniquement les émargements des sessions assignées
      let attendanceQuery = supabase
        .from('attendance')
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('date', dateStr)
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        // Utiliser directement teacherSessionIds (déjà filtré)
        attendanceQuery = attendanceQuery.in('session_id', teacherSessionIds)
      }
      
      const { data: attendanceData, error: attendanceError } = await attendanceQuery
      
      if (attendanceError) {
        logger.error('[ATTENDANCE STATS] ❌ Erreur Supabase:', attendanceError)
        throw attendanceError
      }

      const attendanceRecords = attendanceData || []
      
      // Gérer les doublons : un étudiant peut avoir plusieurs séances dans la journée
      // On compte chaque séance séparément, mais on évite les doublons pour la même séance
      // Clé unique : student_id + session_id (ou juste student_id si pas de session_id)
      const uniqueByStudentSession = new Map<string, any>()
      
      // Trier par created_at décroissant pour prendre le plus récent en premier
      const sortedRecords = [...attendanceRecords].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.id).getTime()
        const dateB = new Date(b.created_at || b.id).getTime()
        return dateB - dateA
      })
      
      // Garder le dernier émargement pour chaque combinaison étudiant-session
      // Si un étudiant a plusieurs séances dans la journée, on les compte toutes
      sortedRecords.forEach((record: any) => {
        if (record.student_id) {
          // Clé unique : étudiant + session (ou juste étudiant si pas de session)
          const uniqueKey = record.session_id 
            ? `${record.student_id}_${record.session_id}`
            : record.student_id
          
          if (!uniqueByStudentSession.has(uniqueKey)) {
            uniqueByStudentSession.set(uniqueKey, record)
          }
        }
      })
      
      const uniqueRecords = Array.from(uniqueByStudentSession.values())
      
      // Calculer les statistiques basées sur les émargements uniques
      let present = 0
      let absent = 0
      let late = 0
      let excused = 0
      
      uniqueRecords.forEach((record: any) => {
        const status = record.status?.toLowerCase() || ''
        if (status === 'present') present++
        else if (status === 'absent') absent++
        else if (status === 'late') late++
        else if (status === 'excused') excused++
      })
      
      const total = uniqueRecords.length
      const attendanceRate = total > 0 ? ((present + late + excused) / total) * 100 : 0

      return {
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate,
        statusData: [
          { name: 'Présents', value: present, color: '#335ACF' },
          { name: 'Absents', value: absent, color: '#EF4444' },
          { name: 'Retard', value: late, color: '#34B9EE' },
          { name: 'Justifiés', value: excused, color: '#3B82F6' },
        ].filter(item => item.value > 0)
      }
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Toujours considérer les données comme périmées
    gcTime: 0, // Ne pas mettre en cache (anciennement cacheTime)
  })

  // Statistiques sur une période
  // Pour les enseignants, filtrer uniquement les émargements des sessions assignées
  const { data: periodStats } = useQuery({
    queryKey: ['attendance-period-stats', user?.organization_id, user?.id, isTeacher, teacherSessionIds, periodFilter],
    queryFn: async () => {
      if (!user?.organization_id) return null

      let startDate: Date
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      switch (periodFilter) {
        case 'week':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), quarter * 3, 1)
          break
        default:
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
      }

      // Pour les enseignants, filtrer uniquement les émargements des sessions assignées
      let periodQuery = supabase
        .from('attendance')
        .select('date, status, session_id')
        .eq('organization_id', user.organization_id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', now.toISOString().split('T')[0])
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        periodQuery = periodQuery.in('session_id', teacherSessionIds)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner des stats vides
        return {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0,
          dailyData: []
        }
      }
      
      const { data, error } = await periodQuery

      if (error) throw error

      const periodAttendanceData = (data as AttendanceWithRelations[]) || []
      const total = periodAttendanceData.length
      const present = periodAttendanceData.filter((a) => a.status === 'present').length
      const absent = periodAttendanceData.filter((a) => a.status === 'absent').length
      const late = periodAttendanceData.filter((a) => a.status === 'late').length
      const excused = periodAttendanceData.filter((a) => a.status === 'excused').length

      // Grouper par jour pour le graphique
      const byDate: Record<string, { present: number; absent: number; late: number; total: number }> = {}
      periodAttendanceData.forEach((a) => {
        const date = a.date
        if (!byDate[date]) {
          byDate[date] = { present: 0, absent: 0, late: 0, total: 0 }
        }
        byDate[date].total++
        if (a.status === 'present') byDate[date].present++
        if (a.status === 'absent') byDate[date].absent++
        if (a.status === 'late') byDate[date].late++
      })

      const dailyData = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14) // Derniers 14 jours
        .map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          présent: stats.present,
          absent: stats.absent,
          retard: stats.late,
          taux: stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0,
        }))

      return {
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate: total > 0 ? ((present + late + excused) / total) * 100 : 0,
        dailyData,
      }
    },
    enabled: !!user?.organization_id,
  })

  // Derniers émargements
  // Pour les enseignants, filtrer uniquement les émargements des sessions assignées
  const { data: recentAttendance } = useQuery({
    queryKey: ['recent-attendance', user?.organization_id, isTeacher, teacherSessionIds],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      let query = supabase
        .from('attendance')
        .select('*, students(first_name, last_name, student_number), sessions(name, formations(name, programs(name)))')
        .eq('organization_id', user.organization_id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20)
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        query = query.in('session_id', teacherSessionIds)
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

  // Rapports mensuels/annuels
  // Pour les enseignants, filtrer uniquement les émargements des sessions assignées
  const { data: monthlyReport } = useQuery({
    queryKey: ['monthly-attendance-report', user?.organization_id, user?.id, isTeacher, teacherSessionIds, selectedReportMonth],
    queryFn: async () => {
      if (!user?.organization_id || reportPeriod !== 'monthly') return null

      const startDate = `${selectedReportMonth}-01`
      const endDate = new Date(
        new Date(selectedReportMonth + '-01').getFullYear(),
        new Date(selectedReportMonth + '-01').getMonth() + 1,
        0
      ).toISOString().split('T')[0]

      let query = supabase
        .from('attendance')
        .select('*, students(first_name, last_name, student_number), sessions(name, formations(name, programs(name)))')
        .eq('organization_id', user.organization_id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        query = query.in('session_id', teacherSessionIds)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner un rapport vide
        return {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0,
          dailyData: [],
          studentData: [],
        }
      }

      const { data, error } = await query

      if (error) throw error

      const reportAttendanceData = (data as AttendanceWithRelations[]) || []
      const total = reportAttendanceData.length
      const present = reportAttendanceData.filter((a) => a.status === 'present').length
      const absent = reportAttendanceData.filter((a) => a.status === 'absent').length
      const late = reportAttendanceData.filter((a) => a.status === 'late').length
      const excused = reportAttendanceData.filter((a) => a.status === 'excused').length

      // Grouper par jour
      const byDay: Record<string, { present: number; absent: number; late: number; total: number }> = {}
      reportAttendanceData.forEach((a) => {
        const date = a.date
        if (!byDay[date]) {
          byDay[date] = { present: 0, absent: 0, late: 0, total: 0 }
        }
        byDay[date].total++
        if (a.status === 'present') byDay[date].present++
        if (a.status === 'absent') byDay[date].absent++
        if (a.status === 'late') byDay[date].late++
      })

      const dailyData = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          présent: stats.present,
          absent: stats.absent,
          retard: stats.late,
          taux: stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0,
        }))

      // Grouper par étudiant
      const byStudent: Record<string, {
        student: any
        present: number
        absent: number
        late: number
        total: number
      }> = {}
      reportAttendanceData.forEach((a) => {
        const studentId = a.student_id
        if (!studentId) return
        if (!byStudent[studentId]) {
          byStudent[studentId] = {
            student: a.students,
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
          }
        }
        byStudent[studentId].total++
        if (a.status === 'present') byStudent[studentId].present++
        if (a.status === 'absent') byStudent[studentId].absent++
        if (a.status === 'late') byStudent[studentId].late++
      })

      const studentData = Object.values(byStudent)
        .map((s) => ({
          student: s.student,
          present: s.present,
          absent: s.absent,
          late: s.late,
          total: s.total,
          rate: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.rate - a.rate)

      return {
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate: total > 0 ? ((present + late + excused) / total) * 100 : 0,
        dailyData,
        studentData,
      }
    },
    enabled: !!user?.organization_id && reportPeriod === 'monthly' && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Pour les enseignants, filtrer uniquement les émargements des sessions assignées
  const { data: yearlyReport } = useQuery({
    queryKey: ['yearly-attendance-report', user?.organization_id, user?.id, isTeacher, teacherSessionIds, selectedReportYear],
    queryFn: async () => {
      if (!user?.organization_id || reportPeriod !== 'yearly') return null

      const startDate = `${selectedReportYear}-01-01`
      const endDate = `${selectedReportYear}-12-31`

      let query = supabase
        .from('attendance')
        .select('date, status, session_id')
        .eq('organization_id', user.organization_id)
        .gte('date', startDate)
        .lte('date', endDate)
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        query = query.in('session_id', teacherSessionIds)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner un rapport vide
        return {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          attendanceRate: 0,
          monthlyData: [],
        }
      }

      const { data, error } = await query

      if (error) throw error

      const monthlyAttendanceData = (data as AttendanceWithRelations[]) || []
      const total = monthlyAttendanceData.length
      const present = monthlyAttendanceData.filter((a) => a.status === 'present').length
      const absent = monthlyAttendanceData.filter((a) => a.status === 'absent').length
      const late = monthlyAttendanceData.filter((a) => a.status === 'late').length

      // Grouper par mois
      const byMonth: Record<string, { present: number; absent: number; late: number; total: number }> = {}
      monthlyAttendanceData.forEach((a) => {
        if (a.date) {
          const date = new Date(a.date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!byMonth[monthKey]) {
            byMonth[monthKey] = { present: 0, absent: 0, late: 0, total: 0 }
          }
          byMonth[monthKey].total++
          if (a.status === 'present') byMonth[monthKey].present++
          if (a.status === 'absent') byMonth[monthKey].absent++
          if (a.status === 'late') byMonth[monthKey].late++
        }
      })

      const monthlyData = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, stats]) => ({
          month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          présent: stats.present,
          absent: stats.absent,
          retard: stats.late,
          taux: stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0,
        }))

      return {
        total,
        present,
        absent,
        late,
        attendanceRate: total > 0 ? ((present + late) / total) * 100 : 0,
        monthlyData,
      }
    },
    enabled: !!user?.organization_id && reportPeriod === 'yearly' && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <UserCheck className="h-5 w-5" />
      case 'absent': return <UserX className="h-5 w-5" />
      case 'late': return <Clock className="h-5 w-5" />
      case 'excused': return <UserMinus className="h-5 w-5" />
      default: return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Présent'
      case 'absent': return 'Absent'
      case 'late': return 'En retard'
      case 'excused': return 'Justifié'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-brand-blue-ghost text-brand-blue border-brand-blue/20'
      case 'absent': return 'bg-red-50 text-red-600 border-red-100'
      case 'late': return 'bg-brand-cyan-ghost text-brand-cyan border-brand-cyan/20'
      case 'excused': return 'bg-blue-50 text-blue-600 border-blue-100'
      default: return 'bg-gray-50 text-gray-600 border-gray-100'
    }
  }

  const handleExportAttendance = async (format: 'csv' | 'xlsx') => {
    if (!recentAttendance || recentAttendance.length === 0) {
      alert('Aucun émargement à exporter')
      return
    }

    try {
      const exportData = (recentAttendance as AttendanceWithRelations[]).map((attendance) => {
        const student = attendance.students
        const session = attendance.sessions
        const formation = session?.formations
        const program = formation?.programs

        return {
          'Date': formatDate(attendance.date),
          'Élève': `${student?.first_name || ''} ${student?.last_name || ''}`.trim(),
          'Numéro': student?.student_number || '',
          'Session': session?.name || '',
          'Formation': formation?.name || '',
          'Programme': program?.name || '',
          'Statut': getStatusLabel(attendance.status),
          'Retard (min)': attendance.late_minutes || 0,
          'Notes': attendance.notes || '',
        }
      })

      if (format === 'xlsx') {
        await exportToExcel({
          filename: `emargements_${new Date().toISOString().split('T')[0]}.xlsx`,
          sheetName: 'Émargements',
          columns: [
            { header: 'Date', key: 'Date', width: 12 },
            { header: 'Élève', key: 'Élève', width: 20 },
            { header: 'Numéro', key: 'Numéro', width: 15 },
            { header: 'Session', key: 'Session', width: 30 },
            { header: 'Formation', key: 'Formation', width: 25 },
            { header: 'Programme', key: 'Programme', width: 25 },
            { header: 'Statut', key: 'Statut', width: 12 },
            { header: 'Retard (min)', key: 'Retard (min)', width: 12 },
            { header: 'Notes', key: 'Notes', width: 30 },
          ],
          data: exportData,
        })
      } else {
        exportToCSV(`emargements_${new Date().toISOString().split('T')[0]}.csv`, exportData)
      }
      alert(`Export ${format.toUpperCase()} réussi ! ${exportData.length} émargement(s) exporté(s).`)
    } catch (error) {
      logger.error('Erreur lors de l\'export', sanitizeError(error))
      alert('Erreur lors de l\'export des données')
    }
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
      {/* Header Ultra-Premium */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <motion.div
              className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-lg shadow-brand-blue/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <ClipboardCheck className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-gray-900 tracking-tighter leading-none">
              Présences
            </h1>
            {todayStats && todayStats.total > 0 && (
              <motion.span
                className="px-3 py-1.5 bg-brand-blue-ghost text-brand-blue rounded-full text-sm font-bold flex items-center gap-2 shadow-sm"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {todayStats.total}
              </motion.span>
            )}
          </div>
          <p className="text-gray-600 font-medium text-lg tracking-tight">
            Suivi détaillé des présences, retards et absences
          </p>
        </div>
      </motion.div>

      {/* Indicateur de date et bouton de rafraîchissement */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            Statistiques de toutes les séances du <span className="font-semibold text-gray-900">{formatDate(selectedDate)}</span>
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchTodayStats()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </motion.div>

      {/* Statistiques Ultra-Premium - 2 lignes de 3 carreaux */}
      {isLoadingStats ? (
        <GlassCard variant="default" className="p-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-brand-blue" />
            <span className="text-gray-600">Chargement des statistiques...</span>
          </div>
        </GlassCard>
      ) : todayStats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Total émargements',
              value: todayStats.total,
              icon: Users,
              iconBg: 'bg-gradient-to-br from-brand-blue to-brand-blue-dark',
              cardBg: 'bg-gradient-to-br from-brand-blue/5 via-brand-blue/10 to-brand-cyan/5',
              borderColor: 'border-brand-blue/20',
              glowColor: 'rgba(39, 68, 114, 0.15)',
            },
            {
              title: 'Présents',
              value: todayStats.present,
              icon: UserCheck,
              iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
              cardBg: 'bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50',
              borderColor: 'border-emerald-200',
              glowColor: 'rgba(16, 185, 129, 0.15)',
              highlight: todayStats.present > 0,
            },
            {
              title: 'Absents',
              value: todayStats.absent,
              icon: UserX,
              iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
              cardBg: 'bg-gradient-to-br from-red-50 via-red-100/50 to-pink-50',
              borderColor: 'border-red-200',
              glowColor: 'rgba(239, 68, 68, 0.15)',
            },
            {
              title: 'En retard',
              value: todayStats.late,
              icon: Clock,
              iconBg: 'bg-gradient-to-br from-brand-cyan to-brand-cyan-dark',
              cardBg: 'bg-gradient-to-br from-brand-cyan/5 via-brand-cyan/10 to-brand-blue/5',
              borderColor: 'border-brand-cyan/20',
              glowColor: 'rgba(52, 185, 238, 0.15)',
            },
            {
              title: 'Justifiés',
              value: todayStats.excused,
              icon: UserMinus,
              iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
              cardBg: 'bg-gradient-to-br from-blue-50 via-blue-100/50 to-indigo-50',
              borderColor: 'border-blue-200',
              glowColor: 'rgba(59, 130, 246, 0.15)',
            },
            {
              title: 'Taux présence',
              value: `${todayStats.attendanceRate.toFixed(1)}%`,
              icon: Percent,
              iconBg: 'bg-gradient-to-br from-brand-blue-light to-brand-cyan',
              cardBg: 'bg-gradient-to-br from-brand-blue-pale/30 via-brand-blue-pale/50 to-brand-cyan-pale/30',
              borderColor: 'border-brand-blue-light/20',
              glowColor: 'rgba(75, 116, 157, 0.15)',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.05,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
              }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group relative"
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl p-6 border-2 transition-all duration-500 shadow-lg hover:shadow-2xl",
                  stat.cardBg,
                  stat.borderColor,
                  stat.highlight && "ring-2 ring-emerald-500/20 animate-pulse-premium"
                )}
                style={{
                  boxShadow: `0 10px 40px -10px ${stat.glowColor}, 0 0 0 1px rgba(255, 255, 255, 0.1)`
                }}
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <motion.div
                      className={cn('p-3.5 rounded-2xl shadow-xl', stat.iconBg)}
                      whileHover={{ rotate: 12, scale: 1.15 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <stat.icon className="h-6 w-6 text-white" />
                    </motion.div>
                    <motion.div
                      className="text-right"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                    >
                      <div className="text-4xl font-display font-bold tracking-tighter text-gray-900 leading-none mb-1">
                        {stat.value}
                      </div>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                        {stat.title}
                      </p>
                    </motion.div>
                  </div>

                  {/* Bottom accent bar */}
                  <motion.div
                    className="h-1.5 rounded-full mt-4"
                    style={{
                      background: stat.iconBg.replace('bg-gradient-to-br', 'linear-gradient(to right,')
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.05 + 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  />
                </div>

                {/* Glow effect on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${stat.glowColor} 0%, transparent 70%)`
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <GlassCard variant="default" className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-2">Aucune statistique disponible</p>
          <p className="text-sm text-gray-500">
            Aucun émargement trouvé pour le {formatDate(selectedDate)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchTodayStats()}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </GlassCard>
      )}

      {/* Action Rapide & Filtres */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard variant="premium" className="p-6 h-full flex flex-col justify-center border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
            <h3 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-3 tracking-tight">
              <motion.div
                className="p-2 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-md"
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Calendar className="h-5 w-5 text-white" />
              </motion.div>
              Émargement Rapide
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Session</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => {
                    setSelectedSessionId(e.target.value)
                    setSelectedSlotId('') // Réinitialiser la séance quand on change de session
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
                >
                  <option value="">Choisir une session...</option>
                  {allSessions?.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedSessionId && sessionSlots && sessionSlots.length > 0 && (
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Séance</label>
                  <select
                    value={selectedSlotId}
                    onChange={(e) => {
                      setSelectedSlotId(e.target.value)
                      // Mettre à jour la date en fonction de la séance sélectionnée
                      const slot = (sessionSlots as Array<{ id: string; date: string }>)?.find((s) => s.id === e.target.value)
                      if (slot) {
                        setSelectedDate(slot.date)
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
                  >
                    <option value="">Choisir une séance...</option>
                    {sessionSlots.map((slot: any) => {
                      const slotDate = new Date(slot.date).toLocaleDateString('fr-FR', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: 'short' 
                      })
                      const timeSlotLabel = slot.time_slot === 'morning' ? 'Matin' : 
                                           slot.time_slot === 'afternoon' ? 'Après-midi' : 'Journée'
                      return (
                        <option key={slot.id} value={slot.id}>
                          {slotDate} - {timeSlotLabel} ({slot.start_time} - {slot.end_time})
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    disabled={!selectedSessionId}
                    onClick={() => setAttendanceModeDialogOpen(true)}
                    className="w-full sm:w-auto h-[42px] bg-gradient-to-br from-brand-blue to-brand-cyan text-white hover:from-brand-blue-dark hover:to-brand-cyan-dark shadow-xl shadow-brand-blue/20 hover:shadow-2xl hover:shadow-brand-cyan/30 transition-all duration-500 font-semibold tracking-tight"
                  >
                    Lancer l'appel
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard variant="premium" className="p-6 h-full flex flex-col justify-center border-2 border-transparent hover:border-brand-cyan/10 transition-all duration-500">
            <h3 className="text-xl font-display font-bold text-gray-900 mb-4 flex items-center gap-3 tracking-tight">
              <motion.div
                className="p-2 bg-gradient-to-br from-brand-cyan to-brand-blue rounded-xl shadow-md"
                whileHover={{ rotate: -5, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <FileText className="h-5 w-5 text-white" />
              </motion.div>
              Rapports
            </h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value as 'monthly' | 'yearly')}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
                >
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                </select>
                {reportPeriod === 'monthly' ? (
                  <input
                    type="month"
                    value={selectedReportMonth}
                    onChange={(e) => setSelectedReportMonth(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
                  />
                ) : (
                  <select
                    value={selectedReportYear}
                    onChange={(e) => setSelectedReportYear(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i
                      return <option key={year} value={year.toString()}>{year}</option>
                    })}
                  </select>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={() => handleExportAttendance('xlsx')}>
                <Download className="mr-2 h-4 w-4" />
                Exporter les données
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Graphiques Premium */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {periodStats && periodStats.dailyData.length > 0 && (
          <motion.div variants={itemVariants} className="h-full">
            <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                  <motion.div
                    className="p-2 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-md"
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <TrendingUp className="h-5 w-5 text-white" />
                  </motion.div>
                  Évolution de la présence
                </h3>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="text-xs font-medium bg-gray-100 border-none rounded-lg px-2 py-1 cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  <option value="week">7 jours</option>
                  <option value="month">Mois</option>
                  <option value="quarter">Trimestre</option>
                </select>
              </div>
              <div className="h-[300px]">
                <PremiumLineChart
                  data={periodStats.dailyData}
                  dataKey="taux"
                  xAxisKey="date"
                  color="#3B82F6"
                  gradientColors={{ from: '#3B82F6', to: '#60A5FA' }}
                  showArea={true}
                  variant="default"
                  className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                  valueFormatter={(val) => `${val}%`}
                />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {todayStats && todayStats.statusData && todayStats.statusData.length > 0 && (
          <motion.div variants={itemVariants} className="h-full">
            <GlassCard variant="premium" className="p-6 h-full border-2 border-transparent hover:border-brand-cyan/10 transition-all duration-500">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                  <motion.div
                    className="p-2 bg-gradient-to-br from-brand-cyan to-brand-blue rounded-xl shadow-md"
                    whileHover={{ rotate: -5, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Users className="h-5 w-5 text-white" />
                  </motion.div>
                  Répartition du jour
                </h3>
              </div>
              <div className="h-[300px]">
                <PremiumPieChart
                  data={todayStats.statusData}
                  colors={todayStats.statusData.map(d => d.color)}
                  variant="default"
                  className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                  innerRadius={70}
                />
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* Liste des émargements récents */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="overflow-hidden p-0 border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xl font-display font-bold text-gray-900 flex items-center gap-3 tracking-tight">
              <motion.div
                className="p-2 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-md"
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Clock className="h-5 w-5 text-white" />
              </motion.div>
              Derniers émargements
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {recentAttendance && recentAttendance.length > 0 ? (
              (recentAttendance as AttendanceWithRelations[]).slice(0, 10).map((attendance, index) => {
                const student = attendance.students
                const session = attendance.sessions
                const formation = session?.formations
                
                return (
                  <motion.div
                    key={attendance.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                    whileHover={{ x: 4, backgroundColor: "rgba(249, 250, 251, 0.5)" }}
                    className="p-4 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                        getStatusColor(attendance.status).replace('border-', '').replace('text-', 'bg-opacity-20 text-')
                      )}>
                        {getStatusIcon(attendance.status)}
                      </div>

                      <div>
                        <p className="font-display font-bold text-gray-900 tracking-tight">
                          {student?.first_name} {student?.last_name}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-2 font-medium tracking-tight">
                          <span className="font-semibold text-brand-blue/80">{session?.name}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span>{formatDate(attendance.date)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {attendance.late_minutes && attendance.late_minutes > 0 && (
                        <span className="text-sm font-medium text-brand-cyan bg-brand-cyan-ghost px-2 py-1 rounded-md">
                          +{attendance.late_minutes} min
                        </span>
                      )}
                      
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border',
                        getStatusColor(attendance.status)
                      )}>
                        {getStatusLabel(attendance.status)}
                      </span>
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                Aucun émargement récent
              </div>
            )}
          </div>
          
            <div className="p-4 border-t border-gray-100 bg-gray-50/30 text-center">
            <Link href="/dashboard/attendance/history">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block">
                <Button variant="ghost" className="text-sm font-semibold text-brand-blue hover:text-brand-blue/80 hover:bg-brand-blue-ghost tracking-tight">
                  Voir tout l'historique
                  {recentAttendance && recentAttendance.length > 10 && (
                    <span className="ml-2 text-xs opacity-70 font-medium">({recentAttendance.length} résultats)</span>
                  )}
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
            </div>
        </GlassCard>
      </motion.div>

      {/* Dialog de choix du mode d'émargement */}
      <Dialog open={attendanceModeDialogOpen} onOpenChange={setAttendanceModeDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Choisissez le mode d'émargement</DialogTitle>
          <DialogDescription>
            Sélectionnez comment vous souhaitez effectuer l'appel pour cette session
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4">
          {/* Émargement manuel */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const url = `/dashboard/attendance/session/${selectedSessionId}?date=${selectedDate}${selectedSlotId ? `&slotId=${selectedSlotId}` : ''}`
              router.push(url)
              setAttendanceModeDialogOpen(false)
            }}
            className="cursor-pointer p-6 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Hand className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Émargement manuel</h3>
                <p className="text-sm text-gray-600">
                  Cochez directement les présences, absences et retards depuis l'interface.
                  Idéal pour les formations en présentiel avec contrôle direct.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Émargement électronique */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const url = `/dashboard/sessions/${selectedSessionId}?step=suivi`
              router.push(url)
              setAttendanceModeDialogOpen(false)
            }}
            className="cursor-pointer p-6 border-2 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Émargement numérique</h3>
                <p className="text-sm text-gray-600">
                  Envoyez automatiquement des demandes d'émargement par email avec signature électronique.
                  Support de la géolocalisation pour valider la présence physique.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
    </motion.div>
  )
}
