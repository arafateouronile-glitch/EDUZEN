'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { sessionService } from '@/lib/services/session.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, Calendar, Clock, MapPin, Users, BookOpen, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const programId = params.id as string
  const sessionId = params.sessionId as string
  const supabase = createClient()

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionService.getSessionById(sessionId),
    enabled: !!sessionId,
  })

  // Récupérer les inscriptions à cette session
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['session-enrollments', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, students(*)')
        .eq('session_id', sessionId) // Utiliser session_id au lieu de program_session_id
        .order('enrollment_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!sessionId,
  })

  // Récupérer les enseignants si nécessaire
  const { data: teacher } = useQuery({
    queryKey: ['teacher', session?.teacher_id],
    queryFn: async () => {
      if (!session?.teacher_id) return null
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', session.teacher_id)
        .single()
      if (error) {
        // Ne pas bloquer si l'enseignant n'est pas trouvé
        console.error('Erreur lors de la récupération de l\'enseignant:', error)
        return null
      }
      return data
    },
    enabled: !!session?.teacher_id,
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
          <Link href={`/dashboard/programs/${programId}/sessions`}>
            <Button className="mt-4">Retour aux sessions</Button>
          </Link>
        </div>
      </div>
    )
  }

  // TypeScript: Le service retourne une session avec le programme joint
  // La session a maintenant formations -> programs
  const sessionData = session as SessionWithRelations
  const formation = sessionData?.formations
  const program = formation?.programs

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/programs/${programId}/sessions`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{session.name}</h1>
            <p className="mt-2 text-sm text-gray-600">
              Session de la formation <Link href={`/dashboard/programs/${programId}`} className="text-primary hover:underline">{program?.name}</Link>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
            {getStatusLabel(session.status)}
          </span>
          <Link href={`/dashboard/programs/${programId}/sessions/${sessionId}/attendance`}>
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Gérer l'assiduité
            </Button>
          </Link>
        </div>
      </div>

      {/* Informations principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Dates et horaires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Date de début</p>
              <p className="text-lg">{formatDate(session.start_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Date de fin</p>
              <p className="text-lg">{formatDate(session.end_date)}</p>
            </div>
            {session.start_time && session.end_time && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Heure de début</p>
                  <p className="text-lg flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    {session.start_time}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Heure de fin</p>
                  <p className="text-lg flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    {session.end_time}
                  </p>
                </div>
              </>
            )}
            {session.location && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Lieu</p>
                <p className="text-lg flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  {session.location}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.capacity_max && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Capacité maximale</p>
                <p className="text-lg">{session.capacity_max} apprenants</p>
              </div>
            )}
            {enrollments && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Élèves inscrits</p>
                <p className="text-lg font-semibold text-primary">
                  {enrollments.length} {enrollments.length === 1 ? 'élève' : 'élèves'}
                </p>
                {session.capacity_max && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((enrollments.length / session.capacity_max) * 100)}% de la capacité
                  </p>
                )}
              </div>
            )}
            {teacher ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Enseignant</p>
                <p className="text-lg">{teacher.full_name}</p>
                {teacher.email && (
                  <p className="text-sm text-muted-foreground">{teacher.email}</p>
                )}
              </div>
            ) : session.teacher_id ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Enseignant</p>
                <p className="text-sm text-muted-foreground">Non assigné ou non trouvé</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Enseignant</p>
                <p className="text-sm text-muted-foreground">Aucun enseignant assigné</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informations sur le programme */}
      {program && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Formation associée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Nom de la formation</p>
                <p className="text-lg">
                  <Link href={`/dashboard/programs/${programId}`} className="text-primary hover:underline">
                    {program.name}
                  </Link>
                </p>
              </div>
              {program.code && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Code</p>
                  <p className="text-lg">{program.code}</p>
                </div>
              )}
              {program.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-600">{program.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des élèves inscrits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Élèves inscrits ({enrollments?.length || 0})
            </CardTitle>
            <Link href={`/dashboard/programs/${programId}/sessions/${sessionId}/attendance`}>
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Gérer l'assiduité
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {enrollmentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des inscriptions...
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="space-y-3">
              {enrollments.map((enrollment: any) => {
                const student = enrollment.students
                if (!student) return null

                const getStatusColor = (status: string) => {
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

                const getPaymentStatusColor = (status: string) => {
                  switch (status) {
                    case 'pending':
                      return 'bg-warning-bg text-warning-primary'
                    case 'partial':
                      return 'bg-blue-100 text-blue-800'
                    case 'paid':
                      return 'bg-success-bg text-success-primary'
                    case 'overdue':
                      return 'bg-red-100 text-red-800'
                    default:
                      return 'bg-gray-100 text-gray-800'
                  }
                }

                return (
                  <div
                    key={enrollment.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {student.first_name} {student.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {student.student_number}
                          {student.email && ` • ${student.email}`}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Date d'inscription:</span>{' '}
                            <span className="font-medium">{formatDate(enrollment.enrollment_date)}</span>
                          </div>
                          {program && enrollment.total_amount > 0 && (
                            <div>
                              <span className="text-muted-foreground">Montant:</span>{' '}
                              <span className="font-medium">
                                {formatCurrency(enrollment.total_amount, program.currency)}
                              </span>
                              {enrollment.paid_amount > 0 && (
                                <span className="text-success-primary ml-1">
                                  (Payé: {formatCurrency(enrollment.paid_amount, program.currency)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                          {enrollment.status === 'pending' ? 'En attente' :
                           enrollment.status === 'confirmed' ? 'Confirmée' :
                           enrollment.status === 'completed' ? 'Terminée' :
                           enrollment.status === 'cancelled' ? 'Annulée' :
                           enrollment.status === 'failed' ? 'Échouée' : enrollment.status}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(enrollment.payment_status)}`}>
                          {enrollment.payment_status === 'pending' ? 'En attente' :
                           enrollment.payment_status === 'partial' ? 'Partiel' :
                           enrollment.payment_status === 'paid' ? 'Payé' :
                           enrollment.payment_status === 'overdue' ? 'En retard' : enrollment.payment_status}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Aucun élève inscrit à cette session pour le moment.
              <div className="mt-4">
                <Link href={`/dashboard/programs/${programId}/sessions`}>
                  <Button variant="outline" size="sm">
                    Inscrire un élève
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle>Informations supplémentaires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700 mb-1">ID de la session</p>
              <p className="text-muted-foreground font-mono text-xs">{session.id}</p>
            </div>
            {session.created_at && (
              <div>
                <p className="font-medium text-gray-700 mb-1">Date de création</p>
                <p className="text-muted-foreground">{formatDate(session.created_at)}</p>
              </div>
            )}
            {session.updated_at && (
              <div>
                <p className="font-medium text-gray-700 mb-1">Dernière modification</p>
                <p className="text-muted-foreground">{formatDate(session.updated_at)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

