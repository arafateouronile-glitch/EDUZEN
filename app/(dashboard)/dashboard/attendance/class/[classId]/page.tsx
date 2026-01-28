'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { attendanceService } from '@/lib/services/attendance.service.client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { StudentWithRelations, AttendanceWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Student = TableRow<'students'>
type Attendance = TableRow<'attendance'>

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface AttendanceRecord {
  status: AttendanceStatus
  lateMinutes?: number | null
  notes?: string | null
}

export default function ClassAttendancePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const classId = params.classId as string
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const { user } = useAuth()
  const supabase = createClient()
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)

  // Récupérer la classe
  const { data: classData } = useQuery<TableRow<'classes'> | null>({
    queryKey: ['class', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()
      if (error) throw error
      return data
    },
  })

  // Récupérer les élèves de la classe
  const { data: students } = useQuery({
    queryKey: ['class-students', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, photo_url, student_number')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('last_name')
      if (error) throw error
      return data || []
    },
  })

  // Récupérer l'émargement existant
  const { data: existingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => attendanceService.getByClassAndDate(classId, date),
  })

  // État local pour les présences
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})

  // Initialiser avec les données existantes
  useEffect(() => {
    if (existingAttendance && students) {
      const initial = {} as Record<string, AttendanceRecord>
      ;(existingAttendance as AttendanceWithRelations[]).forEach((att) => {
        if (att.student_id) {
          initial[att.student_id] = {
            status: att.status as AttendanceStatus,
            lateMinutes: att.late_minutes,
            notes: att.notes || '',
          }
        }
      })
      // Ajouter les élèves non encore émarginés
      ;(students as Student[]).forEach((student) => {
        if (!initial[student.id]) {
          initial[student.id] = {
            status: 'present' as AttendanceStatus,
            lateMinutes: 0,
            notes: '',
          }
        }
      })
      setAttendance(initial)
    } else if (students) {
      // Initialiser tous les élèves comme présents par défaut
      const initial = {} as Record<string, AttendanceRecord>
      ;(students as Student[]).forEach((student) => {
        initial[student.id] = {
          status: 'present' as AttendanceStatus,
          lateMinutes: 0,
          notes: '',
        }
      })
      setAttendance(initial)
    }
  }, [existingAttendance, students])

  const updateAttendance = (
    studentId: string,
    field: 'status' | 'lateMinutes' | 'notes',
    value: any
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
      if (!user?.organization_id || !students) throw new Error('Données manquantes')

      // Préparer les enregistrements
      const records = (students as Student[]).map((student) => ({
        student_id: student.id,
        class_id: classId,
        date: date,
        status: attendance[student.id]?.status || 'present',
        late_minutes: attendance[student.id]?.lateMinutes || 0,
        teacher_id: user.id,
        notes: attendance[student.id]?.notes || undefined,
      }))

      // Sauvegarder la signature si disponible
      let signatureUrl: string | null = null
      if (signatureCanvasRef.current) {
        const canvas = signatureCanvasRef.current
        const imageData = canvas.toDataURL('image/png')
        
        // Upload de la signature (à implémenter avec Supabase Storage)
        // Pour l'instant, on peut stocker en base64 ou uploader
        signatureUrl = imageData
      }

      return attendanceService.markMultiple(user.organization_id, records)
    },
    onSuccess: () => {
      refetchAttendance()
      // Optionnel : rediriger ou afficher un message de succès
    },
  })

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-brand-blue" />
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'late':
        return <Clock className="h-5 w-5 text-brand-cyan" />
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

  const stats = students
    ? {
        total: students.length,
        present: Object.values(attendance).filter((a) => a.status === 'present').length,
        absent: Object.values(attendance).filter((a) => a.status === 'absent').length,
        late: Object.values(attendance).filter((a) => a.status === 'late').length,
        excused: Object.values(attendance).filter((a) => a.status === 'excused').length,
      }
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Émargement - {classData?.name}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {formatDate(date)}
            </p>
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
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
                <div className="text-2xl font-bold text-brand-blue">{stats.present}</div>
                <div className="text-sm text-muted-foreground">Présents</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-danger-primary">{stats.absent}</div>
                <div className="text-sm text-muted-foreground">Absents</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-cyan">{stats.late}</div>
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

      {/* Liste des élèves */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des élèves</CardTitle>
        </CardHeader>
        <CardContent>
          {students && students.length > 0 ? (
            <div className="space-y-4">
              {(students as Student[])?.map((student) => {
                const studentAttendance = attendance[student.id] || {
                  status: 'present' as AttendanceStatus,
                  lateMinutes: 0,
                  notes: '',
                }

                return (
                  <div
                    key={student.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {student.photo_url ? (
                        <Image
                          src={student.photo_url}
                          alt={`${student.first_name} ${student.last_name}`}
                          width={48}
                          height={48}
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

                      {/* Minutes de retard (si en retard) */}
                      {studentAttendance.status === 'late' && (
                        <div className="w-20">
                          <input
                            type="number"
                            min="0"
                            value={studentAttendance.lateMinutes || 0}
                            onChange={(e) =>
                              updateAttendance(student.id, 'lateMinutes', parseInt(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            updateAttendance(student.id, 'notes', e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
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
              Aucun élève dans cette classe
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature de l'enseignant */}
      <Card>
        <CardHeader>
          <CardTitle>Signature de l'enseignant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-4">
            <canvas
              ref={signatureCanvasRef}
              className="w-full h-32 border rounded cursor-crosshair bg-white"
              onMouseDown={(e) => {
                const canvas = signatureCanvasRef.current
                if (!canvas) return
                const ctx = canvas.getContext('2d')
                if (!ctx) return

                const rect = canvas.getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top

                ctx.beginPath()
                ctx.moveTo(x, y)

                const draw = (e: MouseEvent) => {
                  const newX = e.clientX - rect.left
                  const newY = e.clientY - rect.top
                  ctx.lineTo(newX, newY)
                  ctx.stroke()
                }

                const stop = () => {
                  canvas.removeEventListener('mousemove', draw)
                  canvas.removeEventListener('mouseup', stop)
                }

                canvas.addEventListener('mousemove', draw)
                canvas.addEventListener('mouseup', stop)
              }}
            />
            <div className="mt-2 flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Signez dans la zone ci-dessus
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const canvas = signatureCanvasRef.current
                  if (canvas) {
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                      ctx.clearRect(0, 0, canvas.width, canvas.height)
                    }
                  }
                }}
              >
                Effacer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {saveMutation.error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {saveMutation.error instanceof Error
            ? saveMutation.error.message
            : 'Une erreur est survenue lors de l\'enregistrement'}
        </div>
      )}
    </div>
  )
}

