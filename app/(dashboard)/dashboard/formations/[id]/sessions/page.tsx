'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formationService } from '@/lib/services/formation.service'
import { sessionService } from '@/lib/services/session.service'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Calendar, Clock, MapPin, Users, X, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Enrollment = TableRow<'enrollments'>
type Payment = TableRow<'payments'>

export default function FormationSessionsPage() {
  const params = useParams()
  const router = useRouter()
  const formationId = params.id as string
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [enrollmentForm, setEnrollmentForm] = useState({
    student_id: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'confirmed' as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed',
    payment_status: 'pending' as 'pending' | 'partial' | 'paid' | 'overdue',
    total_amount: '',
    paid_amount: '0',
  })

  // Récupérer la formation
  const { data: formation } = useQuery({
    queryKey: ['formation', formationId],
    queryFn: () => formationService.getFormationById(formationId),
  })

  // Récupérer les sessions de la formation
  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['formation-sessions', formationId],
    queryFn: () => formationService.getSessionsByFormation(formationId),
  })

  // Récupérer les enseignants
  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'teacher')
        .eq('is_active', true)
      if (error) throw error
      return data || []
    },
  })

  // Récupérer tous les élèves pour le formulaire d'inscription
  const { data: students } = useQuery({
    queryKey: ['students', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number, email')
        .eq('organization_id', user.organization_id)
        .eq('status', 'active')
        .order('last_name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les inscriptions existantes pour la session sélectionnée
  const { data: existingEnrollments } = useQuery({
    queryKey: ['enrollments-for-session', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return []
      const { data, error } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('session_id', selectedSessionId) // Utiliser session_id au lieu de program_session_id
      if (error) throw error
      return data || []
    },
    enabled: !!selectedSessionId && showEnrollmentForm,
  })

  // Filtrer les élèves déjà inscrits
  const availableStudents = students?.filter(
    (student: any) => !existingEnrollments?.some((enrollment: any) => enrollment.student_id === student.id)
  ) || []

  const [showNewSessionForm, setShowNewSessionForm] = useState(false)
  const [sessionForm, setSessionForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    teacher_id: '',
    location: '',
    capacity_max: '',
  })

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      try {
        const result = await sessionService.createSession({
          formation_id: formationId,
          name: sessionForm.name,
          start_date: sessionForm.start_date,
          end_date: sessionForm.end_date,
          start_time: sessionForm.start_time || null,
          end_time: sessionForm.end_time || null,
          teacher_id: sessionForm.teacher_id || null,
          location: sessionForm.location || null,
          capacity_max: sessionForm.capacity_max ? parseInt(sessionForm.capacity_max) : null,
          status: 'planned',
        })
        return result
      } catch (error) {
        console.error('Erreur lors de la création de la session:', error)
        throw error
      }
    },
    onSuccess: () => {
      setShowNewSessionForm(false)
      setSessionForm({
        name: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        teacher_id: '',
        location: '',
        capacity_max: '',
      })
      queryClient.invalidateQueries({ queryKey: ['formation-sessions', formationId] })
      refetch()
    },
  })

  // Fonction pour ouvrir le formulaire d'inscription
  const handleEnrollStudent = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setEnrollmentForm({
      student_id: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      payment_status: 'pending',
      total_amount: (formation as any)?.price?.toString() || '0',
      paid_amount: '0',
    })
    setShowEnrollmentForm(true)
  }

  // Mutation pour créer une inscription
  const createEnrollmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSessionId || !enrollmentForm.student_id) {
        throw new Error('Session et élève sont requis')
      }

      // Vérifier si l'inscription existe déjà
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('session_id', selectedSessionId)
        .eq('student_id', enrollmentForm.student_id)
        .maybeSingle()

      if (existing) {
        throw new Error('Cet élève est déjà inscrit à cette session')
      }

      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          student_id: enrollmentForm.student_id,
          session_id: selectedSessionId, // Utiliser session_id au lieu de program_session_id
          enrollment_date: enrollmentForm.enrollment_date,
          status: enrollmentForm.status as any,
          payment_status: enrollmentForm.payment_status as any,
          total_amount: parseFloat(enrollmentForm.total_amount) || 0,
          paid_amount: parseFloat(enrollmentForm.paid_amount) || 0,
        } as any)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Cet élève est déjà inscrit à cette session')
        }
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-for-session', selectedSessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', selectedSessionId] })
      setShowEnrollmentForm(false)
      setSelectedSessionId(null)
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800'
      case 'ongoing':
        return 'bg-success-bg text-success-primary'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned':
        return 'Planifiée'
      case 'ongoing':
        return 'En cours'
      case 'completed':
        return 'Terminée'
      case 'cancelled':
        return 'Annulée'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/formations/${formationId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sessions - {(formation as any)?.name || 'Formation'}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Gérez les sessions de cette formation
            </p>
          </div>
        </div>
        <Button onClick={() => setShowNewSessionForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle session
        </Button>
      </div>

      {/* Formulaire de création de session */}
      {showNewSessionForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nouvelle session</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewSessionForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createSessionMutation.mutate()
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom de la session *</label>
                  <input
                    type="text"
                    required
                    value={sessionForm.name}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ex: Session Hiver 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Lieu</label>
                  <input
                    type="text"
                    value={sessionForm.location}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, location: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ex: Salle A1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date de début *</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.start_date}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, start_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date de fin *</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.end_date}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, end_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Heure de début</label>
                  <input
                    type="time"
                    value={sessionForm.start_time}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, start_time: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Heure de fin</label>
                  <input
                    type="time"
                    value={sessionForm.end_time}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, end_time: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Enseignant</label>
                  <select
                    value={sessionForm.teacher_id}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, teacher_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner un enseignant</option>
                    {teachers?.map((teacher: any) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Capacité maximale</label>
                  <input
                    type="number"
                    value={sessionForm.capacity_max}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, capacity_max: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ex: 30"
                  />
                </div>
              </div>

              {createSessionMutation.error && (
                <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {createSessionMutation.error instanceof Error
                    ? createSessionMutation.error.message
                    : 'Une erreur est survenue'}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewSessionForm(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createSessionMutation.isPending}>
                  {createSessionMutation.isPending ? 'Création...' : 'Créer la session'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions && sessions.length > 0 ? (
          sessions.map((session: any) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{session.name}</CardTitle>
                    <div className="flex items-center mt-2 space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(session.start_date)} - {formatDate(session.end_date)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${getStatusColor(session.status)}`}
                  >
                    {getStatusLabel(session.status)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.location && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    {session.location}
                  </div>
                )}
                {session.start_time && session.end_time && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    {session.start_time} - {session.end_time}
                  </div>
                )}
                {session.capacity_max && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    Capacité: {session.capacity_max}
                  </div>
                )}
                <div className="flex space-x-2 pt-2">
                  <Link
                    href={`/dashboard/sessions/${session.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full" size="sm">
                      Voir détails
                    </Button>
                  </Link>
                  <Button
                    variant="default"
                    className="flex-1"
                    size="sm"
                    onClick={() => handleEnrollStudent(session.id)}
                  >
                    <UserPlus className="mr-1 h-4 w-4" />
                    Inscrire élève
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Aucune session pour le moment</p>
          </div>
        )}
      </div>

      {/* Formulaire d'inscription */}
      {showEnrollmentForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inscrire un élève à la session</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEnrollmentForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createEnrollmentMutation.mutate()
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Élève *</label>
                  <select
                    required
                    value={enrollmentForm.student_id}
                    onChange={(e) =>
                      setEnrollmentForm({ ...enrollmentForm, student_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner un élève</option>
                    {availableStudents.map((student: any) => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.student_number})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date d'inscription *</label>
                  <input
                    type="date"
                    required
                    value={enrollmentForm.enrollment_date}
                    onChange={(e) =>
                      setEnrollmentForm({ ...enrollmentForm, enrollment_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Statut *</label>
                  <select
                    required
                    value={enrollmentForm.status}
                    onChange={(e) => {
                      const value = e.target.value || 'pending';
                      const validStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed' = 
                        (value === 'failed' || value === 'completed' || value === 'confirmed' || value === 'pending' || value === 'cancelled')
                          ? (value as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed')
                          : 'pending';
                      setEnrollmentForm({
                        ...enrollmentForm,
                        status: validStatus,
                      });
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                    <option value="failed">Échoué</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Montant total *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={enrollmentForm.total_amount}
                    onChange={(e) =>
                      setEnrollmentForm({ ...enrollmentForm, total_amount: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Montant payé</label>
                  <input
                    type="number"
                    step="0.01"
                    value={enrollmentForm.paid_amount}
                    onChange={(e) => {
                      const paid = parseFloat(e.target.value) || 0
                      const total = parseFloat(enrollmentForm.total_amount) || 0
                      const paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue' =
                        paid === 0
                          ? 'pending'
                          : paid >= total
                          ? 'paid'
                          : 'partial'
                      setEnrollmentForm({
                        ...enrollmentForm,
                        paid_amount: e.target.value,
                        payment_status: paymentStatus,
                      })
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Statut de paiement</label>
                  <input
                    type="text"
                    value={
                      enrollmentForm.payment_status === 'pending'
                        ? 'En attente'
                        : enrollmentForm.payment_status === 'partial'
                        ? 'Partiel'
                        : enrollmentForm.payment_status === 'paid'
                        ? 'Payé'
                        : 'En retard'
                    }
                    disabled
                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              {createEnrollmentMutation.error && (
                <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {createEnrollmentMutation.error instanceof Error
                    ? createEnrollmentMutation.error.message
                    : 'Une erreur est survenue'}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEnrollmentForm(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createEnrollmentMutation.isPending}>
                  {createEnrollmentMutation.isPending ? 'Inscription...' : "Inscrire l'élève"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

