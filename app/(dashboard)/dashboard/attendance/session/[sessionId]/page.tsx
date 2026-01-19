'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { attendanceService } from '@/lib/services/attendance.service.client'
import { sessionService } from '@/lib/services/session.service'
import { signatureService } from '@/lib/services/signature.service.client'
import { useAuth } from '@/lib/hooks/use-auth'
import { LocationPicker } from '@/components/attendance/location-picker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { SessionWithRelations } from '@/lib/types/query-types'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export default function SessionAttendancePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const slotId = searchParams.get('slotId') || ''
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Récupérer la séance sélectionnée
  const { data: selectedSlot } = useQuery<{
    id: string;
    time_slot: string;
    start_time: string;
    end_time: string;
    location?: string;
    date: string;
  } | null>({
    queryKey: ['session-slot', slotId],
    queryFn: async () => {
      if (!slotId) return null
      const { data, error } = await supabase
        .from('session_slots')
        .select('*')
        .eq('id', slotId)
        .single()
      if (error) {
        console.warn('Erreur récupération séance:', error)
        return null
      }
      return data as any
    },
    enabled: !!slotId,
  })

  // Récupérer la session avec les informations de géolocalisation
  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const sessionData = await sessionService.getSessionById(sessionId)
      // NOTE: Les colonnes de géolocalisation (latitude, longitude, etc.) ne sont pas encore
      // ajoutées à la table sessions. Retourner directement sessionData pour l'instant.
      // TODO: Activer la requête ci-dessous après avoir ajouté les colonnes à la table sessions
      return sessionData
    },
  })

  // Récupérer les inscriptions à cette session
  const { data: enrollments } = useQuery({
    queryKey: ['session-enrollments', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, students(*)')
        .eq('session_id', sessionId) // Utiliser session_id au lieu de program_session_id
        .in('status', ['confirmed', 'completed'])
        .order('students(last_name)', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  // Récupérer l'émargement existant
  const { data: existingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance-session', sessionId, date],
    queryFn: () => attendanceService.getBySessionAndDate(sessionId, date),
  })

  // État local pour les présences
  const [attendance, setAttendance] = useState<Record<string, {
    status: AttendanceStatus
    lateMinutes?: number
    notes?: string
    latitude?: number
    longitude?: number
    location_accuracy?: number
  }>>({})

  // Initialiser avec les données existantes
  useEffect(() => {
    if (existingAttendance && enrollments) {
      const initial: Record<string, any> = {}
      existingAttendance.forEach((att: any) => {
        initial[att.student_id] = {
          status: att.status,
          lateMinutes: att.late_minutes,
          notes: att.notes || '',
        }
      })
      // Ajouter les étudiants non encore émarginés
      enrollments.forEach((enrollment: any) => {
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
      const initial: Record<string, any> = {}
      enrollments.forEach((enrollment: any) => {
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
    field: 'status' | 'lateMinutes' | 'notes' | 'latitude' | 'longitude' | 'location_accuracy',
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
      if (!user?.organization_id || !enrollments) throw new Error('Données manquantes')

      // Préparer les enregistrements
      const records = enrollments.map((enrollment: any) => ({
        student_id: enrollment.student_id,
        session_id: sessionId, // Utiliser session_id au lieu de program_session_id
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
      // Invalider les queries liées aux émargements pour rafraîchir la liste sur la page principale
      queryClient.invalidateQueries({ queryKey: ['recent-attendance'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-period-stats'] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-attendance-report'] })
      queryClient.invalidateQueries({ queryKey: ['yearly-attendance-report'] })
      toast.success('Émargement enregistré avec succès', {
        description: `${Object.keys(attendance).length} présences enregistrées pour le ${formatDate(date)}`,
      })
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de l\'enregistrement', {
        description: error.message,
      })
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

  const students = enrollments?.map((e: any) => e.students).filter(Boolean) || []
  const stats = students.length > 0
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
              Émargement - {(session as SessionWithRelations)?.name || 'Session'}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {formatDate(date)}
              {selectedSlot && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-blue-ghost text-brand-blue">
                  {selectedSlot.time_slot === 'morning' ? 'Matin' : 
                   selectedSlot.time_slot === 'afternoon' ? 'Après-midi' : 'Journée complète'}
                  {' • '}
                  {selectedSlot.start_time} - {selectedSlot.end_time}
                </span>
              )}
              {(session as SessionWithRelations)?.location && ` - ${(session as SessionWithRelations).location}`}
              {selectedSlot?.location && !((session as SessionWithRelations)?.location) && ` - ${selectedSlot.location}`}
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
          {students.length > 0 ? (
            <div className="space-y-4">
              {students.map((student: any) => {
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
                      {session?.require_location_for_attendance && (
                        <div className="mt-2">
                          <LocationPicker
                            required={false}
                            sessionLocation={
                              session?.latitude && session?.longitude
                                ? {
                                    latitude: session.latitude,
                                    longitude: session.longitude,
                                    radius: session.allowed_attendance_radius_meters || undefined,
                                  }
                                : undefined
                            }
                            onLocationChange={(location) => {
                              updateAttendance(student.id, 'latitude', location.latitude)
                              updateAttendance(student.id, 'longitude', location.longitude)
                              updateAttendance(student.id, 'location_accuracy', location.accuracy)
                            }}
                          />
                        </div>
                      )}
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

      {/* Historique des signatures */}
      {sessionId && user?.organization_id && (
        <SessionSignaturesHistory sessionId={sessionId} organizationId={user.organization_id} />
      )}
    </div>
  )
}

// Composant pour afficher l'historique des signatures de session
function SessionSignaturesHistory({ sessionId, organizationId }: { sessionId: string; organizationId: string }) {
  const { data: signatures, isLoading } = useQuery({
    queryKey: ['session-signatures', sessionId, organizationId],
    queryFn: () => signatureService.getSignaturesBySession(sessionId, organizationId),
    enabled: !!sessionId && !!organizationId,
  })

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historique des signatures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    )
  }

  if (!signatures || signatures.length === 0) {
    return null
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Historique des signatures</CardTitle>
        <p className="text-sm text-muted-foreground">
          Signatures des documents liés aux étudiants de cette session ({signatures.length} signature(s))
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {signatures.map((signature: any) => (
            <div
              key={signature.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 w-24 h-16 border rounded bg-white p-1.5 flex items-center justify-center">
                <img
                  src={signature.signature_data}
                  alt={`Signature de ${signature.signer_name}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">
                        {signature.signer_name || signature.signer?.full_name || 'Signataire inconnu'}
                      </p>
                      {signature.status === 'signed' && signature.is_valid && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {signature.signer_role || signature.signer?.role || 'Rôle non spécifié'}
                    </p>
                    {signature.document && (
                      <p className="text-sm font-medium mt-1">
                        Document : {signature.document.title || 'Sans titre'}
                      </p>
                    )}
                    {signature.document?.students && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Étudiant : {signature.document.students.first_name} {signature.document.students.last_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Signé le {formatDate(signature.signed_at)}
                    </p>
                    {signature.comment && (
                      <p className="text-sm text-muted-foreground mt-2 italic border-l-2 border-muted pl-2">
                        "{signature.comment}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
