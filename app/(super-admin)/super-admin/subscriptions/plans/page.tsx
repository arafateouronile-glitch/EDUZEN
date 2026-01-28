'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion } from '@/components/ui/motion'
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  DollarSign,
  Users,
  HardDrive,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import type { SubscriptionPlan } from '@/types/super-admin.types'

export default function SubscriptionPlansPage() {
  const { canManageSubscriptions, isSuperAdmin } = usePlatformAdmin()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Vérifier les permissions
  if (!canManageSubscriptions && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès restreint</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour gérer les plans d'abonnement.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Fetch subscription plans
  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data || []) as SubscriptionPlan[]
    },
    staleTime: 1000 * 60 * 5,
  })

  // Toggle plan active status
  const togglePlanMutation = useMutation({
    mutationFn: async ({ planId, isActive }: { planId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !isActive })
        .eq('id', planId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted animate-pulse rounded w-24 mb-2" />
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight"
          >
            Plans d'Abonnement
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Gérez les plans d'abonnement disponibles pour les organisations
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2"
        >
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau Plan
          </Button>
        </motion.div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              'relative overflow-hidden transition-all hover:shadow-lg',
              plan.is_active ? 'border-primary/20' : 'opacity-60'
            )}
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4">
              <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                {plan.is_active ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Actif
                  </>
                ) : (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    Inactif
                  </>
                )}
              </Badge>
            </div>

            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-1">{plan.name}</CardTitle>
                  <CardDescription className="text-xs font-mono text-muted-foreground">
                    {plan.code}
                  </CardDescription>
                </div>
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {plan.price_monthly !== null
                      ? formatCurrency(plan.price_monthly)
                      : 'Sur devis'}
                  </span>
                  {plan.price_monthly !== null && (
                    <span className="text-sm text-muted-foreground">/mois</span>
                  )}
                </div>
                {plan.price_yearly !== null && plan.price_monthly !== null && (
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(plan.price_yearly)}/an
                    <span className="text-green-600 ml-1">
                      (Économisez{' '}
                      {Math.round(
                        ((plan.price_monthly * 12 - plan.price_yearly) /
                          (plan.price_monthly * 12)) *
                          100
                      )}
                      %)
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}

              {/* Features */}
              {plan.features && plan.features.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Fonctionnalités :</h4>
                  <ul className="space-y-1.5 text-sm">
                    {plan.features.slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 5 && (
                      <li className="text-xs text-muted-foreground pl-6">
                        +{plan.features.length - 5} autres fonctionnalités
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Limits */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs font-medium">
                    {plan.max_users !== null ? plan.max_users : '∞'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Utilisateurs</div>
                </div>
                <div className="text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs font-medium">
                    {plan.max_students !== null ? plan.max_students : '∞'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Stagiaires</div>
                </div>
                <div className="text-center">
                  <HardDrive className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs font-medium">
                    {plan.max_storage_gb !== null ? `${plan.max_storage_gb} GB` : '∞'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Stockage</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    // NOTE: Fonctionnalité prévue - Ouvrir un dialog d'édition pour modifier le plan
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
                <Button
                  variant={plan.is_active ? 'secondary' : 'default'}
                  size="sm"
                  onClick={() => {
                    togglePlanMutation.mutate({
                      planId: plan.id,
                      isActive: plan.is_active,
                    })
                  }}
                  disabled={togglePlanMutation.isPending}
                >
                  {plan.is_active ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Activer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {plans && plans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun plan d'abonnement</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Créez votre premier plan d'abonnement pour commencer à proposer des offres à vos
              clients.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Créer un plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
