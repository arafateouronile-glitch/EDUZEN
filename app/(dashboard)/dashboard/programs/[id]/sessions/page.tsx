'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { programService } from '@/lib/services/program.service'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Calendar, Clock, MapPin, Users, X, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { logger, sanitizeError } from '@/lib/utils/logger'

type Enrollment = TableRow<'enrollments'>

export default function ProgramSessionsPage() {
  const params = useParams()
  const router = useRouter()
  const programId = params.id as string
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
    funding_type_id: '',
  })

  // Récupérer le programme
  const { data: program } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => programService.getProgramById(programId),
  })

  // Récupérer les sessions
  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['program-sessions', programId],
    queryFn: async () => {
      // Récupérer les formations du programme d'abord
      const { data: formations } = await supabase
        .from('formations')
        .select('id')
        .eq('program_id', programId)

      if (!formations || formations.length === 0) return []

      const formationIds = formations.map(f => f.id)

      // Récupérer les sessions des formations
      const { data, error } = await supabase
        .from('sessions')
        .select('*, formations(*, programs(*))')
        .in('formation_id', formationIds)
        .order('start_date', { ascending: false })

      if (error) throw error
      return data || []
    },
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

  // Récupérer les types de financement
  const { data: fundingTypes } = useQuery({
    queryKey: ['funding-types', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('funding_types' as any)
        .select('id, name, code, description')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les inscriptions existantes pour la session sélectionnée (pour filtrer les élèves déjà inscrits)
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
    (student) => !existingEnrollments?.some((enrollment) => enrollment.student_id === student.id)
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
      // Note: Cette page utilise encore l'ancienne structure
      // Les sessions devraient être créées via /dashboard/formations/[id]/sessions
      // Pour l'instant, cette page est conservée pour compatibilité
      throw new Error('Cette fonctionnalité doit être utilisée via /dashboard/formations/[id]/sessions')
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
      // Invalider et refetch les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['program-sessions', programId] })
      refetch()
    },
    onError: (error) => {
      logger.error('Erreur lors de la création de la session:', error)
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

  // Fonction pour ouvrir le formulaire d'inscription
  const handleEnrollStudent = (sessionId: string) => {
    const session = sessions?.find((s: any) => s.id === sessionId)
    setSelectedSessionId(sessionId)
    setEnrollmentForm({
      student_id: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      payment_status: 'pending',
      total_amount: (program?.formations?.[0] as any)?.price?.toString() || '0',
      paid_amount: '0',
      funding_type_id: '',
    })
    setShowEnrollmentForm(true)
  }

  // Mutation pour créer une inscription
  const createEnrollmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSessionId || !enrollmentForm.student_id) {
        throw new Error('Veuillez sélectionner un élève')
      }

      logger.debug('Création d\'inscription:', {
        student_id: enrollmentForm.student_id,
            session_id: selectedSessionId, // Utiliser session_id
        enrollment_date: enrollmentForm.enrollment_date,
        status: enrollmentForm.status,
        payment_status: enrollmentForm.payment_status,
        total_amount: parseFloat(enrollmentForm.total_amount) || 0,
        paid_amount: parseFloat(enrollmentForm.paid_amount) || 0,
      })

      try {
        // Vérifier d'abord si l'inscription existe déjà
        const { data: existingEnrollment, error: checkError } = await supabase
          .from('enrollments')
          .select('id, status, payment_status')
          .eq('student_id', enrollmentForm.student_id)
          .eq('session_id', selectedSessionId) // Utiliser session_id
          .maybeSingle()

        // Si une erreur autre que "not found" se produit, la gérer
        if (checkError && checkError.code !== 'PGRST116') {
          logger.error('Erreur lors de la vérification de l\'inscription:', checkError)
        }

        // Si l'inscription existe déjà, refuser la création
        if (existingEnrollment) {
          throw new Error(
            `Cet élève est déjà inscrit à cette session. (Statut: ${existingEnrollment.status}, Paiement: ${existingEnrollment.payment_status})`
          )
        }

        // Si l'inscription n'existe pas, la créer
        const { data, error } = await supabase
          .from('enrollments')
          .insert({
            student_id: enrollmentForm.student_id,
            session_id: selectedSessionId, // Utiliser session_id au lieu de program_session_id
            enrollment_date: enrollmentForm.enrollment_date,
            status: enrollmentForm.status,
            payment_status: enrollmentForm.payment_status,
            total_amount: parseFloat(enrollmentForm.total_amount) || 0,
            paid_amount: parseFloat(enrollmentForm.paid_amount) || 0,
          })
          .select()
          .single()

        if (error) {
          // Gérer spécifiquement l'erreur de duplication
          if (error.code === '23505') {
            throw new Error(
              'Cet élève est déjà inscrit à cette session. Veuillez vérifier les inscriptions existantes.'
            )
          }
          logger.error('Erreur lors de la création de l\'inscription:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          })
          throw error
        }

        logger.debug('Inscription créée avec succès:', data)
        return data
      } catch (error) {
        logger.error('Erreur dans createEnrollmentMutation:', error)
        throw error
      }
    },
    onSuccess: () => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['program-sessions', programId] })
      queryClient.invalidateQueries({ queryKey: ['enrollments-for-session', selectedSessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', selectedSessionId] }) // Pour la page de détails
      queryClient.invalidateQueries({ queryKey: ['program-enrollments', programId] })
      
      // Rafraîchir également les données des sessions
      refetch()
      
      setShowEnrollmentForm(false)
      setSelectedSessionId(null)
      setEnrollmentForm({
        student_id: '',
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        payment_status: 'pending',
        total_amount: (program as any)?.price?.toString() || '0',
        paid_amount: '0',
        funding_type_id: '',
      })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/programs/${programId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sessions - {program?.name}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Gérez les sessions de cette formation
            </p>
          </div>
        </div>
        <Button onClick={() => setShowNewSessionForm(!showNewSessionForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle session
        </Button>
      </div>

      {showNewSessionForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle session</CardTitle>
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
                    onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    placeholder="Ex: Session 1 - Janvier 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Lieu/Salle</label>
                  <input
                    type="text"
                    value={sessionForm.location}
                    onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    placeholder="Ex: Salle A1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date de début *</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.start_date}
                    onChange={(e) => setSessionForm({ ...sessionForm, start_date: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date de fin *</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.end_date}
                    onChange={(e) => setSessionForm({ ...sessionForm, end_date: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Heure de début</label>
                  <input
                    type="time"
                    value={sessionForm.start_time}
                    onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Heure de fin</label>
                  <input
                    type="time"
                    value={sessionForm.end_time}
                    onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Enseignant</label>
                  <select
                    value={sessionForm.teacher_id}
                    onChange={(e) => setSessionForm({ ...sessionForm, teacher_id: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="">Sélectionner un enseignant</option>
                    {teachers?.map((teacher) => (
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
                    onChange={(e) => setSessionForm({ ...sessionForm, capacity_max: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                </div>
              </div>

              {createSessionMutation.error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm space-y-1">
                  <p className="font-semibold">Erreur lors de la création de la session :</p>
                  <p>
                    {createSessionMutation.error instanceof Error
                      ? createSessionMutation.error.message
                      : 'Une erreur est survenue lors de la création de la session'}
                  </p>
                  {createSessionMutation.error && 'code' in createSessionMutation.error && (
                    <p className="text-xs opacity-75">
                      Code d'erreur: {String(createSessionMutation.error.code)}
                    </p>
                  )}
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

      {/* Formulaire d'inscription d'élève */}
      {showEnrollmentForm && selectedSessionId && (
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
              className="space-y-6"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Session:</strong> {sessions?.find((s: any) => s.id === selectedSessionId)?.name}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {sessions?.find((s: any) => s.id === selectedSessionId) && (
                    <>
                      {formatDate(sessions.find((s: any) => s.id === selectedSessionId)!.start_date)} -{' '}
                      {formatDate(sessions.find((s: any) => s.id === selectedSessionId)!.end_date)}
                    </>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Élève */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Élève *
                  </label>
                  <select
                    required
                    value={enrollmentForm.student_id}
                    onChange={(e) =>
                      setEnrollmentForm({
                        ...enrollmentForm,
                        student_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="">Sélectionner un élève</option>
                    {availableStudents.length > 0 ? (
                      availableStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} ({student.student_number})
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        Aucun élève disponible (tous déjà inscrits ou aucun élève actif)
                      </option>
                    )}
                  </select>
                </div>

                {/* Date d'inscription */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date d'inscription *
                  </label>
                  <input
                    type="date"
                    required
                    value={enrollmentForm.enrollment_date}
                    onChange={(e) =>
                      setEnrollmentForm({
                        ...enrollmentForm,
                        enrollment_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Statut *
                  </label>
                  <select
                    required
                    value={enrollmentForm.status}
                    onChange={(e) =>
                      setEnrollmentForm({
                        ...enrollmentForm,
                        status: e.target.value as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed',
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmée</option>
                    <option value="completed">Terminée</option>
                    <option value="cancelled">Annulée</option>
                    <option value="failed">Échouée</option>
                  </select>
                </div>

                {/* Montant total */}
                {program && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Montant total ({(program as any).currency || 'XOF'}) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={enrollmentForm.total_amount}
                      onChange={(e) =>
                        setEnrollmentForm({
                          ...enrollmentForm,
                          total_amount: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                  </div>
                )}

                {/* Montant payé */}
                {program && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Montant payé ({(program as any).currency || 'XOF'})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={enrollmentForm.paid_amount}
                      onChange={(e) => {
                        const paid = e.target.value
                        const total = parseFloat(enrollmentForm.total_amount) || 0
                        const paidAmount = parseFloat(paid) || 0

                        let paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue' = 'pending'
                        if (paidAmount >= total && total > 0) {
                          paymentStatus = 'paid'
                        } else if (paidAmount > 0) {
                          paymentStatus = 'partial'
                        }

                        setEnrollmentForm({
                          ...enrollmentForm,
                          paid_amount: paid,
                          payment_status: paymentStatus,
                        })
                      }}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                  </div>
                )}

                {/* Statut de paiement */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Statut de paiement
                  </label>
                  <select
                    value={enrollmentForm.payment_status}
                    onChange={(e) =>
                      setEnrollmentForm({
                        ...enrollmentForm,
                        payment_status: e.target.value as 'pending' | 'partial' | 'paid' | 'overdue',
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="pending">En attente</option>
                    <option value="partial">Partiel</option>
                    <option value="paid">Payé</option>
                    <option value="overdue">En retard</option>
                  </select>
                </div>

                {/* Type de financement */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type de financement
                  </label>
                  <select
                    value={enrollmentForm.funding_type_id}
                    onChange={(e) =>
                      setEnrollmentForm({
                        ...enrollmentForm,
                        funding_type_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="">Aucun (financement personnel)</option>
                    {fundingTypes && fundingTypes.length > 0 ? (
                      fundingTypes.map((type: any) => (
                        <option key={type.id} value={type.id}>
                          {type.name} {type.code ? `(${type.code})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        Aucun type de financement disponible
                      </option>
                    )}
                  </select>
                  {fundingTypes && fundingTypes.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Créez des types de financement dans les paramètres pour les voir apparaître ici.
                    </p>
                  )}
                </div>
              </div>

              {createEnrollmentMutation.error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm space-y-1">
                  <p className="font-semibold">Erreur lors de la création de l'inscription :</p>
                  <p>
                    {createEnrollmentMutation.error instanceof Error
                      ? createEnrollmentMutation.error.message
                      : 'Une erreur est survenue lors de la création de l\'inscription'}
                  </p>
                  {createEnrollmentMutation.error && 'code' in createEnrollmentMutation.error && (
                    <p className="text-xs opacity-75">
                      Code d'erreur: {String(createEnrollmentMutation.error.code)}
                      {createEnrollmentMutation.error.code === '42501' && (
                        <span className="block mt-1">
                          Erreur de sécurité RLS. Assurez-vous d'avoir exécuté le script <code className="bg-gray-200 px-1 rounded">supabase/fix_enrollments_rls.sql</code> dans le SQL Editor de Supabase.
                        </span>
                      )}
                      {createEnrollmentMutation.error.code === '23505' && (
                        <span className="block mt-1">
                          ❌ Cette inscription existe déjà. Un élève ne peut être inscrit qu'une seule fois à une session.
                        </span>
                      )}
                    </p>
                  )}
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
                  {createEnrollmentMutation.isPending ? 'Inscription...' : 'Inscrire l\'élève'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Liste des sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Chargement...
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{session.name}</h3>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          {formatDate(session.start_date)} - {formatDate(session.end_date)}
                        </div>
                        {session.start_time && session.end_time && (
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            {session.start_time} - {session.end_time}
                          </div>
                        )}
                        {session.location && (
                          <div className="flex items-center">
                            <MapPin className="mr-2 h-4 w-4" />
                            {session.location}
                          </div>
                        )}
                      </div>
                      {session.capacity_max && (
                        <div className="mt-2 flex items-center text-sm text-muted-foreground">
                          <Users className="mr-2 h-4 w-4" />
                          Capacité: {session.capacity_max} apprenants
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEnrollStudent(session.id)}
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          Inscrire élève
                        </Button>
                        <Link href={`/dashboard/programs/${programId}/sessions/${session.id}`}>
                          <Button variant="outline" size="sm">
                            Voir détails
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Aucune session créée. Créez-en une pour commencer.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

