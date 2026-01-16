'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { cpfService, type CPFEnrollment, type CPFEligibleTraining } from '@/lib/services/cpf.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Euro,
  RefreshCw,
  Plus,
  FileText,
  Users,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function CPFPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // Récupérer les formations éligibles
  const { data: eligibleTrainings = [], isLoading: isLoadingTrainings } = useQuery({
    queryKey: ['cpf-eligible-trainings', user?.organization_id],
    queryFn: async () => {
      try {
        return await cpfService.getEligibleTrainings(user!.organization_id!)
      } catch (error: any) {
        // Si la table n'existe pas encore ou erreur 404, retourner un tableau vide
        if (
          error?.code === 'PGRST116' ||
          error?.code === '42P01' ||
          error?.code === 'PGRST301' ||
          error?.status === 404 ||
          error?.code === '404' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('relationship') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache')
        ) {
          console.warn('Error fetching CPF eligible trainings:', error?.message)
          return []
        }
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Récupérer les inscriptions
  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['cpf-enrollments', user?.organization_id],
    queryFn: async () => {
      try {
        return await cpfService.getEnrollments(user!.organization_id!)
      } catch (error: any) {
        // Si la table n'existe pas encore ou erreur 404, retourner un tableau vide
        if (
          error?.code === 'PGRST116' ||
          error?.code === '42P01' ||
          error?.code === 'PGRST301' ||
          error?.status === 404 ||
          error?.code === '404' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('relationship') ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('schema cache')
        ) {
          console.warn('Error fetching CPF enrollments:', error?.message)
          return []
        }
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Statistiques
  const stats = {
    totalTrainings: eligibleTrainings.length,
    totalEnrollments: enrollments.length,
    activeEnrollments: enrollments.filter((e) => e.status === 'in_progress').length,
    completedEnrollments: enrollments.filter((e) => e.status === 'completed').length,
    totalFunding: enrollments.reduce((sum, e) => sum + e.cpf_funding_amount, 0),
  }

  if (isLoadingTrainings || isLoadingEnrollments) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-brand-blue" />
          Compte Personnel de Formation (CPF)
        </h1>
        <p className="text-muted-foreground">
          Gérez les formations éligibles CPF et les inscriptions de vos stagiaires
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Formations éligibles</p>
                <p className="text-2xl font-bold">{stats.totalTrainings}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inscriptions</p>
                <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold">{stats.activeEnrollments}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Financement CPF</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalFunding)}</p>
              </div>
              <Euro className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="trainings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trainings">Formations éligibles</TabsTrigger>
          <TabsTrigger value="enrollments">Inscriptions</TabsTrigger>
          <TabsTrigger value="learners">Droits des stagiaires</TabsTrigger>
        </TabsList>

        {/* Formations éligibles */}
        <TabsContent value="trainings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Formations éligibles CPF</CardTitle>
                  <CardDescription>
                    Liste des formations éligibles au financement CPF
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/cpf/trainings/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une formation
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {eligibleTrainings.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune formation éligible CPF configurée
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/cpf/trainings/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer la première formation
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {eligibleTrainings.map((training) => (
                    <Card key={training.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{training.cpf_training_title}</h3>
                              <Badge className="bg-green-100 text-green-800">
                                Éligible CPF
                              </Badge>
                              {training.cpf_training_code && (
                                <Badge variant="outline">
                                  {training.cpf_training_code}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {training.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-semibold">
                                {formatCurrency(training.price, training.currency)}
                              </span>
                              {training.duration_hours && (
                                <span className="text-muted-foreground">
                                  {training.duration_hours}h
                                </span>
                              )}
                              {training.certification_level && (
                                <span className="text-muted-foreground">
                                  Niveau {training.certification_level}
                                </span>
                              )}
                              <span className="text-muted-foreground">
                                {training.current_learners} / {training.max_learners || '∞'} stagiaires
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" asChild>
                            <Link href={`/dashboard/cpf/trainings/${training.id}`}>
                              Voir les détails
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inscriptions */}
        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inscriptions CPF</CardTitle>
                  <CardDescription>
                    Liste des inscriptions aux formations CPF
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/cpf/enrollments/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle inscription
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune inscription CPF enregistrée
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/cpf/enrollments/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une inscription
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrollments.map((enrollment) => (
                    <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">
                                Inscription #{enrollment.id.slice(0, 8)}
                              </h3>
                              <Badge className={STATUS_COLORS[enrollment.status]}>
                                {enrollment.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Date d'inscription</p>
                                <p className="font-medium">
                                  {new Date(enrollment.enrollment_date).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Financement CPF</p>
                                <p className="font-medium">
                                  {formatCurrency(enrollment.cpf_funding_amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Participation</p>
                                <p className="font-medium">
                                  {formatCurrency(enrollment.learner_contribution)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total</p>
                                <p className="font-medium">
                                  {formatCurrency(enrollment.total_amount)}
                                </p>
                              </div>
                            </div>
                            {enrollment.cpf_attestation_number && (
                              <div className="mt-3">
                                <p className="text-sm text-muted-foreground">
                                  Attestation: {enrollment.cpf_attestation_number}
                                </p>
                              </div>
                            )}
                          </div>
                          <Button variant="outline" asChild>
                            <Link href={`/dashboard/cpf/enrollments/${enrollment.id}`}>
                              <FileText className="h-4 w-4 mr-2" />
                              Voir les détails
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Droits des stagiaires */}
        <TabsContent value="learners">
          <Card>
            <CardHeader>
              <CardTitle>Droits CPF des stagiaires</CardTitle>
              <CardDescription>
                Consultez et synchronisez les droits CPF de vos stagiaires
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Fonctionnalité en cours de développement
                </p>
                <p className="text-sm text-muted-foreground">
                  La synchronisation avec Mon Compte Formation sera disponible prochainement
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions rapides */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/cpf/configuration">
            <GraduationCap className="h-4 w-4 mr-2" />
            Configuration CPF
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/cpf/catalog-sync">
            <RefreshCw className="h-4 w-4 mr-2" />
            Synchronisation Catalogue
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/cpf/attestations">
            <FileText className="h-4 w-4 mr-2" />
            Attestations
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/cpf/reports">
            <FileText className="h-4 w-4 mr-2" />
            Rapports
          </Link>
        </Button>
      </div>
    </div>
  )
}
