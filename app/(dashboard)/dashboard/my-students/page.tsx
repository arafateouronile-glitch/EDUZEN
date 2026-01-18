'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users, Search, Mail, Phone, Calendar, 
  GraduationCap, ClipboardList, Eye, CheckCircle2,
  AlertCircle, Clock, BookOpen, Award, PlayCircle
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from '@/components/ui/motion'
import { formatDate, cn } from '@/lib/utils'
import { useVocabulary } from '@/lib/hooks/use-vocabulary'

export default function MyStudentsPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const vocab = useVocabulary()
  const [searchQuery, setSearchQuery] = useState('')

  // Récupérer les sessions où l'enseignant est intervenant
  const { data: teacherSessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['teacher-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const { data, error } = await supabase
        .from('session_teachers')
        .select(`
          session_id,
          sessions (
            id,
            name,
            start_date,
            end_date,
            status,
            formation_id,
            formations (
              id,
              name
            )
          )
        `)
        .eq('teacher_id', user.id)
      
      if (error) {
        console.error('Erreur récupération sessions enseignant:', error)
        return []
      }
      
      return data || []
    },
    enabled: !!user?.id,
  })

  // Récupérer les apprenants des sessions de l'enseignant
  const { data: myStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['my-students', user?.id, teacherSessions],
    queryFn: async () => {
      if (!user?.id || !teacherSessions || teacherSessions.length === 0) return []
      
      const sessionIds = teacherSessions.map((ts: any) => ts.session_id)
      
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          enrolled_at,
          session_id,
          sessions (
            id,
            name,
            start_date,
            end_date,
            formations (
              id,
              name
            )
          ),
          students (
            id,
            first_name,
            last_name,
            email,
            phone,
            status,
            photo_url
          )
        `)
        .in('session_id', sessionIds)
        .eq('status', 'active')
      
      if (error) {
        console.error('Erreur récupération apprenants:', error)
        return []
      }
      
      return data || []
    },
    enabled: !!user?.id && teacherSessions && teacherSessions.length > 0,
  })

  // Récupérer les statistiques d'émargement pour chaque apprenant
  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats', user?.id, myStudents],
    queryFn: async () => {
      if (!myStudents || myStudents.length === 0) return {}
      
      const studentIds = myStudents.map((e: any) => e.students?.id).filter(Boolean)
      
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)
      
      if (error) {
        console.error('Erreur récupération émargements:', error)
        return {}
      }
      
      // Calculer les statistiques par apprenant
      const stats: Record<string, { present: number; absent: number; late: number; total: number }> = {}
      
      data?.forEach((att: any) => {
        if (!stats[att.student_id]) {
          stats[att.student_id] = { present: 0, absent: 0, late: 0, total: 0 }
        }
        stats[att.student_id].total++
        if (att.status === 'present') stats[att.student_id].present++
        else if (att.status === 'absent') stats[att.student_id].absent++
        else if (att.status === 'late') stats[att.student_id].late++
      })
      
      return stats
    },
    enabled: !!myStudents && myStudents.length > 0,
  })

  // Filtrer les apprenants selon la recherche
  const filteredStudents = myStudents?.filter((enrollment: any) => {
    const student = enrollment.students
    if (!student) return false
    
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
    const email = student.email?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    
    return fullName.includes(query) || email.includes(query)
  })

  // Grouper par session
  const studentsBySession: Record<string, any[]> = {}
  filteredStudents?.forEach((enrollment: any) => {
    const sessionId = enrollment.session_id
    if (!studentsBySession[sessionId]) {
      studentsBySession[sessionId] = []
    }
    studentsBySession[sessionId].push(enrollment)
  })

  const getAttendancePercentage = (studentId: string) => {
    const stats = attendanceStats?.[studentId]
    if (!stats || stats.total === 0) return null
    return Math.round((stats.present / stats.total) * 100)
  }

  const getAttendanceColor = (percentage: number | null) => {
    if (percentage === null) return 'text-gray-400'
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoadingSessions || isLoadingStudents) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Users className="h-8 w-8 text-brand-blue" />
          Mes {vocab.students}
        </h1>
        <p className="text-gray-600">
          Gérez les apprenants qui vous sont assignés dans vos sessions de formation
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-lg">
              <Users className="h-5 w-5 text-brand-blue" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total apprenants</p>
              <p className="text-2xl font-bold text-gray-900">{myStudents?.length || 0}</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sessions actives</p>
              <p className="text-2xl font-bold text-gray-900">
                {teacherSessions?.filter((ts: any) => ts.sessions?.status === 'active' || ts.sessions?.status === 'in_progress').length || 0}
              </p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Taux présence moyen</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats && Object.keys(attendanceStats).length > 0
                  ? Math.round(
                      Object.values(attendanceStats).reduce((sum: number, s: any) => 
                        sum + (s.total > 0 ? (s.present / s.total) * 100 : 0), 0
                      ) / Object.keys(attendanceStats).length
                    ) + '%'
                  : 'N/A'}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Barre de recherche et actions */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un apprenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link href="/dashboard/my-students/elearning">
          <Button variant="outline" className="gap-2">
            <PlayCircle className="h-4 w-4 text-purple-600" />
            Suivi E-Learning
          </Button>
        </Link>
      </div>

      {/* Liste par session */}
      {Object.keys(studentsBySession).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun apprenant assigné
            </h3>
            <p className="text-gray-600">
              Vous n'avez pas encore d'apprenants dans vos sessions de formation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(studentsBySession).map(([sessionId, enrollments], index) => {
            const session = enrollments[0]?.sessions
            const formation = session?.formations
            
            return (
              <motion.div
                key={sessionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-brand-blue" />
                          {session?.name || 'Session'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {formation?.name} • {formatDate(session?.start_date)} - {formatDate(session?.end_date)}
                        </CardDescription>
                      </div>
                      <Badge variant={session?.status === 'active' || session?.status === 'in_progress' ? 'default' : 'secondary'}>
                        {session?.status === 'active' || session?.status === 'in_progress' ? 'En cours' : session?.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {enrollments.map((enrollment: any) => {
                        const student = enrollment.students
                        if (!student) return null
                        
                        const attendancePercentage = getAttendancePercentage(student.id)
                        
                        return (
                          <div
                            key={enrollment.id}
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center">
                                {student.photo_url ? (
                                  <img
                                    src={student.photo_url}
                                    alt={`${student.first_name} ${student.last_name}`}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-brand-blue font-medium">
                                    {student.first_name?.[0]}{student.last_name?.[0]}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {student.first_name} {student.last_name}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  {student.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {student.email}
                                    </span>
                                  )}
                                  {student.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {student.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {/* Taux de présence */}
                              <div className="text-right">
                                <p className="text-xs text-gray-500 mb-1">Présence</p>
                                <p className={cn('font-medium', getAttendanceColor(attendancePercentage))}>
                                  {attendancePercentage !== null ? `${attendancePercentage}%` : 'N/A'}
                                </p>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Link href={`/dashboard/attendance?student=${student.id}&session=${sessionId}`}>
                                  <Button variant="ghost" size="sm">
                                    <ClipboardList className="h-4 w-4 mr-1" />
                                    Émargement
                                  </Button>
                                </Link>
                                <Link href={`/dashboard/students/${student.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

