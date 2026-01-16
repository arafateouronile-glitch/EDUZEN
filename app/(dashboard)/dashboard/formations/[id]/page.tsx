'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { formationService } from '@/lib/services/formation.service'
import { sessionService } from '@/lib/services/session.service'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, Calendar, Clock, DollarSign, Users, BookOpen, GraduationCap, TrendingUp, CheckCircle, XCircle, Plus, MapPin } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { FormationWithRelations, SessionWithRelations, EnrollmentWithRelations } from '@/lib/types/query-types'

type Session = TableRow<'sessions'>
type Enrollment = TableRow<'enrollments'>

export default function FormationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const formationId = params.id as string
  const { user } = useAuth()
  const supabase = createClient()

  const { data: formation, isLoading } = useQuery({
    queryKey: ['formation', formationId],
    queryFn: () => formationService.getFormationById(formationId),
    enabled: !!formationId,
  })

  // Récupérer les sessions de la formation
  const { data: sessions } = useQuery({
    queryKey: ['formation-sessions', formationId, user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return sessionService.getAllSessions(user.organization_id, { formationId })
    },
    enabled: !!formationId && !!user?.organization_id,
  })

  // Statistiques détaillées de la formation
  const { data: formationStats } = useQuery({
    queryKey: ['formation-detail-stats', formationId, user?.organization_id],
    queryFn: async () => {
      if (!formationId || !user?.organization_id) return null

      // Récupérer toutes les sessions de la formation
      const { data: allSessions } = await supabase
        .from('sessions')
        .select('id, status, start_date, end_date')
        .eq('formation_id', formationId)

      const sessionsArray = (allSessions as Session[]) || []
      const sessionIds = sessionsArray.map((s) => s.id).filter((id): id is string => !!id)

      // Compter les inscriptions
      let totalEnrollments = 0
      let activeEnrollments = 0
      let completedEnrollments = 0
      if (sessionIds && sessionIds.length > 0) {
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('status')
          .in('session_id', sessionIds)
        if (enrollmentsError) throw enrollmentsError
        
        const enrollmentsArray = (enrollments as Enrollment[]) || []
        totalEnrollments = enrollmentsArray.length
        activeEnrollments = enrollmentsArray.filter((e: any) => e.status && ['confirmed', 'active'].includes(e.status)).length
        completedEnrollments = enrollmentsArray.filter((e: any) => e.status === 'completed').length
      }

      // Compter les sessions par statut
      const totalSessions = sessionsArray.length
      const plannedSessions = sessionsArray.filter((s) => s.status === 'planned').length
      const ongoingSessions = sessionsArray.filter((s) => s.status === 'ongoing').length
      const completedSessions = sessionsArray.filter((s) => s.status === 'completed').length
      const cancelledSessions = sessionsArray.filter((s) => s.status === 'cancelled').length

      // Calculer le revenu estimé
      const formationData = formation as any as (FormationWithRelations & { price?: number; cpf_eligible?: boolean; version?: string })
      const totalRevenue = formationData?.price ? Number(formationData.price) * totalEnrollments : 0

      // Répartition des sessions par statut
      const sessionStatusData = [
        { name: 'Planifiées', value: plannedSessions, color: '#3B82F6' },
        { name: 'En cours', value: ongoingSessions, color: '#335ACF' },
        { name: 'Terminées', value: completedSessions, color: '#6B7280' },
        { name: 'Annulées', value: cancelledSessions, color: '#EF4444' },
      ].filter(item => item.value > 0)

      // Répartition des inscriptions par statut
      if (sessionIds && sessionIds.length > 0) {
        const { data: enrollments, error: enrollmentsError2 } = await supabase
          .from('enrollments')
          .select('status')
          .in('session_id', sessionIds)
        if (enrollmentsError2) throw enrollmentsError2
        
        const enrollmentsArray = (enrollments as Enrollment[]) || []
        const confirmedEnrollments = enrollmentsArray.filter((e) => e.status === 'confirmed').length
        const activeEnrollmentsCount = enrollmentsArray.filter((e) => e.status === 'active').length
        const completedEnrollmentsCount = enrollmentsArray.filter((e) => e.status === 'completed').length
        const cancelledEnrollments = enrollmentsArray.filter((e) => e.status === 'cancelled').length

        const enrollmentStatusData = [
          { name: 'Confirmées', value: confirmedEnrollments, color: '#3B82F6' },
          { name: 'Actives', value: activeEnrollmentsCount, color: '#335ACF' },
          { name: 'Complétées', value: completedEnrollmentsCount, color: '#6B7280' },
          { name: 'Annulées', value: cancelledEnrollments, color: '#EF4444' },
        ].filter(item => item.value > 0)

        return {
          totalSessions,
          plannedSessions,
          ongoingSessions,
          completedSessions,
          cancelledSessions,
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          totalRevenue,
          sessionStatusData,
          enrollmentStatusData,
        }
      }

      return {
        totalSessions,
        plannedSessions,
        ongoingSessions,
        completedSessions,
        cancelledSessions,
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        totalRevenue,
        sessionStatusData,
        enrollmentStatusData: [],
      }
    },
    enabled: !!formationId && !!user?.organization_id && !!formation,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!formation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Formation non trouvée</div>
          <Link href="/dashboard/formations">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const formationData = formation as FormationWithRelations & { price?: number; currency?: string }
  const program = formationData?.programs
  const sessionsList = (sessions as SessionWithRelations[]) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/formations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{formationData.name}</h1>
            {formationData.subtitle && (
              <p className="mt-1 text-lg text-gray-600">{formationData.subtitle}</p>
            )}
            <p className="mt-2 text-sm text-gray-600">
              Code: {formationData.code}
              {program && (
                <> • Programme: <Link href={`/dashboard/programs/${program.id}`} className="text-primary hover:underline">
                  {program.name}
                </Link></>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link href={`/dashboard/formations/${formationId}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
          <Link href={`/dashboard/formations/${formationId}/sessions`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle session
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistiques détaillées */}
      {formationStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sessions
              </CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formationStats.totalSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formationStats.ongoingSessions} en cours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inscriptions
              </CardTitle>
              <div className="p-2 bg-cyan-50 rounded-lg">
                <Users className="h-5 w-5 text-cyan-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formationStats.totalEnrollments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formationStats.activeEnrollments} active{formationStats.activeEnrollments > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Terminées
              </CardTitle>
              <div className="p-2 bg-brand-blue-ghost rounded-lg">
                <CheckCircle className="h-5 w-5 text-brand-blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-blue">{formationStats.completedSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">Sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Complétées
              </CardTitle>
              <div className="p-2 bg-teal-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">{formationStats.completedEnrollments}</div>
              <p className="text-xs text-muted-foreground mt-1">Inscriptions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Planifiées
              </CardTitle>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formationStats.plannedSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">Sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenu estimé
              </CardTitle>
              <div className="p-2 bg-brand-cyan-ghost rounded-lg">
                <DollarSign className="h-5 w-5 text-brand-cyan" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-cyan">
                {formatCurrency(formationStats.totalRevenue, formationData?.currency || 'XOF')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graphiques */}
      {formationStats && (formationStats.sessionStatusData.length > 0 || formationStats.enrollmentStatusData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Répartition des sessions */}
          {formationStats.sessionStatusData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Répartition des sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={formationStats.sessionStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {formationStats.sessionStatusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Répartition des inscriptions */}
          {formationStats.enrollmentStatusData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Répartition des inscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={formationStats.enrollmentStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {formationStats.enrollmentStatusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formationData.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{formationData.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {formationData.category && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Catégorie</p>
                    <p className="font-medium">{formationData.category}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Statut</p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      formationData.is_active
                        ? 'bg-brand-blue-ghost text-brand-blue'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {formationData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {(formationData.duration_hours || formationData.duration_days) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Durée</p>
                  <div className="flex items-center space-x-4">
                    {formationData.duration_hours && (
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        <span>{formationData.duration_hours} heures</span>
                      </div>
                    )}
                    {formationData.duration_days && (
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        <span>{formationData.duration_days} jours</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formationData.price && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Prix</p>
                  <p className="text-lg font-semibold flex items-center">
                    <DollarSign className="mr-1 h-5 w-5" />
                    {formatCurrency(Number(formationData.price), formationData.currency || 'XOF')}
                  </p>
                </div>
              )}

              {formationData.capacity_max && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Capacité maximale</p>
                  <p className="font-medium flex items-center">
                    <Users className="mr-1 h-4 w-4" />
                    {formationData.capacity_max} apprenants
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Objectifs pédagogiques */}
          {formationData.pedagogical_objectives && (
            <Card>
              <CardHeader>
                <CardTitle>Objectifs pédagogiques</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{formationData.pedagogical_objectives}</p>
              </CardContent>
            </Card>
          )}

          {/* Profil des apprenants */}
          {formationData.learner_profile && (
            <Card>
              <CardHeader>
                <CardTitle>Profil des apprenants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{formationData.learner_profile}</p>
              </CardContent>
            </Card>
          )}

          {/* Contenu de la formation */}
          {formationData.training_content && (
            <Card>
              <CardHeader>
                <CardTitle>Contenu de la formation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{formationData.training_content}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Programme associé */}
          {program && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Programme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/dashboard/programs/${program.id}`}>
                  <p className="font-semibold text-primary hover:underline">{program.name}</p>
                </Link>
                {program.code && (
                  <p className="text-sm text-muted-foreground mt-1">Code: {program.code}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/dashboard/formations/${formationId}/sessions`} className="block">
                <Button variant="outline" className="w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  Sessions
                </Button>
              </Link>
              <Link href={`/dashboard/formations/${formationId}/edit`} className="block">
                <Button variant="outline" className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Informations supplémentaires */}
          <Card>
            <CardHeader>
              <CardTitle>Informations supplémentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(formationData as any).cpf_eligible && (
                <div>
                  <p className="text-muted-foreground">CPF éligible</p>
                  <p className="font-medium text-brand-blue">Oui</p>
                  {formationData.cpf_code && (
                    <p className="text-xs text-muted-foreground mt-1">Code CPF: {formationData.cpf_code}</p>
                  )}
                </div>
              )}

              {formationData.modalities && (
                <div>
                  <p className="text-muted-foreground">Modalités</p>
                  <p className="font-medium">{formationData.modalities}</p>
                </div>
              )}

              {(formationData as any).version && (
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">{(formationData as any).version}</p>
                  {formationData.version_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Date: {formatDate(formationData.version_date)}
                    </p>
                  )}
                </div>
              )}

              {formationData.created_at && (
                <div>
                  <p className="text-muted-foreground">Date de création</p>
                  <p className="font-medium">{formatDate(formationData.created_at)}</p>
                </div>
              )}

              {formationData.updated_at && (
                <div>
                  <p className="text-muted-foreground">Dernière modification</p>
                  <p className="font-medium">{formatDate(formationData.updated_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Liste des sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Sessions ({sessionsList.length})
            </CardTitle>
            <Link href={`/dashboard/formations/${formationId}/sessions`}>
              <Button variant="outline" size="sm">
                Voir toutes les sessions
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsList.length > 0 ? (
            <div className="space-y-3">
              {sessionsList.slice(0, 5).map((session: any) => (
                <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
                  <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{session.name}</h3>
                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {formatDate(session.start_date)}
                            {session.end_date && ` - ${formatDate(session.end_date)}`}
                          </div>
                          {session.location && (
                            <div className="flex items-center">
                              <MapPin className="mr-1 h-3 w-3" />
                              {session.location}
                            </div>
                          )}
                          {session.start_time && session.end_time && (
                            <div className="flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {session.start_time} - {session.end_time}
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          session.status === 'planned'
                            ? 'bg-blue-100 text-blue-800'
                            : session.status === 'ongoing'
                            ? 'bg-brand-blue-ghost text-brand-blue'
                            : session.status === 'completed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {session.status === 'planned'
                          ? 'Planifiée'
                          : session.status === 'ongoing'
                          ? 'En cours'
                          : session.status === 'completed'
                          ? 'Terminée'
                          : 'Annulée'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              {sessionsList.length > 5 && (
                <div className="text-center pt-2">
                  <Link href={`/dashboard/formations/${formationId}/sessions`}>
                    <Button variant="outline" size="sm">
                      Voir toutes les {sessionsList.length} sessions
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Aucune session pour cette formation</p>
              <Link href={`/dashboard/formations/${formationId}/sessions`}>
                <Button variant="outline" className="mt-4">
                  Créer une session
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

