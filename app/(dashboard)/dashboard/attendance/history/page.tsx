'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { ArrowLeft, Search, Filter, Download, UserCheck, UserX, Clock, UserMinus, Calendar } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import Link from 'next/link'
import { motion } from '@/components/ui/motion'
import { exportToExcel, exportToCSV } from '@/lib/utils/excel-export'
import type { AttendanceWithRelations } from '@/lib/types/query-types'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function AttendanceHistoryPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

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
      logger.debug('session_teachers vide, utilisation du fallback via sessions.teacher_id pour historique présences')
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

  // Récupérer toutes les sessions pour le filtre
  // Pour les enseignants, filtrer par leurs sessions assignées
  const { data: allSessions } = useQuery({
    queryKey: ['all-sessions-for-history', user?.organization_id, isTeacher, teacherSessionIds],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      let query = supabase
        .from('sessions')
        .select('id, name, formations!inner(name, organization_id)')
        .eq('formations.organization_id', user.organization_id)
        .order('name', { ascending: true })
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        query = query.in('id', teacherSessionIds)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner un tableau vide
        return []
      }
      
      const { data, error } = await query
      
      if (error) {
        logger.warn('Erreur récupération sessions', sanitizeError(error))
        return []
      }
      return data || []
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les IDs d'étudiants correspondant à la recherche
  const { data: studentIds } = useQuery({
    queryKey: ['student-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || !user?.organization_id) return null
      
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('organization_id', user.organization_id)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,student_number.ilike.%${searchTerm}%`)
      
      if (error) {
        logger.warn('Erreur recherche étudiants', sanitizeError(error))
        return null
      }
      
      return (data as Array<{ id: string }>)?.map(s => s.id) || []
    },
    enabled: !!searchTerm && !!user?.organization_id,
  })

  // Récupérer tous les émargements avec filtres
  // Pour les enseignants, filtrer uniquement les émargements des sessions assignées
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: [
      'attendance-history',
      user?.organization_id,
      user?.id,
      isTeacher,
      teacherSessionIds,
      searchTerm,
      studentIds,
      statusFilter,
      dateFrom,
      dateTo,
      selectedSessionId,
      currentPage,
    ],
    queryFn: async () => {
      if (!user?.organization_id) return { data: [], total: 0 }

      let query = supabase
        .from('attendance')
        .select('*, students(first_name, last_name, student_number), sessions(name, formations(name, programs(name)))', { count: 'exact' })
        .eq('organization_id', user.organization_id)

      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        query = query.in('session_id', teacherSessionIds)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner vide
        return { data: [], total: 0 }
      }

      // Filtre par statut
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Filtre par date
      if (dateFrom) {
        query = query.gte('date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('date', dateTo)
      }

      // Filtre par session
      if (selectedSessionId) {
        query = query.eq('session_id', selectedSessionId)
      }

      // Recherche par IDs d'étudiants
      if (searchTerm && studentIds && studentIds.length > 0) {
        query = query.in('student_id', studentIds)
      } else if (searchTerm && (!studentIds || studentIds.length === 0)) {
        // Si recherche mais aucun étudiant trouvé, retourner vide
        return { data: [], total: 0 }
      }

      // Tri et pagination
      query = query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

      const { data, error, count } = await query
      if (error) throw error

      return {
        data: data || [],
        total: count || 0,
      }
    },
    enabled: !!user?.organization_id && (!searchTerm || studentIds !== undefined) && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  const totalPages = Math.ceil((attendanceData?.total || 0) / itemsPerPage)

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

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!attendanceData?.data || attendanceData.data.length === 0) {
      alert('Aucun émargement à exporter')
      return
    }

    try {
      if (!user?.organization_id) {
        throw new Error('Organization ID required')
      }
      
      // Récupérer tous les résultats sans pagination pour l'export
      let query = supabase
        .from('attendance')
        .select('*, students(first_name, last_name, student_number), sessions(name, formations(name, programs(name)))')
        .eq('organization_id', user.organization_id)

      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        query = query.in('session_id', teacherSessionIds)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner vide
        alert('Aucun émargement à exporter')
        return
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (dateFrom) {
        query = query.gte('date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('date', dateTo)
      }
      if (selectedSessionId) {
        query = query.eq('session_id', selectedSessionId)
      }
      if (searchTerm && studentIds && studentIds.length > 0) {
        query = query.in('student_id', studentIds)
      } else if (searchTerm && (!studentIds || studentIds.length === 0)) {
        // Si recherche mais aucun étudiant trouvé, retourner vide
        alert('Aucun étudiant trouvé avec ce critère de recherche')
        return
      }

      const { data: exportData, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = (exportData as AttendanceWithRelations[]).map((attendance) => {
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
          filename: `historique_emargements_${new Date().toISOString().split('T')[0]}.xlsx`,
          sheetName: 'Historique Émargements',
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
          data: formattedData,
        })
      } else {
        exportToCSV(`historique_emargements_${new Date().toISOString().split('T')[0]}.csv`, formattedData)
      }
      alert(`Export ${format.toUpperCase()} réussi ! ${formattedData.length} émargement(s) exporté(s).`)
    } catch (error) {
      logger.error('Erreur lors de l\'export', sanitizeError(error))
      alert('Erreur lors de l\'export des données')
    }
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
    setSelectedSessionId('')
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6 pb-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historique des présences</h1>
            <p className="text-gray-500 mt-1">
              {attendanceData?.total || 0} émargement{attendanceData?.total !== 1 ? 's' : ''} trouvé{attendanceData?.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('xlsx')}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <GlassCard variant="default" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nom, prénom ou numéro..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
            >
              <option value="all">Tous</option>
              <option value="present">Présent</option>
              <option value="absent">Absent</option>
              <option value="late">En retard</option>
              <option value="excused">Justifié</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
              Date début
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
              Date fin
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
              Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
            >
              <option value="">Toutes les sessions</option>
              {allSessions?.map((session: any) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="w-full"
            >
              <Filter className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Liste des émargements */}
      <GlassCard variant="default" className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Chargement...
          </div>
        ) : attendanceData && attendanceData.data.length > 0 ? (
          <>
            <div className="divide-y divide-gray-100">
              {attendanceData.data.map((attendance: any) => {
                const student = attendance.students
                const session = attendance.sessions
                const formation = session?.formations

                return (
                  <motion.div
                    key={attendance.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                        getStatusColor(attendance.status).replace('border-', '').replace('text-', 'bg-opacity-20 text-')
                      )}>
                        {getStatusIcon(attendance.status)}
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {student?.first_name} {student?.last_name}
                          {student?.student_number && (
                            <span className="text-sm text-gray-500 ml-2">({student.student_number})</span>
                          )}
                        </p>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <span className="font-medium text-brand-blue/80">{session?.name}</span>
                          {formation?.name && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>{formation.name}</span>
                            </>
                          )}
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(attendance.date)}</span>
                        </div>
                        {attendance.notes && (
                          <p className="text-xs text-gray-400 mt-1 italic">{attendance.notes}</p>
                        )}
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
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {currentPage} sur {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Aucun émargement trouvé avec ces critères
          </div>
        )}
      </GlassCard>
    </div>
  )
}

