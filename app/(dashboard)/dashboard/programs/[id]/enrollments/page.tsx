'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { programService } from '@/lib/services/program.service'
import { formationService } from '@/lib/services/formation.service'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Users, Calendar, DollarSign, Search, Filter, X } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { FormationWithRelations } from '@/lib/types/query-types'

type EnrollmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'failed'
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'

export default function ProgramEnrollmentsPage() {
  const params = useParams()
  const router = useRouter()
  const programId = params.id as string
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Cette page devrait afficher les formations du programme
  // Pour l'instant, redirigeons vers la page des formations du programme
  // ou affichons un message indiquant que les inscriptions sont au niveau des formations

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | 'all'>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [showNewEnrollmentForm, setShowNewEnrollmentForm] = useState(false)
  const [newEnrollmentForm, setNewEnrollmentForm] = useState({
    student_id: '',
    session_id: '', // Utiliser session_id au lieu de program_session_id
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'confirmed' as EnrollmentStatus,
    payment_status: 'pending' as PaymentStatus,
    total_amount: '0',
    paid_amount: '0',
  })

  // Récupérer le programme et ses formations
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      const prog = await programService.getProgramById(programId)
      // Récupérer toutes les formations du programme
      const formations = await formationService.getAllFormations(user?.organization_id || '', {
        programId: programId,
      })
      return { ...prog, formations }
    },
    enabled: !!programId && !!user?.organization_id,
  })

  // Récupérer toutes les sessions de toutes les formations du programme
  const { data: sessions } = useQuery({
    queryKey: ['program-sessions', programId],
    queryFn: async () => {
      if (!program?.formations) return []
      const allSessions = []
      for (const formation of (program.formations as FormationWithRelations[]) || []) {
        const formationSessions = await formationService.getSessionsByFormation(formation.id)
        allSessions.push(...formationSessions)
      }
      return allSessions
    },
    enabled: !!program?.formations,
  })

  // Récupérer les inscriptions
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['program-enrollments', programId, selectedSessionId],
    queryFn: async () => {
      let query = supabase
        .from('enrollments')
        .select('*, students(*), sessions(name, formations(name, programs(name)))')
        .order('enrollment_date', { ascending: false })

      // Filtrer par session si une session est sélectionnée
      if (selectedSessionId) {
        query = query.eq('session_id', selectedSessionId) // Utiliser session_id
      } else {
        // Sinon, récupérer toutes les inscriptions pour toutes les sessions du programme
        if (sessions && sessions.length > 0) {
          const sessionIds = (sessions || []).map((s: any) => s.id).filter((id): id is string => !!id)
          if (sessionIds && sessionIds.length > 0) {
            query = query.in('session_id', sessionIds) // Utiliser session_id
          } else {
            return []
          }
        } else {
          return []
        }
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!programId && (selectedSessionId !== null || (sessions && sessions.length > 0)),
  })

  // Récupérer tous les élèves pour le formulaire de nouvelle inscription
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

  // Filtrer les inscriptions
  const filteredEnrollments = enrollments?.filter((enrollment: any) => {
    // Filtre de recherche
    if (searchTerm) {
      const student = enrollment.students
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        student?.first_name?.toLowerCase().includes(searchLower) ||
        student?.last_name?.toLowerCase().includes(searchLower) ||
        student?.student_number?.toLowerCase().includes(searchLower) ||
        student?.email?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Filtre de statut
    if (statusFilter !== 'all' && enrollment.status !== statusFilter) {
      return false
    }

    // Filtre de statut de paiement
    if (paymentStatusFilter !== 'all' && enrollment.payment_status !== paymentStatusFilter) {
      return false
    }

    return true
  })

  const getStatusColor = (status: EnrollmentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-bg text-warning-primary'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-success-bg text-success-primary'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: EnrollmentStatus) => {
    switch (status) {
      case 'pending':
        return 'En attente'
      case 'confirmed':
        return 'Confirmée'
      case 'completed':
        return 'Terminée'
      case 'cancelled':
        return 'Annulée'
      case 'failed':
        return 'Échouée'
      default:
        return status
    }
  }

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-brand-cyan-ghost text-brand-cyan'
      case 'partial':
        return 'bg-brand-cyan-pale text-brand-cyan'
      case 'paid':
        return 'bg-brand-blue-ghost text-brand-blue'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'En attente'
      case 'partial':
        return 'Partiel'
      case 'paid':
        return 'Payé'
      case 'overdue':
        return 'En retard'
      default:
        return status
    }
  }

  // Mutation pour créer une nouvelle inscription
  const createEnrollmentMutation = useMutation({
    mutationFn: async () => {
      if (!newEnrollmentForm.student_id || !newEnrollmentForm.session_id) {
        throw new Error('Veuillez sélectionner un élève et une session')
      }

      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          student_id: newEnrollmentForm.student_id,
          session_id: newEnrollmentForm.session_id, // Utiliser session_id
          enrollment_date: newEnrollmentForm.enrollment_date,
          status: newEnrollmentForm.status,
          payment_status: newEnrollmentForm.payment_status,
          total_amount: parseFloat(newEnrollmentForm.total_amount) || 0,
          paid_amount: parseFloat(newEnrollmentForm.paid_amount) || 0,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-enrollments', programId] })
      setShowNewEnrollmentForm(false)
      setNewEnrollmentForm({
        student_id: '',
        session_id: '',
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        payment_status: 'pending',
        total_amount: program?.price?.toString() || '0',
        paid_amount: '0',
      })
    },
  })

  // Mettre à jour le montant total quand le programme change
  useEffect(() => {
    if (program?.price && !newEnrollmentForm.total_amount) {
      setNewEnrollmentForm((prev) => ({
        ...prev,
        total_amount: program.price.toString(),
      }))
    }
  }, [program?.price])

  // Statistiques
  const stats = enrollments
    ? {
        total: enrollments.length,
        pending: enrollments.filter((e: any) => e.status === 'pending').length,
        confirmed: enrollments.filter((e: any) => e.status === 'confirmed').length,
        completed: enrollments.filter((e: any) => e.status === 'completed').length,
        paid: enrollments.filter((e: any) => e.payment_status === 'paid').length,
        totalAmount: enrollments.reduce((sum: number, e: any) => sum + (e.total_amount || 0), 0),
        paidAmount: enrollments.reduce((sum: number, e: any) => sum + (e.paid_amount || 0), 0),
      }
    : null

  if (programLoading || enrollmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Programme non trouvé</div>
          <Link href="/dashboard/programs">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/programs/${programId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inscriptions</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestion des inscriptions pour <Link href={`/dashboard/programs/${programId}`} className="text-primary hover:underline">{program.name}</Link>
            </p>
          </div>
        </div>
        <Button onClick={() => setShowNewEnrollmentForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle inscription
        </Button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
                <div className="text-2xl font-bold text-brand-cyan">{stats.pending}</div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
                <div className="text-sm text-muted-foreground">Confirmées</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-blue">{stats.completed}</div>
                <div className="text-sm text-muted-foreground">Terminées</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-blue">{stats.paid}</div>
                <div className="text-sm text-muted-foreground">Payées</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-lg font-bold">{formatCurrency(stats.totalAmount, program.currency)}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-lg font-bold">{formatCurrency(stats.paidAmount, program.currency)}</div>
                <div className="text-sm text-muted-foreground">Payé</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher un élève..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                />
              </div>
            </div>

            {/* Filtre par session */}
            <div>
              <select
                value={selectedSessionId || 'all'}
                onChange={(e) => setSelectedSessionId(e.target.value === 'all' ? null : e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
              >
                <option value="all">Toutes les sessions</option>
                {sessions?.map((session: any) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par statut */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EnrollmentStatus | 'all')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmée</option>
                <option value="completed">Terminée</option>
                <option value="cancelled">Annulée</option>
                <option value="failed">Échouée</option>
              </select>
            </div>

            {/* Filtre par statut de paiement */}
            <div>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatus | 'all')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
              >
                <option value="all">Tous les paiements</option>
                <option value="pending">En attente</option>
                <option value="partial">Partiel</option>
                <option value="paid">Payé</option>
                <option value="overdue">En retard</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de nouvelle inscription */}
      {showNewEnrollmentForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nouvelle inscription</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewEnrollmentForm(false)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Élève */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Élève *
                  </label>
                  <select
                    required
                    value={newEnrollmentForm.student_id}
                    onChange={(e) =>
                      setNewEnrollmentForm({
                        ...newEnrollmentForm,
                        student_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="">Sélectionner un élève</option>
                    {students?.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.student_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Session *
                  </label>
                  <select
                    required
                    value={newEnrollmentForm.session_id}
                    onChange={(e) =>
                      setNewEnrollmentForm({
                        ...newEnrollmentForm,
                        session_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="">Sélectionner une session</option>
                    {sessions?.map((session: any) => (
                      <option key={session.id} value={session.id}>
                        {session.name} ({formatDate(session.start_date)} - {formatDate(session.end_date)})
                      </option>
                    ))}
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
                    value={newEnrollmentForm.enrollment_date}
                    onChange={(e) =>
                      setNewEnrollmentForm({
                        ...newEnrollmentForm,
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
                    value={newEnrollmentForm.status}
                    onChange={(e) =>
                      setNewEnrollmentForm({
                        ...newEnrollmentForm,
                        status: e.target.value as EnrollmentStatus,
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
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Montant total ({program.currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={newEnrollmentForm.total_amount}
                    onChange={(e) =>
                      setNewEnrollmentForm({
                        ...newEnrollmentForm,
                        total_amount: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                </div>

                {/* Montant payé */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Montant payé ({program.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newEnrollmentForm.paid_amount}
                    onChange={(e) => {
                      const paid = e.target.value
                      const total = parseFloat(newEnrollmentForm.total_amount) || 0
                      const paidAmount = parseFloat(paid) || 0
                      
                      let paymentStatus: PaymentStatus = 'pending'
                      if (paidAmount >= total && total > 0) {
                        paymentStatus = 'paid'
                      } else if (paidAmount > 0) {
                        paymentStatus = 'partial'
                      }

                      setNewEnrollmentForm({
                        ...newEnrollmentForm,
                        paid_amount: paid,
                        payment_status: paymentStatus,
                      })
                    }}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                </div>

                {/* Statut de paiement */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Statut de paiement
                  </label>
                  <select
                    value={newEnrollmentForm.payment_status}
                    onChange={(e) =>
                      setNewEnrollmentForm({
                        ...newEnrollmentForm,
                        payment_status: e.target.value as PaymentStatus,
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
              </div>

              {createEnrollmentMutation.error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                  {createEnrollmentMutation.error instanceof Error
                    ? createEnrollmentMutation.error.message
                    : 'Une erreur est survenue lors de la création de l\'inscription'}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewEnrollmentForm(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createEnrollmentMutation.isPending}>
                  {createEnrollmentMutation.isPending ? 'Création...' : 'Créer l\'inscription'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des inscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des inscriptions ({filteredEnrollments?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEnrollments && filteredEnrollments.length > 0 ? (
            <div className="space-y-4">
              {filteredEnrollments.map((enrollment: any) => {
                const student = enrollment.students
                const session = enrollment.sessions

                return (
                  <div
                    key={enrollment.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {student?.first_name} {student?.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {student?.student_number} {student?.email && `• ${student.email}`}
                            </p>
                          </div>
                          {session && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="mr-1 h-4 w-4" />
                              {session.name}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Date d'inscription:</span>{' '}
                            <span className="font-medium">{formatDate(enrollment.enrollment_date)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Montant:</span>{' '}
                            <span className="font-medium">
                              {formatCurrency(enrollment.total_amount || 0, program.currency)}
                            </span>
                          </div>
                          {enrollment.paid_amount > 0 && (
                            <div>
                              <span className="text-muted-foreground">Payé:</span>{' '}
                              <span className="font-medium">
                                {formatCurrency(enrollment.paid_amount, program.currency)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                          {getStatusLabel(enrollment.status)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(enrollment.payment_status)}`}>
                          {getPaymentStatusLabel(enrollment.payment_status)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {enrollments && enrollments.length === 0
                ? 'Aucune inscription pour ce programme'
                : 'Aucune inscription ne correspond aux critères de recherche'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

