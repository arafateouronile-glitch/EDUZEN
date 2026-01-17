'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { attendanceService } from '@/lib/services/attendance.service'
import { sessionService } from '@/lib/services/session.service'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, CheckCircle, XCircle, Clock, AlertCircle, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { useState, useEffect } from 'react'
import type { SessionWithRelations, EnrollmentWithRelations, StudentWithRelations, AttendanceWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { ElectronicAttendanceManager } from '@/components/attendance'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Attendance = TableRow<'attendance'>

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export default function SessionAttendancePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = params.id as string
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const { user } = useAuth()
  const supabase = createClient()

  // Récupérer la session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionService.getSessionById(sessionId),
    enabled: !!sessionId,
  })

  // Récupérer les inscriptions à cette session
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<EnrollmentWithRelations[]>({
    queryKey: ['session-enrollments', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, students(*)')
        .eq('session_id', sessionId)
        .in('status', ['confirmed', 'completed'])
        .order('students(last_name)', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
  })

  // Récupérer l'émargement existant
  const { data: existingAttendance, refetch: refetchAttendance } = useQuery<AttendanceWithRelations[]>({
    queryKey: ['attendance-session', sessionId, date],
    queryFn: () => attendanceService.getBySessionAndDate(sessionId, date),
    enabled: !!sessionId,
  })

  // État local pour les présences
  const [attendance, setAttendance] = useState<Record<string, {
    status: AttendanceStatus
    lateMinutes?: number
    notes?: string
  }>>({})

  // Initialiser avec les données existantes
  useEffect(() => {
    if (existingAttendance && Array.isArray(existingAttendance) && enrollments) {
      const initial: Record<string, {
        status: AttendanceStatus
        lateMinutes?: number
        notes?: string
      }> = {}
      for (const att of existingAttendance) {
        initial[att.student_id] = {
          status: att.status,
          lateMinutes: att.late_minutes ?? undefined,
          notes: att.notes || '',
        }
      }
      // Ajouter les étudiants non encore émarginés
      (enrollments as EnrollmentWithRelations[]).forEach((enrollment) => {
        const studentId = enrollment.student_id
        if (!initial[studentId]) {
          initial[studentId] = {
            status: 'present' as AttendanceStatus,
            lateMinutes: 0,
            notes: '',
          }
        }
      })
      setAttendance(initial)
    } else if (enrollments) {
      // Initialiser tous les étudiants comme présents par défaut
      const initial: Record<string, {
        status: AttendanceStatus
        lateMinutes?: number
        notes?: string
      }> = {}
      (enrollments as EnrollmentWithRelations[]).forEach((enrollment) => {
        initial[enrollment.student_id] = {
          status: 'present' as AttendanceStatus,
          lateMinutes: 0,
          notes: '',
        }
      })
      setAttendance(initial)
    }
  }, [existingAttendance, enrollments])

  const updateAttendance = (
    studentId: string,
    field: 'status' | 'lateMinutes' | 'notes',
    value: AttendanceStatus | number | string
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id || !enrollments) throw new Error('Données manquantes')

      // Préparer les enregistrements
      const records = (enrollments as EnrollmentWithRelations[]).map((enrollment) => ({
        student_id: enrollment.student_id,
        session_id: sessionId,
        date: date,
        status: attendance[enrollment.student_id]?.status || 'present',
        late_minutes: attendance[enrollment.student_id]?.lateMinutes || 0,
        teacher_id: user.id,
        notes: attendance[enrollment.student_id]?.notes || undefined,
      }))

      return attendanceService.markMultiple(user.organization_id, records)
    },
    onSuccess: () => {
      refetchAttendance()
    },
  })

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-success-primary" />
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'late':
        return <Clock className="h-5 w-5 text-warning-primary" />
      case 'excused':
        return <AlertCircle className="h-5 w-5 text-blue-600" />
    }
  }

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'Présent'
      case 'absent':
        return 'Absent'
      case 'late':
        return 'En retard'
      case 'excused':
        return 'Justifié'
    }
  }

  const students = (enrollments as EnrollmentWithRelations[])?.map((e) => e.students).filter(Boolean) || []
  const stats = students.length > 0
    ? {
        total: students.length,
        present: Object.values(attendance).filter((a) => a.status === 'present').length,
        absent: Object.values(attendance).filter((a) => a.status === 'absent').length,
        late: Object.values(attendance).filter((a) => a.status === 'late').length,
        excused: Object.values(attendance).filter((a) => a.status === 'excused').length,
      }
    : null

  if (sessionLoading || enrollmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Session non trouvée</div>
          <Link href="/dashboard/sessions">
            <Button className="mt-4">Retour à la liste des sessions</Button>
          </Link>
        </div>
      </div>
    )
  }

  // La session a maintenant formations -> programs
  const sessionData = session as SessionWithRelations
  const formation = sessionData?.formations
  const program = formation?.programs

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/sessions/${sessionId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Émargement - {sessionData?.name || 'Session'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {formation && (
              <Link href={`/dashboard/formations/${formation?.id}`} className="text-primary hover:underline">
                {formation?.name}
              </Link>
            )}
            {program && (
              <> • <Link href={`/dashboard/programs/${program?.id}`} className="text-primary hover:underline">
                {program?.name}
              </Link></>
            )}
            {' - '}
            <span className="flex items-center inline-flex mt-1">
              <Calendar className="mr-1 h-3 w-3" />
              {formatDate(date)}
            </span>
            {sessionData?.location && ` - ${sessionData.location}`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Émargement manuel</TabsTrigger>
          <TabsTrigger value="electronic">Émargement électronique</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || students.length === 0}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-success-primary">{stats.present}</div>
                <div className="text-sm text-muted-foreground">Présents</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                <div className="text-sm text-muted-foreground">Absents</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-warning-primary">{stats.late}</div>
                <div className="text-sm text-muted-foreground">En retard</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
                <div className="text-sm text-muted-foreground">Justifiés</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste des participants */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des participants</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments && enrollments.length > 0 ? (
            <div className="space-y-4">
              {(enrollments as EnrollmentWithRelations[]).map((enrollment) => {
                const student = enrollment.students
                if (!student) return null
                const studentAttendance = attendance[enrollment.student_id || ''] || {
                  status: 'present' as AttendanceStatus,
                  lateMinutes: 0,
                  notes: '',
                }

                return (
                  <div
                    key={enrollment.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {student.photo_url ? (
                        <img
                          src={student.photo_url}
                          alt={`${student.first_name} ${student.last_name}`}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                          {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {student.first_name} {student.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{student.student_number}</p>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Statut */}
                      <div className="flex space-x-2">
                        {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(
                          (status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => updateAttendance(student.id, 'status', status)}
                              className={`p-2 rounded-lg transition-colors min-touch-target touch-manipulation ${
                                studentAttendance.status === status
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              title={getStatusLabel(status)}
                            >
                              {getStatusIcon(status)}
                            </button>
                          )
                        )}
                      </div>

                      {/* Minutes de retard */}
                      {studentAttendance.status === 'late' && (
                        <div className="w-20">
                          <input
                            type="number"
                            min="0"
                            value={studentAttendance.lateMinutes || 0}
                            onChange={(e) =>
                              updateAttendance(enrollment.student_id || '', 'lateMinutes', parseInt(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                            placeholder="min"
                          />
                          <p className="text-xs text-muted-foreground text-center mt-1">min</p>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="w-32">
                        <input
                          type="text"
                          value={studentAttendance.notes || ''}
                          onChange={(e) =>
                            updateAttendance(enrollment.student_id || '', 'notes', e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                          placeholder="Notes..."
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Aucun participant inscrit à cette session
            </div>
          )}
        </CardContent>
      </Card>

      {saveMutation.error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {saveMutation.error instanceof Error
            ? saveMutation.error.message
            : 'Une erreur est survenue lors de l\'enregistrement'}
        </div>
      )}

      {saveMutation.isSuccess && (
        <div className="bg-success-bg text-success-primary px-4 py-3 rounded-lg text-sm">
          Émargement enregistré avec succès !
        </div>
      )}
        </TabsContent>

        <TabsContent value="electronic" className="space-y-6">
          {user?.organization_id && (
            <ElectronicAttendanceManager
              sessionId={sessionId}
              organizationId={user.organization_id}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

